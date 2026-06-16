import { create } from 'zustand';
import { tenantApi } from '@/services/api';
import type { SysTenant, SysTenantUser } from '@/types';

interface TenantStore {
  tenants: SysTenant[];
  currentTenantId: number | null;
  currentTenant: SysTenant | null;
  userRole: string;
  userTenants: SysTenantUser[];
  loading: boolean;

  fetchTenants: () => Promise<void>;
  setCurrentTenant: (tenantId: number) => void;
  fetchUserTenants: () => Promise<void>;
  initializeTenant: () => void;
  setUserContext: (userId: string, role: string) => void;
}

export const useTenantStore = create<TenantStore>((set, get) => ({
  tenants: [],
  currentTenantId: null,
  currentTenant: null,
  userRole: 'USER',
  userTenants: [],
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
    const savedRole = localStorage.getItem('currentUserRole');

    if (savedRole) {
      set({ userRole: savedRole });
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

  setUserContext: (userId: string, role: string) => {
    localStorage.setItem('currentUserId', userId);
    localStorage.setItem('currentUserRole', role);
    set({ userRole: role });
  },
}));
