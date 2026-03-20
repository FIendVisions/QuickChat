export interface ServerCategory {
  id: string;
  serverId: string;
  name: string;
  position: number;
}

export interface ServerSummary {
  id: string;
  name: string;
  icon?: string | null;
  ownerId: string;
  inviteCode: string;
  role: string;
  owner?: { id: string; username: string };
  memberCount?: number;
  channelCount?: number;
  createdAt: string;
  updatedAt: string;
}
