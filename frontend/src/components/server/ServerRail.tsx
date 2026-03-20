'use client';

import { Plus, Compass, LogIn } from 'lucide-react';
import type { ServerSummary } from '@/types/server.types';

interface ServerRailProps {
  servers: ServerSummary[];
  selectedServerId: string | null;
  homeSelected: boolean;
  onSelectHome: () => void;
  onSelectServer: (server: ServerSummary) => void;
  onAddServer: () => void;
  onJoinServer: () => void;
}

function ServerIconButton({
  label,
  selected,
  onClick,
  children,
}: {
  label: string;
  selected?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      onClick={onClick}
      className={`group relative flex h-12 w-12 shrink-0 items-center justify-center rounded-[24px] text-lg transition-all duration-200 hover:rounded-[14px] ${
        selected
          ? 'rounded-[14px] bg-primary text-white'
          : 'bg-[#313338] text-text-normal hover:bg-primary hover:text-white'
      }`}
    >
      {selected && (
        <span className="absolute -left-3 top-1/2 h-2 w-1 -translate-y-1/2 rounded-r bg-white" aria-hidden />
      )}
      {children}
    </button>
  );
}

export function ServerRail({
  servers,
  selectedServerId,
  homeSelected,
  onSelectHome,
  onSelectServer,
  onAddServer,
  onJoinServer,
}: ServerRailProps) {
  return (
    <div className="flex h-full w-[72px] shrink-0 flex-col items-center gap-2 overflow-y-auto bg-[#1e1f22] py-2">
      <ServerIconButton label="消息与发现" selected={homeSelected} onClick={onSelectHome}>
        <Compass size={22} strokeWidth={1.75} />
      </ServerIconButton>

      <div className="mx-auto h-px w-8 bg-white/10" />

      {servers.map((s) => (
        <ServerIconButton
          key={s.id}
          label={s.name}
          selected={!homeSelected && selectedServerId === s.id}
          onClick={() => onSelectServer(s)}
        >
          <span className="text-base leading-none">{s.icon?.trim() || s.name.charAt(0).toUpperCase()}</span>
        </ServerIconButton>
      ))}

      <ServerIconButton label="添加服务器" onClick={onAddServer}>
        <Plus size={22} strokeWidth={2} />
      </ServerIconButton>

      <button
        type="button"
        title="通过邀请码加入"
        onClick={onJoinServer}
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[24px] bg-[#313338] text-success transition-all duration-200 hover:rounded-[14px] hover:bg-success hover:text-white"
      >
        <LogIn size={20} strokeWidth={2} />
      </button>
    </div>
  );
}
