import { create } from 'zustand';
import { tenantApi, authApi } from '@/services/api';
import type { SysTenant, SysTenantUser, TenantUserRole, LoginResponse } from '@/types';

interface TenantStore {
  tenants: SysTenant[];
  currentTenantId: number | null;
  currentTenant: SysTenant | null;
  userRole: TenantUserRole;
  userTenants: SysTenantUser[];
  userId: string | null;
  userName: string | null;
  loading: boolean;

  fetchTenants: () => Promise<void>;
  setCurrentTenant: (tenantId: number) => void;
  fetchUserTenants: () => Promise<void>;
  initializeTenant: () => void;
  login: (userId: string, password: string) => Promise<LoginResponse>;
  logout: () => Promise<void>;
  isLoggedIn: () => boolean;
}

export const useTenantStore = create<TenantStore>((set, get) => ({
  tenants: [],
  currentTenantId: null,
  currentTenant: null,
  userRole: 'USER',
  userTenants: [],
  userId: null,
  userName: null,
  loading: false,

  fetchTenants: async () => {
    set({ loading: true });
    try {
      const tenants = await tenantApi.listTenants();
      set({ tenants });
    } finally {
      set({ loading: false });
    }
  },

  setCurrentTenant: (tenantId: number) => {
    const tenant = get().tenants.find((t) => t.id === tenantId) || null;
    localStorage.setItem('currentTenantId', String(tenantId));
    set({ currentTenantId: tenantId, currentTenant: tenant });
  },

  fetchUserTenants: async () => {
    try {
      const userTenants = await tenantApi.getCurrentUserTenants();
      set({ userTenants });
    } catch {
      set({ userTenants: [] });
    }
  },

  initializeTenant: () => {
    const savedTenantId = localStorage.getItem('currentTenantId');
    const savedRole = localStorage.getItem('currentUserRole') as TenantUserRole;
    const savedUserId = localStorage.getItem('currentUserId');
    const savedUserName = localStorage.getItem('currentUserName');

    if (savedRole) {
      set({ userRole: savedRole });
    }
    if (savedUserId) {
      set({ userId: savedUserId });
    }
    if (savedUserName) {
      set({ userName: savedUserName });
    }

    if (savedTenantId) {
      const tid = Number(savedTenantId);
      set({ currentTenantId: tid });
      get().fetchTenants().then(() => {
        const tenant = get().tenants.find((t) => t.id === tid);
        set({ currentTenant: tenant || null });
      });
    } else {
      get().fetchTenants().then(() => {
        const tenants = get().tenants;
        if (tenants.length > 0) {
          const first = tenants[0];
          get().setCurrentTenant(first.id);
        }
      });
    }
  },

  login: async (userId: string, password: string) => {
    const response = await authApi.login(userId, password);

    localStorage.setItem('authToken', response.token);
    localStorage.setItem('currentUserId', response.userId);
    localStorage.setItem('currentUserName', response.userName);
    localStorage.setItem('currentUserRole', response.role);

    set({
      userId: response.userId,
      userName: response.userName,
      userRole: response.role,
      userTenants: response.tenants || [],
    });

    return response;
  },

  logout: async () => {
    try {
      await authApi.logout();
    } finally {
      localStorage.removeItem('authToken');
      localStorage.removeItem('currentUserId');
      localStorage.removeItem('currentUserName');
      localStorage.removeItem('currentUserRole');
      localStorage.removeItem('currentTenantId');
      set({
        userId: null,
        userName: null,
        userRole: 'USER',
        currentTenantId: null,
        currentTenant: null,
        userTenants: [],
        tenants: [],
      });
    }
  },

  isLoggedIn: () => {
    return !!localStorage.getItem('authToken');
  },
}));
