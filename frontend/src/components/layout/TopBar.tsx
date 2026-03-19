// frontend/src/components/layout/TopBar.tsx

interface TopBarProps {
  username: string;
  onLogout: () => void;
}

export function TopBar({ username, onLogout }: TopBarProps) {
  return (
    <div className="h-12 bg-bg-tertiary border-b border-border-color flex items-center justify-between px-4">
      <h1 className="text-xl font-bold text-text-normal">QuickChat</h1>
      <div className="flex items-center gap-3">
        <span className="text-sm text-text-muted">欢迎, {username}</span>
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
