import { useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { API_ENDPOINTS } from "@/lib/api/endpoints";
import { ApiResponse, authProfileResponseData } from "@/types/auth";
import { useAuthStore } from "@/lib/auth/auth-store";

export const useTOTP = () => {
    const enableTOTPMutation = useMutation({
        mutationFn: async (userId: string) => {
            const { data } = await api.post<ApiResponse>(
                API_ENDPOINTS.AUTH.ENABLE_TOTP(userId)
            );
            return data;
        },
    });

    const disableTOTPMutation = useMutation({
        mutationFn: async (userId: string) => {
            const { data } = await api.post<ApiResponse>(
                API_ENDPOINTS.AUTH.DISABLE_TOTP(userId)
            );
            return data;
        },
    });

    // Safe variant of fetchAuthProfile: does NOT clear auth on failure, so it can be
    // called from authenticated pages (e.g. settings) without risking a forced logout
    // on a transient profile-endpoint hiccup.
    const refreshProfile = async () => {
        try {
            const { data } = await api.get<ApiResponse<authProfileResponseData>>(
                API_ENDPOINTS.AUTH.PROFILE,
                { timeout: 30000 }
            );
            const { setAuth } = useAuthStore.getState();
            setAuth(data.data, data.data.permissions);
        } catch {
            // Swallow silently — user stays logged in; the UI may show a stale
            // totp_enabled value until the next successful refresh.
        }
    };

    return {
        enableTOTP: enableTOTPMutation.mutateAsync,
        isEnableTOTPLoading: enableTOTPMutation.isPending,
        enableTOTPError: enableTOTPMutation.error,
        enableTOTPData: enableTOTPMutation.data, // This will contain the QR code/secret

        disableTOTP: disableTOTPMutation.mutateAsync,
        isDisableTOTPLoading: disableTOTPMutation.isPending,
        disableTOTPError: disableTOTPMutation.error,

        refreshProfile,
    };
};
