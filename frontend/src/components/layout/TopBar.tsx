// frontend/src/components/layout/TopBar.tsx

import { Settings as SettingsIcon } from 'lucide-react';

interface TopBarProps {
  username: string;
  onLogout: () => void;
  onOpenDBManager?: () => void;
}

export function TopBar({ username, onLogout, onOpenDBManager }: TopBarProps) {
  return (
    <div className="h-12 bg-bg-tertiary border-b border-border-color flex items-center justify-between px-4">
      <h1 className="text-xl font-bold text-text-normal">QuickChat</h1>
      <div className="flex items-center gap-3">
        <span className="text-sm text-text-muted">欢迎, {username}</span>
        {onOpenDBManager && (
          <button
            onClick={onOpenDBManager}
            className="rounded px-3 py-1.5 text-sm bg-bg-secondary text-text-muted hover:bg-bg-hover hover:text-text-normal transition-colors flex items-center gap-1"
            title="数据库管理"
          >
            <SettingsIcon size={14} />
            数据
          </button>
        )}
        <button
          onClick={onLogout}
          className="rounded px-3 py-1.5 text-sm bg-bg-secondary text-text-muted hover:bg-bg-hover hover:text-text-normal transition-colors"
        >
          登出
        </button>
      </div>
    </div>
  );
}
