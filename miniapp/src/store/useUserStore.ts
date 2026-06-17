import { create } from 'zustand';
import type { UserInfo } from '@/types';
import { userStorage } from '@/utils/storage';

interface UserState {
  userInfo: UserInfo | null;
  loading: boolean;

  loadUserInfo: () => void;
  updateUserInfo: (info: Partial<UserInfo>) => void;
  clearUserInfo: () => void;
}

export const useUserStore = create<UserState>((set, get) => ({
  userInfo: null,
  loading: false,

  loadUserInfo: () => {
    const userInfo = userStorage.get();
    if (!userInfo) {
      const defaultUser: UserInfo = {
        id: 'user_001',
        name: '巡检员',
        department: '运维部',
        lastLoginAt: new Date().toISOString()
      };
      userStorage.save(defaultUser);
      set({ userInfo: defaultUser });
    } else {
      set({ userInfo });
    }
    console.log('[UserStore] User info loaded');
  },

  updateUserInfo: (info) => {
    const { userInfo } = get();
    if (!userInfo) return;

    const updated: UserInfo = {
      ...userInfo,
      ...info
    };
    userStorage.save(updated);
    set({ userInfo: updated });
    console.log('[UserStore] User info updated');
  },

  clearUserInfo: () => {
    userStorage.clear();
    set({ userInfo: null });
    console.log('[UserStore] User info cleared');
  }
}));
