'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';

interface SimpleRenameModalProps {
  title: string;
  initialValue: string;
  placeholder?: string;
  confirmLabel?: string;
  onClose: () => void;
  onConfirm: (value: string) => Promise<void>;
}

export function SimpleRenameModal({
  title,
  initialValue,
  placeholder = '',
  confirmLabel = '保存',
  onClose,
  onConfirm,
}: SimpleRenameModalProps) {
  const [value, setValue] = useState(initialValue);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const v = value.trim();
    if (!v) {
      setError('名称不能为空');
      return;
    }
    if (v.length > 50) {
      setError('最多 50 个字符');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await onConfirm(v);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '操作失败');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50">
      <div className="mx-4 w-full max-w-sm rounded-lg border border-black/30 bg-[#2b2d31] shadow-xl">
        <div className="flex items-center justify-between border-b border-black/20 px-4 py-3">
          <h2 className="text-base font-semibold text-dc-channel-text-active">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="rounded p-1 text-dc-channel-text hover:bg-dc-channel-hover hover:text-dc-channel-text-active"
          >
            <X size={18} />
          </button>
        </div>
        <form onSubmit={submit} className="space-y-3 p-4">
          <input
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={placeholder}
            maxLength={50}
            autoFocus
            disabled={busy}
            className="w-full rounded-md border border-black/30 bg-[#1e1f22] px-3 py-2 text-[15px] text-dc-channel-text-active placeholder:text-dc-channel-text/50 focus:outline-none focus:ring-2 focus:ring-[#5865f2]"
          />
          {error && <p className="text-sm text-[#f23f43]">{error}</p>}
          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              className="rounded px-3 py-1.5 text-sm text-dc-channel-text hover:bg-dc-channel-hover"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={busy}
              className="rounded bg-[#5865f2] px-3 py-1.5 text-sm font-medium text-white hover:bg-[#4752c4] disabled:opacity-50"
            >
              {busy ? '…' : confirmLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
