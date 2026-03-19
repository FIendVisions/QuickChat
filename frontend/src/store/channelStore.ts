// frontend/src/store/channelStore.ts

import { create } from 'zustand';
import { Channel } from '@/types/channel.types';

interface ChannelStore {
  channels: Channel[];
  activeChannelId: string | null;
  setActiveChannel: (id: string | null) => void;
  setChannels: (channels: Channel[]) => void;
}

export const useChannelStore = create<ChannelStore>((set) => ({
  channels: [],
  activeChannelId: null,
  setActiveChannel: (id) => set({ activeChannelId: id }),
  setChannels: (channels) => set({ channels }),
}));
