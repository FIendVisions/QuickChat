// frontend/src/store/voiceStore.ts

import { create } from 'zustand';

interface Participant {
  userId: string;
  username: string;
  isMuted: boolean;
  isSpeaking: boolean;
  joinedAt: number;
  volume?: number;
}

interface VoiceStore {
  isConnected: boolean;
  isMicrophoneOpen: boolean;
  isDeafened: boolean;
  participants: Map<string, Participant>;
  speakingUsers: Set<string>;
  userVolumes: Map<string, number>;
  setConnected: (connected: boolean) => void;
  setMicrophoneOpen: (open: boolean) => void;
  setDeafened: (deafened: boolean) => void;
  addParticipant: (participant: Participant) => void;
  removeParticipant: (userId: string) => void;
  updateParticipant: (userId: string, data: Partial<Participant>) => void;
  setSpeaking: (userId: string, isSpeaking: boolean) => void;
  clearParticipants: () => void;
}

export const useVoiceStore = create<VoiceStore>((set, get) => ({
  isConnected: false,
  isMicrophoneOpen: false,
  isDeafened: false,
  participants: new Map(),
  speakingUsers: new Set(),
  userVolumes: new Map(),
  
  setConnected: (connected) => set({ isConnected: connected }),
  setMicrophoneOpen: (open) => set({ isMicrophoneOpen: open }),
  setDeafened: (deafened) => set({ isDeafened: deafened }),
  
  addParticipant: (participant) => {
    const participants = new Map(get().participants);
    participants.set(participant.userId, participant);
    set({ participants });
  },
  
  removeParticipant: (userId) => {
    const participants = new Map(get().participants);
    participants.delete(userId);
    set({ participants });
  },
  
  updateParticipant: (userId, data) => {
    const participants = new Map(get().participants);
    const existing = participants.get(userId);
    if (existing) {
      participants.set(userId, { ...existing, ...data });
      set({ participants });
    }
  },
  
  setSpeaking: (userId, isSpeaking) => {
    const speakingUsers = new Set(get().speakingUsers);
    if (isSpeaking) {
      speakingUsers.add(userId);
    } else {
      speakingUsers.delete(userId);
    }
    set({ speakingUsers });
  },
  
  clearParticipants: () => set({
    participants: new Map(),
    speakingUsers: new Set(),
    userVolumes: new Map(),
  }),
}));
