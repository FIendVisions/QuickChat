// frontend/src/components/layout/StatusBar.tsx

export function StatusBar() {
  return (
    <div className="h-8 bg-bg-tertiary border-t border-border-color flex items-center justify-between px-4 text-xs text-text-muted">
      <span>QuickChat v1.0.0 - 游戏语音开黑平台</span>
      <div className="flex items-center gap-2">
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-green-500"></span>
          在线
        </span>
      </div>
    </div>
  );
}
