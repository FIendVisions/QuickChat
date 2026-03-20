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

function GuildSlot({
  label,
  selected,
  onClick,
  children,
  accentClass,
  variant = 'blurple',
}: {
  label: string;
  selected?: boolean;
  onClick: () => void;
  children: React.ReactNode;
  accentClass?: string;
  variant?: 'blurple' | 'green';
}) {
  const idle =
    variant === 'green'
      ? 'rounded-[48px] bg-dc-server-tile text-[#23a559] hover:rounded-[16px] hover:bg-[#23a559] hover:text-white'
      : 'rounded-[48px] bg-dc-server-tile text-dc-channel-text-active hover:rounded-[16px] hover:bg-[#5865f2] hover:text-white';
  return (
    <div className="group relative mb-2 flex w-[72px] shrink-0 justify-center">
      <div className="pointer-events-none absolute left-0 top-1/2 z-10 flex h-[48px] w-4 -translate-y-1/2 items-center">
        <span
          className={`dc-guild-pill ${
            selected ? 'h-10 opacity-100' : 'h-2 opacity-0 group-hover:h-5 group-hover:opacity-100'
          }`}
        />
      </div>
      <button
        type="button"
        title={label}
        onClick={onClick}
        className={`relative flex h-12 w-12 items-center justify-center text-lg transition-all duration-200 ease-[cubic-bezier(0.24,0.41,0.28,0.99)] ${
          selected ? `rounded-[16px] ${accentClass ?? 'bg-[#5865f2] text-white'}` : idle
        } `}
      >
        {children}
      </button>
    </div>
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
    <nav
      className="flex h-full w-[72px] shrink-0 flex-col items-center overflow-y-auto overflow-x-hidden bg-dc-guilds py-2"
      aria-label="服务器列表"
    >
      <GuildSlot
        label="私信与发现"
        selected={homeSelected}
        onClick={onSelectHome}
        accentClass="bg-[#5865f2] text-white"
      >
        <Compass size={22} strokeWidth={1.75} className={homeSelected ? 'text-white' : ''} />
      </GuildSlot>

      <div className="mx-auto mb-2 h-[2px] w-8 shrink-0 rounded-full bg-dc-separator" role="separator" />

      {servers.map((s) => (
        <GuildSlot
          key={s.id}
          label={s.name}
          selected={!homeSelected && selectedServerId === s.id}
          onClick={() => onSelectServer(s)}
          accentClass="bg-[#5865f2] text-white"
        >
          <span className="text-[15px] font-semibold leading-none">
            {s.icon?.trim() || s.name.charAt(0).toUpperCase()}
          </span>
        </GuildSlot>
      ))}

      <GuildSlot label="添加服务器" onClick={onAddServer} variant="green">
        <Plus size={22} strokeWidth={2.5} />
      </GuildSlot>

      <GuildSlot label="加入服务器" onClick={onJoinServer} variant="green">
        <LogIn size={20} strokeWidth={2} />
      </GuildSlot>
    </nav>
  );
}
