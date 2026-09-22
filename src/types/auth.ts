import { User } from '@/lib/auth/auth-store';

export interface RegisterRequest {
    branch_id: string;
    date_of_birth: string; // YYYY-MM-DD
    email: string;
    first_name: string;
    gender: 'Male' | 'Female';
    last_name: string;
    password: string; // min 8 chars
    phone_number: string;
    tin_number?: string;
}

export interface LoginRequest {
    identifier: string;
    password: string; // min 8 chars
}

export interface LoginWithTOTPRequest {
    identifier: string;
    password: string;
    code: string;
}

export interface ChangePasswordRequest {
    current_password: string;
    new_password: string; // min 8 chars
}

export interface ForgotPasswordRequest {
    email: string;
}

export interface ResetPasswordRequest {
    new_password: string; // min 8 chars
    token: string;
}

export interface ApiResponse<T = { requires_totp?: boolean }> {
    data: T;
    message: string;
    status: number;
    success: boolean;
    code?: string;
    error?: string;
}

// Backend signals a TOTP challenge with HTTP 202 + this code and no `data` payload.
export const TOTP_REQUIRED_CODE = "AUTH_007";

export const isTotpRequired = (response?: ApiResponse | null): boolean =>
    response?.code === TOTP_REQUIRED_CODE || response?.data?.requires_totp === true;

export interface LoginResponseData {
    token: string;
    refresh_token: string;
    permissions: string[];
    user: User; // Using any for now to avoid circular dependency, or import User type
    requires_totp?: boolean;
}

export interface authProfileResponseData extends User {
    permissions: string[];
}
