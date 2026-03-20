'use client';

import { useState } from 'react';
import { X } from 'lucide-react';

interface JoinServerModalProps {
  onClose: () => void;
  onJoin: (inviteCode: string) => Promise<void>;
}

export function JoinServerModal({ onClose, onJoin }: JoinServerModalProps) {
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const c = code.trim().toUpperCase();
    if (c.length < 4) {
      setError('请输入有效邀请码');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await onJoin(c);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '加入失败');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="mx-4 w-full max-w-md rounded-lg bg-bg-secondary shadow-xl">
        <div className="flex items-center justify-between border-b border-border-color p-4">
          <h2 className="text-lg font-semibold text-text-normal">加入服务器</h2>
          <button type="button" onClick={onClose} className="text-text-muted hover:text-text-normal" disabled={busy}>
            <X size={20} />
          </button>
        </div>
        <form onSubmit={submit} className="space-y-4 p-4">
          <p className="text-sm text-text-muted">向好友索取邀请码，输入后即可进入对方服务器。</p>
          <div>
            <label className="mb-1 block text-sm font-medium text-text-normal">邀请码</label>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              className="w-full rounded-md border border-border-color bg-bg-tertiary px-3 py-2 font-mono text-text-normal placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="XXXXXXXX"
              maxLength={16}
              autoFocus
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
              {busy ? '加入中…' : '加入'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
