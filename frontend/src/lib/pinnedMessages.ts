const STORAGE_KEY = 'quickchat_pins_v1';

function readAll(): Record<string, string[]> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const o = raw ? JSON.parse(raw) : {};
    return typeof o === 'object' && o !== null ? o : {};
  } catch {
    return {};
  }
}

function writeAll(data: Record<string, string[]>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    /* ignore */
  }
}

export function loadChannelPins(channelId: string): string[] {
  const all = readAll();
  const list = all[channelId];
  return Array.isArray(list) ? list : [];
}

/** 置顶或取消置顶，返回最新 id 列表（新置顶在前，最多 20 条） */
export function toggleChannelPin(channelId: string, messageId: string): string[] {
  const all = readAll();
  let pins = [...(all[channelId] || [])];
  if (pins.includes(messageId)) {
    pins = pins.filter((id) => id !== messageId);
  } else {
    pins = [messageId, ...pins.filter((id) => id !== messageId)].slice(0, 20);
  }
  all[channelId] = pins;
  writeAll(all);
  return pins;
}
