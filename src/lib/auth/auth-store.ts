import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface Permission {
  id: string;
  role_id: string;
  permission_id: string;
}

export interface Role {
  id: string;
  name: string;
  slug: string;
  created_at: string;
  updated_at: string;
  permissions: Permission[] | null;
}

export interface Branch {
  id: string;
  branch_code: string;
  name: string;
  is_head_quarter: boolean;
  email: string;
  phone_number: string;
  region: string;
  city: string;
  address: string;
  country: string;
  zip_code: string;
  status: boolean;
}

export interface User {
  id: string;
  full_name: string;
  first_name: string;
  last_name: string;
  email: string;
  branch_id: string;
  branch: Branch | null;
  roles: Role[];
  phone_number: string;
  gender: string;
  status: boolean;
  totp_enabled: boolean;
  qr_code_image_url?: string;
  permissions?: string[];
  profile_picture?: string;
  job_title?: string;
  department?: string;
  phone?: string;
  employee_id?: string;
  date_of_birth?: string;
}

interface AuthState {
  user: User | null;
  permissions: string[];
  token?: string;
  refresh_token?: string;
  isLoading: boolean;
  isInitialized: boolean;

  setAuth: (user: User, permissions: string[], token?: string, refresh_token?: string) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      permissions: [],
      token: undefined,
      refresh_token: undefined,
      isLoading: true,
      isInitialized: false,

      setAuth: (user, permissions, token, refresh_token) =>
        set((s) => ({
          user,
          permissions,
          token: token ?? s.token,
          refresh_token: refresh_token ?? s.refresh_token,
          isLoading: false,
          isInitialized: true,
        })),

      clearAuth: () =>
        set({
          user: null,
          permissions: [],
          token: undefined,
          refresh_token: undefined,
          isLoading: false,
          isInitialized: false,
        }),
    }),
    {
      name: "auth-storage",

      partialize: (state) => ({
        user: state.user,
        permissions: state.permissions,
        token: state.token,
        refresh_token: state.refresh_token,
      }),

      onRehydrateStorage: () => (state) => {
        if (state) {
          state.isInitialized = true;
          state.isLoading = false;
        }
      },
    }

  )
);
