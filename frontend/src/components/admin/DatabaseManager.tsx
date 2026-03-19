// frontend/src/components/admin/DatabaseManager.tsx

'use client';

import { useState } from 'react';
import { RefreshCw, Download, Upload, Info, Check, X } from 'lucide-react';
import {
  runDiagnostics,
  exportChannelData,
  importChannelData,
  generateChannelShareCode,
} from '@/lib/diagnostics';

export function DatabaseManager() {
  const [diagnostics, setDiagnostics] = useState<any>(null);
  const [shareCode, setShareCode] = useState('');
  const [importCode, setImportCode] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [loading, setLoading] = useState(false);

  const handleDiagnostics = async () => {
    setLoading(true);
    try {
      const result = await runDiagnostics();
      setDiagnostics(result);
      console.log('Diagnostics result:', result);
    } catch (err: any) {
      console.error('Diagnostics failed:', err);
      setMessage({ type: 'error', text: err.message || '诊断失败' });
    } finally {
      setLoading(false);
    }
  };

  const handleExportChannel = async (channelId: string) => {
    try {
      const code = await generateChannelShareCode(channelId);
      setShareCode(code);
      setMessage({ type: 'success', text: '频道分享码已生成！' });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || '生成失败' });
    }
  };

  const handleImportChannel = async () => {
    if (!importCode.trim()) {
      setMessage({ type: 'error', text: '请输入分享码' });
      return;
    }

    try {
      const success = await importChannelData(importCode);
      if (success) {
        setMessage({ type: 'success', text: '频道导入成功！页面将刷新...' });
      } else {
        setMessage({ type: 'error', text: '导入失败，请检查分享码是否正确' });
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || '导入失败' });
    }
  };

  return (
    <div className="p-4 space-y-4">
      {/* 诊断按钮 */}
      <button
        onClick={handleDiagnostics}
        disabled={loading}
        className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50"
      >
        <RefreshCw size={16} />
        {loading ? '诊断中...' : '运行诊断'}
      </button>

      {/* 诊断结果 */}
      {diagnostics && (
        <div className="space-y-3">
          <div className="p-3 bg-bg-tertiary rounded-md">
            <h3 className="font-semibold text-text-normal mb-2">诊断结果</h3>
            <div className="space-y-1 text-sm text-text-muted">
              <p>Origin: <code className="text-primary">{diagnostics.origin}</code></p>
              <p>IndexedDB 频道数: <strong>{diagnostics.indexedDBChannels.length}</strong></p>
              <p>LocalStorage 频道数: <strong>{diagnostics.localStorageChannels.length}</strong></p>
              <p>邀请码映射数: <strong>{diagnostics.inviteMappings.length}</strong></p>
            </div>

            {diagnostics.issue && (
              <div className={`mt-3 p-2 rounded ${
                diagnostics.issue.includes('隔离') ? 'bg-warning/20 text-warning' : 'bg-danger/10 text-danger'
              }`}>
                <p className="font-medium mb-1">⚠️ {diagnostics.issue}</p>
                <p className="text-sm">{diagnostics.solution}</p>
              </div>
            )}
          </div>

          {/* 频道列表 */}
          {diagnostics.indexedDBChannels.length > 0 && (
            <div className="p-3 bg-bg-tertiary rounded-md">
              <h3 className="font-semibold text-text-normal mb-2">当前频道的分享码</h3>
              <div className="space-y-2">
                {diagnostics.indexedDBChannels.map((ch: any) => (
                  <div key={ch.id} className="p-2 bg-bg-secondary rounded flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-text-normal">{ch.name}</p>
                      <p className="text-xs text-text-muted font-mono truncate">{ch.id}</p>
                      {ch.inviteCode && (
                        <p className="text-xs text-primary">邀请码: {ch.inviteCode}</p>
                      )}
                    </div>
                    {ch.id !== 'public-official' && (
                      <button
                        onClick={() => handleExportChannel(ch.id)}
                        className="px-3 py-1 text-xs bg-primary text-white rounded hover:bg-primary/90 transition-colors"
                      >
                        生成分享码
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 导入频道 */}
      <div className="p-3 bg-bg-tertiary rounded-md">
        <h3 className="font-semibold text-text-normal mb-2">导入频道</h3>
        <p className="text-xs text-text-muted mb-2">
          从其他用户获取的分享码导入频道
        </p>
        <textarea
          value={importCode}
          onChange={(e) => setImportCode(e.target.value)}
          placeholder="粘贴频道分享码..."
          className="w-full px-3 py-2 bg-bg-secondary border border-border-color rounded-md text-text-normal placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-primary text-sm font-mono"
          rows={3}
        />
        <button
          onClick={handleImportChannel}
          className="mt-2 flex items-center gap-2 px-4 py-2 bg-success text-white rounded-md hover:bg-success/90 transition-colors"
        >
          <Upload size={16} />
          导入频道
        </button>
      </div>

      {/* 分享码显示 */}
      {shareCode && (
        <div className="p-3 bg-bg-tertiary rounded-md">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-text-normal">频道分享码</h3>
            <button
              onClick={() => {
                navigator.clipboard.writeText(shareCode);
                setMessage({ type: 'success', text: '已复制到剪贴板！' });
              }}
              className="text-xs text-primary hover:underline"
            >
              复制
            </button>
          </div>
          <textarea
            readOnly
            value={shareCode}
            className="w-full px-3 py-2 bg-bg-secondary border border-border-color rounded-md text-text-muted text-xs font-mono"
            rows={5}
          />
          <p className="mt-2 text-xs text-text-muted">
            将此分享码发送给其他用户，他们可以导入此频道
          </p>
        </div>
      )}

      {/* 消息提示 */}
      {message && (
        <div className={`p-3 rounded-md flex items-center justify-between ${
          message.type === 'success' ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'
        }`}>
          <p className="text-sm">{message.text}</p>
          <button onClick={() => setMessage(null)} className="text-lg">&times;</button>
        </div>
      )}
    </div>
  );
}
