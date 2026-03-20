const LEGACY_KEY = 'quickchat_pins_v1';
const PERSONAL_KEY = 'quickchat_personal_pins_v1';

function storageKey(userId: string, channelId: string): string {
  return `${userId}::${channelId}`;
}

function readPersonalAll(): Record<string, string[]> {
  try {
    const raw = localStorage.getItem(PERSONAL_KEY);
    const o = raw ? JSON.parse(raw) : {};
    return typeof o === 'object' && o !== null ? o : {};
  } catch {
    return {};
  }
}

function writePersonalAll(data: Record<string, string[]>) {
  try {
    localStorage.setItem(PERSONAL_KEY, JSON.stringify(data));
  } catch {
    /* ignore */
  }
}

function readLegacyAll(): Record<string, string[]> {
  try {
    const raw = localStorage.getItem(LEGACY_KEY);
    const o = raw ? JSON.parse(raw) : {};
    return typeof o === 'object' && o !== null ? o : {};
  } catch {
    return {};
  }
}

function writeLegacyAll(data: Record<string, string[]>) {
  try {
    localStorage.setItem(LEGACY_KEY, JSON.stringify(data));
  } catch {
    /* ignore */
  }
}

/** 从旧版「每频道一份」迁移到「每用户每频道」个人置顶 */
function migrateLegacyIfNeeded(userId: string, channelId: string): void {
  const personal = readPersonalAll();
  const key = storageKey(userId, channelId);
  if (personal[key]) return;

  const legacy = readLegacyAll();
  const oldList = legacy[channelId];
  if (!Array.isArray(oldList) || oldList.length === 0) return;

  personal[key] = oldList;
  writePersonalAll(personal);

  delete legacy[channelId];
  if (Object.keys(legacy).length === 0) {
    localStorage.removeItem(LEGACY_KEY);
  } else {
    writeLegacyAll(legacy);
  }
}

export function loadPersonalPins(userId: string, channelId: string): string[] {
  migrateLegacyIfNeeded(userId, channelId);
  const all = readPersonalAll();
  const list = all[storageKey(userId, channelId)];
  return Array.isArray(list) ? list : [];
}

/** 个人置顶切换，返回最新 id 列表（新置顶在前，最多 20 条） */
export function togglePersonalPin(userId: string, channelId: string, messageId: string): string[] {
  migrateLegacyIfNeeded(userId, channelId);
  const all = readPersonalAll();
  const key = storageKey(userId, channelId);
  let pins = [...(all[key] || [])];
  if (pins.includes(messageId)) {
    pins = pins.filter((id) => id !== messageId);
  } else {
    pins = [messageId, ...pins.filter((id) => id !== messageId)].slice(0, 20);
  }
  all[key] = pins;
  writePersonalAll(all);
  return pins;
}
