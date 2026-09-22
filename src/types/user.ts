export type Gender = 'Male' | 'Female';
export type UserStatus = 'active' | 'inactive' | 'pending';

export interface Role {
    id: string;
    name: string;
    slug: string;
    permissions?: Permission[];
    created_at?: string;
    updated_at?: string;
}

export interface Permission {
    id: string;
    permission_id: string;
    role_id: string;
}

export interface Branch {
    id: string;
    name: string;
    branch_code?: string;
    region?: string;
    city?: string;
    // Add other branch fields as needed based on API response
}

export interface User {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    phone: string;                
    status: UserStatus | boolean;   // API returns a boolean (true = active)
    roles?: Role[];            
    permissions?: string[];  
    branch_id?: string;
    branch?: Branch;
    full_name?: string;
    gender?: Gender;
    date_of_birth?: string;       
    tin_number?: string;
    qr_code_image_url?: string;
    totp_enabled?: boolean;
    created_at?: string;
    updated_at?: string;
}

export interface CreateUserInput {
    branch_id: string;
    date_of_birth: string;
    email: string;
    first_name: string;
    gender: Gender;
    last_name: string;
    phone_number: string;
    role_id: string; // The API takes a single role_id for creation as per documentation
    status: boolean;
    tin_number?: string;
    // password is handled separately or generated? Documentation says "Required, minimum 8 chars", so we add it.
    password?: string; // Optional in type if we generate it, but API requires it.
}

export interface UpdateUserInput extends Partial<CreateUserInput> {
    // Password can be omitted if not changing
    password?: string; // Optional for updates
}

export interface UserResponse {
    data: {
        users: User;
        page: number;
        perPage: number;
        totalCount: number;
    };
    meta?: {
        current_page: number;
        last_page: number;
        per_page: number;
        totalCount: number;
    };
    message: string;
    status: number;
    success: boolean;
}

export interface UsersResponse {
    // The list endpoint returns the users array directly under `data`,
    // with pagination info under `meta`.
    data: User[];
    meta?: {
        total: number;
        page: number;
        per_page: number;
        total_pages: number;
    };
    message: string;
    code?: string;
    status?: number;
    success: boolean;
}


// hooks/users/use-users.ts (partial update)
export interface UserFilters {
    search?: string;
    status?: string; // 'active' | 'inactive' | 'all'
    role_id?: string;
    branch_id?: string;
    gender?: 'Male' | 'Female' | ''; // Allow empty string for "no filter"
    date_from?: string; // ISO date string
    date_to?: string;
    // ... any other filters
}

