import { axiosInstance } from "@/lib/axios";
import { create } from "zustand";
import { useUser } from "@clerk/clerk-react";
import { persist } from "zustand/middleware";

interface AuthStore {
	isAdmin: boolean;
	isLoading: boolean;
	error: string | null;
	isAuthenticated: boolean;
	userId: string | null;

	checkAdminStatus: () => Promise<void>;
	reset: () => void;
	setAuthStatus: (isAuthenticated: boolean, userId: string | null) => void;
}

export const useAuthStore = create<AuthStore>()(
	persist(
		(set) => ({
			isAdmin: false,
			isLoading: false,
			error: null,
			isAuthenticated: false,
			userId: null,

			checkAdminStatus: async () => {
				set({ isLoading: true, error: null });
				try {
					const response = await axiosInstance.get("/admin/check");
					set({ isAdmin: response.data.admin });
				} catch (error: any) {
					set({ isAdmin: false, error: error.response.data.message });
				} finally {
					set({ isLoading: false });
				}
			},

			reset: () => {
				set({ isAdmin: false, isLoading: false, error: null, isAuthenticated: false, userId: null });
			},

			setAuthStatus: (isAuthenticated, userId) => {
				set({ isAuthenticated, userId });
			}
		}),
		{
			name: "auth-store", // name for the persisted store
			partialize: (state) => ({ 
				isAuthenticated: state.isAuthenticated, 
				userId: state.userId,
				isAdmin: state.isAdmin 
			})
		}
	)
);
