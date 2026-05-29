import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type AuthUser = {
  uid: string;
  email: string;
  displayName: string;
};

type AuthStore = {
  user: AuthUser | null;
  lastSyncAt: number;
  setUser: (user: AuthUser | null) => void;
  setLastSyncAt: (ts: number) => void;
};

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      lastSyncAt: 0,
      setUser: (user) => set({ user }),
      setLastSyncAt: (ts) => set({ lastSyncAt: ts }),
    }),
    {
      name: 'auth',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
