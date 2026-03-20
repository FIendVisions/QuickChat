// frontend/src/components/layout/StatusBar.tsx

export function StatusBar() {
  return (
    <div className="flex h-7 shrink-0 items-center justify-between border-t border-black/30 bg-dc-guilds px-3 text-[11px] text-dc-channel-text">
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
