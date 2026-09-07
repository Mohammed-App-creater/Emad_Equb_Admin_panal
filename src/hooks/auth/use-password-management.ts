import { useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { API_ENDPOINTS } from "@/lib/api/endpoints";
import {
    ChangePasswordRequest,
    ForgotPasswordRequest,
    ResetPasswordRequest,
    ApiResponse
} from "@/types/auth";

export const usePasswordManagement = () => {
    const changePasswordMutation = useMutation({
        mutationFn: async (payload: ChangePasswordRequest) => {
            const { data } = await api.post<ApiResponse>(
                API_ENDPOINTS.AUTH.CHANGE_PASSWORD,
                payload
            );
            return data;
        },
    });

    const forgotPasswordMutation = useMutation({
        mutationFn: async (payload: ForgotPasswordRequest) => {
            const { data } = await api.post<ApiResponse>(
                API_ENDPOINTS.AUTH.FORGOT_PASSWORD,
                payload
            );
            return data;
        },
    });

    const resetPasswordMutation = useMutation({
        mutationFn: async (payload: ResetPasswordRequest) => {
            const { data } = await api.post<ApiResponse>(
                API_ENDPOINTS.AUTH.RESET_PASSWORD,
                payload
            );
            return data;
        },
    });

    return {
        // Change Password
        changePassword: changePasswordMutation.mutateAsync,
        isChangePasswordLoading: changePasswordMutation.isPending,
        changePasswordError: changePasswordMutation.error,

        // Forgot Password
        forgotPassword: forgotPasswordMutation.mutateAsync,
        isForgotPasswordLoading: forgotPasswordMutation.isPending,
        forgotPasswordError: forgotPasswordMutation.error,

        // Reset Password
        resetPassword: resetPasswordMutation.mutateAsync,
        isResetPasswordLoading: resetPasswordMutation.isPending,
        resetPasswordError: resetPasswordMutation.error,
    };
};
