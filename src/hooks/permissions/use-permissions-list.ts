import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api/client";
import { API_ENDPOINTS } from "@/lib/api/endpoints";

export interface ApiPermission {
    id: string;
    name: string;
    slug: string;
}

interface PermissionsResponse {
    data: ApiPermission[];
    message: string;
    status: number;
    success: boolean;
}

/**
 * Fetches the full catalog of permissions from the backend.
 *
 * The UI catalog (PERMISSION_DATA) is keyed by slug, but the assign/revoke
 * endpoints expect permission UUIDs. This hook is the source of truth for the
 * slug -> id mapping needed to build those payloads.
 */
export const usePermissionsList = () => {
    return useQuery({
        queryKey: ["permissions"],
        queryFn: async () => {
            const { data } = await api.get<PermissionsResponse>(
                API_ENDPOINTS.PERMISSIONS.LIST
            );
            return data.data;
        },
    });
};
