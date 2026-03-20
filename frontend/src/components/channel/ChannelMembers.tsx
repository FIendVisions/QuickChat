// frontend/src/components/channel/ChannelMembers.tsx
// Discord 风格：固定宽度侧栏、在线/离线分组、单行紧凑成员行

'use client';

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Crown, Shield, PanelRightClose, PanelRightOpen, Monitor, Video } from 'lucide-react';
import { useWebSocket } from '@/contexts/WebSocketContext';
import { useLiveWatch } from '@/contexts/LiveWatchContext';
import { getApiOrigin } from '@/lib/serverOrigin';

interface MemberInfo {
  userId: string;
  username: string;
  avatar?: string;
  joinedAt: string;
  isOnline: boolean;
  role?: string;
}

interface ChannelMembersProps {
  channelId: string;
  userId: string;
  isOwner: boolean;
}

interface MemberMedia {
  screen: boolean;
  camera: boolean;
}

function MemberRow({
  member,
  media,
  isSelf,
  onWatchLive,
}: {
  member: MemberInfo;
  media?: MemberMedia;
  isSelf: boolean;
  onWatchLive?: () => void;
}) {
  const live = !!(media && (media.screen || media.camera));
  const canWatch = live && !isSelf;

  return (
    <div
      role={canWatch ? 'button' : undefined}
      tabIndex={canWatch ? 0 : undefined}
      onClick={canWatch ? onWatchLive : undefined}
      onKeyDown={
        canWatch
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onWatchLive?.();
              }
            }
          : undefined
      }
      className={`group flex h-8 items-center gap-2 rounded px-2 ${
        canWatch
          ? 'cursor-pointer hover:bg-primary/15 focus:outline-none focus:ring-1 focus:ring-primary'
          : 'cursor-default hover:bg-white/[0.06]'
      }`}
      title={
        canWatch
          ? `${member.username} 正在直播 · 点击查看`
          : `${member.username}\nID: ${member.userId}`
      }
    >
      <div className="relative h-8 w-8 shrink-0">
        {member.avatar ? (
          <img
            src={member.avatar}
            alt=""
            className="h-8 w-8 rounded-md object-cover"
          />
        ) : (
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-bg-tertiary text-xs font-semibold text-text-muted">
            {(member.username || '?').charAt(0).toUpperCase()}
          </div>
        )}
        <div
          className={`absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-[2px] border-bg-secondary ${
            member.isOnline ? 'bg-[#23a559]' : 'bg-[#80848e]'
          }`}
        />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1">
          <span className="truncate text-[13px] font-medium leading-none text-text-normal">
            {member.username}
          </span>
          {member.role === 'OWNER' && (
            <Crown size={12} className="shrink-0 text-[#faa61a]" aria-hidden />
          )}
          {member.role === 'ADMIN' && (
            <Shield size={12} className="shrink-0 text-primary" aria-hidden />
          )}
          {media?.screen && (
            <span className="shrink-0 text-success" title="屏幕共享中">
              <Monitor size={12} aria-hidden />
            </span>
          )}
          {media?.camera && (
            <span className="shrink-0 text-primary" title="摄像头开启">
              <Video size={12} aria-hidden />
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <div className="px-2 pb-0.5 pt-2 first:pt-1">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-text-muted/80">
        {children}
      </span>
    </div>
  );
}

export function ChannelMembers({ channelId, userId: currentUserId, isOwner: _isOwner }: ChannelMembersProps) {
  const { socket } = useWebSocket();
  const { setTarget: setLiveWatchTarget } = useLiveWatch();
  const [members, setMembers] = useState<MemberInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [collapsed, setCollapsed] = useState(false);
  const [mediaByUser, setMediaByUser] = useState<Record<string, MemberMedia>>({});

  const loadMembers = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`${getApiOrigin()}/channels/${channelId}/members`);
      if (response.ok) {
        const data = await response.json();
        setMembers(Array.isArray(data) ? data : (data.members || []));
      }
    } catch (error) {
      console.error('Failed to load members:', error);
    } finally {
      setLoading(false);
    }
  }, [channelId]);

  useEffect(() => {
    loadMembers();
  }, [loadMembers]);

  useEffect(() => {
    setMediaByUser({});
  }, [channelId]);

  useEffect(() => {
    if (!socket) return;

    const onMedia = (p: {
      channelId: string;
      userId: string;
      screen?: boolean;
      camera?: boolean;
    }) => {
      if (p.channelId !== channelId) return;
      setMediaByUser((prev) => {
        const next = { ...prev };
        if (!p.screen && !p.camera) {
          delete next[p.userId];
        } else {
          next[p.userId] = { screen: !!p.screen, camera: !!p.camera };
        }
        return next;
      });
    };

    /** 加入房间后服务端下发的全量媒体状态（刷新页后恢复「谁在播」） */
    const onSnapshot = (p: {
      channelId: string;
      states?: Array<{ userId: string; screen?: boolean; camera?: boolean }>;
    }) => {
      if (p.channelId !== channelId) return;
      setMediaByUser(() => {
        const next: Record<string, MemberMedia> = {};
        for (const s of p.states || []) {
          if (s.screen || s.camera) {
            next[s.userId] = { screen: !!s.screen, camera: !!s.camera };
          }
        }
        return next;
      });
    };

    socket.on('channel:media:state', onMedia);
    socket.on('channel:media:snapshot', onSnapshot);
    return () => {
      socket.off('channel:media:state', onMedia);
      socket.off('channel:media:snapshot', onSnapshot);
    };
  }, [socket, channelId]);

  useEffect(() => {
    const t = setInterval(() => loadMembers(), 12000);
    return () => clearInterval(t);
  }, [loadMembers]);

  useEffect(() => {
    if (!socket) return;

    const setOnline = (uid: string, online: boolean) => {
      setMembers((prev) =>
        prev.map((m) => (m.userId === uid ? { ...m, isOnline: online } : m)),
      );
    };

    const onOnline = (p: { userId?: string }) => {
      if (p?.userId) setOnline(p.userId, true);
    };
    const onOffline = (p: { userId?: string }) => {
      if (p?.userId) {
        setOnline(p.userId, false);
        setMediaByUser((prev) => {
          const next = { ...prev };
          delete next[p.userId!];
          return next;
        });
      }
    };
    const onStatus = (p: { userId?: string; status?: string }) => {
      if (p?.userId) setOnline(p.userId, p.status !== 'OFFLINE');
    };

    socket.on('user:online', onOnline);
    socket.on('user:offline', onOffline);
    socket.on('user:status', onStatus);

    return () => {
      socket.off('user:online', onOnline);
      socket.off('user:offline', onOffline);
      socket.off('user:status', onStatus);
    };
  }, [socket]);

  const { online, offline } = useMemo(() => {
    const on = members.filter((m) => m.isOnline);
    const off = members.filter((m) => !m.isOnline);
    return { online: on, offline: off };
  }, [members]);

  if (collapsed) {
    return (
      <div className="flex h-full w-[52px] shrink-0 flex-col items-center border-l border-border-color bg-bg-secondary py-2">
        <button
          type="button"
          onClick={() => setCollapsed(false)}
          className="rounded p-1.5 text-text-muted hover:bg-bg-hover hover:text-text-normal"
          title="显示成员列表"
        >
          <PanelRightOpen size={18} />
        </button>
        <div className="mt-2 flex flex-col items-center gap-0.5 text-[10px] text-text-muted">
          <span className="font-semibold text-text-normal">{members.length}</span>
          <span className="text-[#23a559]">{online.length}</span>
        </div>
      </div>
    );
  }

  return (
    <aside className="flex h-full w-[232px] shrink-0 flex-col border-l border-border-color bg-bg-secondary">
      {/* 顶栏：极窄，类似 Discord「成员」标题区 */}
      <div className="flex h-10 shrink-0 items-center justify-between border-b border-border-color/80 px-2">
        <span className="pl-1 text-xs font-semibold uppercase tracking-wide text-text-muted">
          成员 — {members.length}
        </span>
        <button
          type="button"
          onClick={() => setCollapsed(true)}
          className="rounded p-1 text-text-muted hover:bg-bg-hover hover:text-text-normal"
          title="收起成员列表"
        >
          <PanelRightClose size={16} />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain">
        {loading ? (
          <div className="px-3 py-2 text-xs text-text-muted">加载中…</div>
        ) : (
          <>
            {online.length > 0 && (
              <>
                <SectionLabel>在线 — {online.length}</SectionLabel>
                <div className="space-y-0.5 px-1 pb-1">
                  {online.map((m) => (
                    <MemberRow
                      key={m.userId}
                      member={m}
                      media={mediaByUser[m.userId]}
                      isSelf={m.userId === currentUserId}
                      onWatchLive={() =>
                        setLiveWatchTarget({
                          channelId,
                          broadcasterUserId: m.userId,
                          broadcasterName: m.username,
                          screen: !!mediaByUser[m.userId]?.screen,
                          camera: !!mediaByUser[m.userId]?.camera,
                        })
                      }
                    />
                  ))}
                </div>
              </>
            )}
            {offline.length > 0 && (
              <>
                <SectionLabel>离线 — {offline.length}</SectionLabel>
                <div className="space-y-0.5 px-1 pb-2">
                  {offline.map((m) => (
                    <MemberRow
                      key={m.userId}
                      member={m}
                      media={mediaByUser[m.userId]}
                      isSelf={m.userId === currentUserId}
                      onWatchLive={() =>
                        setLiveWatchTarget({
                          channelId,
                          broadcasterUserId: m.userId,
                          broadcasterName: m.username,
                          screen: !!mediaByUser[m.userId]?.screen,
                          camera: !!mediaByUser[m.userId]?.camera,
                        })
                      }
                    />
                  ))}
                </div>
              </>
            )}
            {members.length === 0 && (
              <p className="px-3 py-4 text-center text-xs text-text-muted">暂无成员</p>
            )}
          </>
        )}
      </div>

    </aside>
  );
}
