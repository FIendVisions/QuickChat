'use client';

import { useState } from 'react';
import { X } from 'lucide-react';

interface CreateServerModalProps {
  onClose: () => void;
  onCreate: (data: { name: string; icon?: string }) => Promise<void>;
}

export function CreateServerModal({ onClose, onCreate }: CreateServerModalProps) {
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const n = name.trim();
    if (n.length < 2) {
      setError('名称至少 2 个字符');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await onCreate({ name: n, icon: icon.trim() || undefined });
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '创建失败');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="mx-4 w-full max-w-md rounded-lg bg-bg-secondary shadow-xl">
        <div className="flex items-center justify-between border-b border-border-color p-4">
          <h2 className="text-lg font-semibold text-text-normal">创建服务器</h2>
          <button type="button" onClick={onClose} className="text-text-muted hover:text-text-normal" disabled={busy}>
            <X size={20} />
          </button>
        </div>
        <form onSubmit={submit} className="space-y-4 p-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-text-normal">服务器名称</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-md border border-border-color bg-bg-tertiary px-3 py-2 text-text-normal placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="好友的开黑基地"
              maxLength={50}
              autoFocus
              disabled={busy}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-text-normal">图标（可选 emoji）</label>
            <input
              value={icon}
              onChange={(e) => setIcon(e.target.value)}
              className="w-full rounded-md border border-border-color bg-bg-tertiary px-3 py-2 text-text-normal placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="🎮"
              maxLength={8}
              disabled={busy}
            />
          </div>
          {error && <p className="text-sm text-danger">{error}</p>}
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              className="flex-1 rounded-md bg-bg-tertiary py-2 text-text-normal hover:bg-bg-hover disabled:opacity-50"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={busy}
              className="flex-1 rounded-md bg-primary py-2 font-medium text-white hover:bg-primary/90 disabled:opacity-50"
            >
              {busy ? '创建中…' : '创建'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
