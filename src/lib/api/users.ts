import { api } from "./client";
import { API_ENDPOINTS } from "./endpoints";
import {
    User,
    CreateUserInput,
    UpdateUserInput,
    UsersResponse,
    UserResponse,
} from "@/types/user";

export const UserService = {
    getUsers: async (page = 1, perPage = 10, filters?: { search?: string; status?: string }): Promise<UsersResponse> => {
        const { data } = await api.get<UsersResponse>(API_ENDPOINTS.USERS.LIST, {
            params: { page, per_page: perPage, ...filters }
        });
        return data;
    },

    getUser: async (id: string): Promise<UserResponse> => {
        const { data } = await api.get<UserResponse>(API_ENDPOINTS.USERS.DETAIL(id));
        return data;
    },

    createUser: async (userData: CreateUserInput): Promise<UserResponse> => {
        const { data } = await api.post<UserResponse>(API_ENDPOINTS.USERS.CREATE, userData);
        return data;
    },

    updateUser: async (id: string, userData: UpdateUserInput): Promise<UserResponse> => {
        const { data } = await api.put<UserResponse>(API_ENDPOINTS.USERS.UPDATE(id), userData);
        return data;
    },

    deleteUser: async (id: string): Promise<unknown> => {
        const { data } = await api.delete(API_ENDPOINTS.USERS.DELETE(id));
        return data;
    },

    getUsersByBranch: async (branchId: string): Promise<UsersResponse> => {
        const { data } = await api.get<UsersResponse>(API_ENDPOINTS.USERS.BY_BRANCH(branchId));
        return data;
    },

    // NEW: Get users by permission ID
    getUsersByPermission: async (permissionId: string): Promise<User[]> => {
        const { data } = await api.get<User[]>(`/users/permissions/${permissionId}`);
        return data;
    },

    // NEW: Get users by role ID
    getUsersByRoleId: async (roleId: string): Promise<User[]> => {
        const { data } = await api.get<User[]>(API_ENDPOINTS.USERS.BY_ROLE_ID(roleId));
        return data;
    },

    getUsersById: async (userId: string): Promise<UserResponse> => {
        const { data } = await api.get<UserResponse>(API_ENDPOINTS.USERS.BY_ID(userId));
        return data;
    },

    // NEW: Get users by role slug with pagination
    getUsersByRoleSlug: async (roleSlug: string, page = 1, perPage = 10): Promise<{ data: { users: User[], total: number, page: number, perPage: number, totalCount: number } }> => {
        const { data } = await api.get<{ data: { users: User[], total: number, page: number, perPage: number, totalCount: number } }>(API_ENDPOINTS.USERS.BY_ROLE_SLUG(roleSlug), {
            params: { page, perPage }
        });
        return data;
    }
};
