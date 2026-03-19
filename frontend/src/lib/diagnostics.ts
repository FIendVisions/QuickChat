// frontend/src/lib/diagnostics.ts

/**
 * 诊断工具
 * 帮助排查频道共享问题
 */

export interface DiagnosticResult {
  origin: string;
  hasIndexedDB: boolean;
  indexedDBChannels: any[];
  localStorageChannels: any[];
  inviteMappings: any[];
  issue: string;
  solution: string;
}

/**
 * 运行完整诊断
 */
export async function runDiagnostics(): Promise<DiagnosticResult> {
  const result: DiagnosticResult = {
    origin: window.location.origin,
    hasIndexedDB: false,
    indexedDBChannels: [],
    localStorageChannels: [],
    inviteMappings: [],
    issue: '',
    solution: '',
  };

  // 检查 IndexedDB
  try {
    const request = indexedDB.open('QuickChatDB', 1);

    await new Promise((resolve, reject) => {
      request.onsuccess = async () => {
        const db = request.result;
        result.hasIndexedDB = true;

        // 检查频道
        const channelStore = db.transaction(['channels'], 'readonly').objectStore('channels');
        const channels = await new Promise<any[]>((resolve) => {
          const req = channelStore.getAll();
          req.onsuccess = () => resolve(req.result);
        });
        result.indexedDBChannels = channels;

        // 检查邀请码
        const inviteStore = db.transaction(['invite_codes'], 'readonly').objectStore('invite_codes');
        const invites = await new Promise<any[]>((resolve) => {
          const req = inviteStore.getAll();
          req.onsuccess = () => resolve(req.result);
        });
        result.inviteMappings = invites;

        resolve(null);
      };

      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.error('IndexedDB check failed:', err);
  }

  // 检查 localStorage
  try {
    const lsChannels = localStorage.getItem('quickchat_channels');
    if (lsChannels) {
      result.localStorageChannels = JSON.parse(lsChannels);
    }
  } catch (err) {
    console.error('localStorage check failed:', err);
  }

  // 诊断问题
  if (result.indexedDBChannels.length === 0 && result.localStorageChannels.length === 0) {
    result.issue = '当前窗口没有任何频道数据';
    result.solution = '请先在当前窗口创建频道';
  } else if (result.indexedDBChannels.length > 0) {
    result.issue = 'IndexedDB 数据已创建，但其他窗口无法访问';
    result.solution = 'IndexedDB 按浏览器 origin 隔离。所有用户必须使用完全相同的域名和端口（如 http://localhost:3002）';
  } else {
    result.issue = '无法确定问题';
    result.solution = '请尝试刷新页面或创建新频道';
  }

  return result;
}

/**
 * 导出频道数据（用于分享）
 */
export async function exportChannelData(): Promise<string> {
  const result = await runDiagnostics();

  const exportData = {
    channels: result.indexedDBChannels,
    inviteCodes: result.inviteMappings,
    timestamp: new Date().toISOString(),
    origin: result.origin,
  };

  // 转换为 JSON 字符串
  const json = JSON.stringify(exportData, null, 2);

  // Base64 编码以便分享
  return btoa(json);
}

/**
 * 导入频道数据（从分享码导入）
 */
export async function importChannelData(shareCode: string): Promise<boolean> {
  try {
    // 解码 Base64
    const json = atob(shareCode);
    const data = JSON.parse(json);

    // 验证数据格式
    if (!data.channels || !Array.isArray(data.channels)) {
      throw new Error('Invalid data format');
    }

    // 导入到 IndexedDB
    const { getDB } = await import('./db');
    const db = await getDB();

    for (const channel of data.channels) {
      try {
        await db.createChannel(channel);
        console.log('Imported channel:', channel.name);
      } catch (err) {
        console.error('Failed to import channel:', channel.name, err);
      }
    }

    // 刷新页面
    window.location.reload();
    return true;
  } catch (err) {
    console.error('Import failed:', err);
    return false;
  }
}

/**
 * 生成频道分享码
 */
export async function generateChannelShareCode(channelId: string): Promise<string> {
  const data = await exportChannelData();

  // 只包含特定频道
  const allChannels = await (await import('./db')).getDB().then(db => db.getAllChannels());
  const channel = allChannels.find((ch: any) => ch.id === channelId);

  if (!channel) {
    throw new Error('Channel not found');
  }

  const shareData = {
    channels: [channel],
    inviteCodes: (await (await import('./db')).getDB().then(db => {
      const transaction = db.db!.transaction(['invite_codes'], 'readonly');
      return new Promise<any[]>((resolve) => {
        const req = transaction.objectStore('invite_codes').getAll();
        req.onsuccess = () => resolve(req.result);
      });
    })).filter((inv: any) => inv.channelId === channelId),
    timestamp: new Date().toISOString(),
  };

  return btoa(JSON.stringify(shareData, null, 2));
}
