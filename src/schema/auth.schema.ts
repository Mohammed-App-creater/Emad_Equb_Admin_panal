import { z } from "zod";
import { isValidEthiopianPhone, ETHIOPIAN_PHONE_MESSAGE } from "@/lib/validators";

export const registerSchema = z.object({
    branch_id: z.string().min(1, "Branch is required"),
    date_of_birth: z.string().min(1, "Date of birth is required"), // You might want more specific date validation
    email: z.string().email("Invalid email address"),
    first_name: z.string().min(1, "First name is required"),
    gender: z.enum(["Male", "Female"]),
    last_name: z.string().min(1, "Last name is required"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    phone_number: z.string().refine(isValidEthiopianPhone, ETHIOPIAN_PHONE_MESSAGE),
    tin_number: z.string().optional(),
});

export const loginSchema = z.object({
    email: z.string().email("Invalid email address"),
    password: z.string().min(8, "Password must be at least 8 characters"),
});

export const loginWithTOTPSchema = z.object({
    email: z.string().email("Invalid email address"),
    code: z.string().min(6, "TOTP code must be at least 6 characters"),
});

export const changePasswordSchema = z.object({
    current_password: z.string().min(1, "Current password is required"),
    new_password: z.string().min(8, "New password must be at least 8 characters"),
});

export const forgotPasswordSchema = z.object({
    email: z.string().email("Invalid email address"),
});

export const resetPasswordSchema = z.object({
    new_password: z.string().min(8, "New password must be at least 8 characters"),
    token: z.string().min(1, "Token is required"),
});

export type RegisterFormValues = z.infer<typeof registerSchema>;
export type LoginFormValues = z.infer<typeof loginSchema>;
export type LoginWithTOTPFormValues = z.infer<typeof loginWithTOTPSchema>;
export type ChangePasswordFormValues = z.infer<typeof changePasswordSchema>;
export type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;
