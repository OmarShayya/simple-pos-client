import { create } from "zustand";
import { persist } from "zustand/middleware";
import { User } from "@/types/auth.types";
import { queryClient } from "@/api/queryClient";

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  setAuth: (user: User, token: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      setAuth: (user, token) => {
        set({ user, token, isAuthenticated: true });
      },
      logout: () => {
        localStorage.removeItem("token"); // Clean up any existing token
        // The next person on this device must never see the previous user's cached data
        queryClient.clear();
        set({ user: null, token: null, isAuthenticated: false });
      },
    }),
    {
      name: "auth-storage",
      partialize: (state) => ({
        token: state.token,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
