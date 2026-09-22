import { useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { API_ENDPOINTS } from "@/lib/api/endpoints";
import { useAuthStore } from "@/lib/auth/auth-store";
import { useRouter } from "next/navigation";
import {
    LoginRequest,
    LoginWithTOTPRequest,
    RegisterRequest,
    ApiResponse,
    LoginResponseData,
    authProfileResponseData,
    isTotpRequired
} from "@/types/auth";

// Response type for login endpoints
type LoginResponse = ApiResponse<LoginResponseData>;

export const useAuth = () => {
    const { user, token, refresh_token, setAuth, clearAuth } = useAuthStore();
    const router = useRouter();

    // Login Mutation
    const loginMutation = useMutation({
        mutationFn: async (payload: LoginRequest) => {
            const { data } = await api.post<LoginResponse>(
                API_ENDPOINTS.AUTH.LOGIN,
                payload
            );
            return data;
        },
        onSuccess: (response) => {
            // If TOTP is required, defer auth side-effects until loginWithTOTPMutation succeeds.
            if (isTotpRequired(response)) {
                return;
            }
            handleLoginSuccess(response);
        },
    });

    // Login with TOTP Mutation
    const loginWithTOTPMutation = useMutation({
        mutationFn: async (payload: LoginWithTOTPRequest) => {
            const { data } = await api.post<LoginResponse>(
                API_ENDPOINTS.AUTH.LOGIN_TOTP,
                payload
            );
            return data;
        },
        onSuccess: (response) => {
            handleLoginSuccess(response);

        },
    });

    // User auth Profile fetching by token (if needed for auto-login or session validation)
    const authProfileMutation = useMutation({
        mutationFn: async () => {
            const { data } = await api.get<ApiResponse<authProfileResponseData>>(
                API_ENDPOINTS.AUTH.PROFILE
            );
            return data;
        },
        onSuccess: (response) => {
            handleLoginSuccessProfile(response);
        },
        onError: () => {
            // If token is invalid or expired, clear auth state
            clearAuth();
        }
    });

    // Member Login Mutation (if needed separately, otherwise use standard login)
    const loginMemberMutation = useMutation({
        mutationFn: async (payload: LoginRequest) => {
            const { data } = await api.post<LoginResponse>(
                API_ENDPOINTS.AUTH.LOGIN_MEMBER,
                payload
            );
            return data;
        },
        onSuccess: (response) => {
            handleLoginSuccess(response);
        },
    });

    // Logout Mutation
    const logoutMutation = useMutation({
        mutationFn: async () => {
            handleLogoutCleanup()
            await api.post<ApiResponse>(
                API_ENDPOINTS.AUTH.LOGOUT
            );
        },
        onSuccess: () => {
            handleLogoutCleanup();
        },
        onError: () => {
            // Even if API fails, clear local state
            handleLogoutCleanup();
        }
    });

    // Register Mutation
    const registerMutation = useMutation({
        mutationFn: async (payload: RegisterRequest) => {
            const { data } = await api.post<ApiResponse>(
                API_ENDPOINTS.AUTH.REGISTER,
                payload
            );
            return data;
        },
        // No auto-login on register usually, just return success
    });

    // Helper to handle successful login
    const handleLoginSuccess = (response: LoginResponse) => {
        const { token, user } = response.data;

        // Store token in cookie
        document.cookie = `session=${token}; path=/; max-age=86400; SameSite=Lax`;

        setAuth(user, user.permissions ?? [], token);
    };

    const handleLoginSuccessProfile = (response: ApiResponse<authProfileResponseData>) => {
        const { data } = response;
        setAuth(data, data.permissions);
    };

    // Helper to handle logout cleanup
    const handleLogoutCleanup = () => {
        document.cookie = "session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax";
        clearAuth();
        router.push("/login"); // Or wherever the login page is
    };

    return {
        // User State
        user,
        token,
        refresh_token,
        isAuthenticated: !!user,

        // Login
        login: loginMutation.mutateAsync,
        isLoginLoading: loginMutation.isPending,
        loginError: loginMutation.error,

        // Login with TOTP
        loginWithTOTP: loginWithTOTPMutation.mutateAsync,
        isLoginTOTPLoading: loginWithTOTPMutation.isPending,
        loginTOTPError: loginWithTOTPMutation.error,

        // Member Login
        loginMember: loginMemberMutation.mutateAsync,
        isLoginMemberLoading: loginMemberMutation.isPending,
        loginMemberError: loginMemberMutation.error,

        // Logout
        logout: logoutMutation.mutateAsync,
        isLogoutLoading: logoutMutation.isPending,

        // Register
        register: registerMutation.mutateAsync,
        isRegisterLoading: registerMutation.isPending,
        registerError: registerMutation.error,

        // Auth Profile
        fetchAuthProfile: authProfileMutation.mutateAsync,
    };
};
