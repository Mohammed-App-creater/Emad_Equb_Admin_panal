// hooks/usePermissions.ts
import { useAuthStore } from '@/lib/auth/auth-store';
import { Permissions } from '@/lib/auth/permissions';
import { Role, User } from '@/lib/auth/auth-store';

// Define the Permission type directly from the values
type Permission = {
  [Resource in keyof typeof Permissions]: 
    typeof Permissions[Resource][keyof typeof Permissions[Resource]]
}[keyof typeof Permissions];


// ──────────────────────────────────────────────────────────────
// Resources that actually support full CRUD (excludes SYSTEM, etc.)
type CrudResource = {
  [K in keyof typeof Permissions]: 
    'CREATE' extends keyof typeof Permissions[K] ?
    'READ'   extends keyof typeof Permissions[K] ?
    'UPDATE' extends keyof typeof Permissions[K] ?
    'DELETE' extends keyof typeof Permissions[K] ?
      K
      : never : never : never : never
}[keyof typeof Permissions];
// ──────────────────────────────────────────────────────────────



interface UsePermissionsReturn {
  hasPermission: (permission: Permission) => boolean;
  hasAnyPermission: (permissions: Permission[]) => boolean;
  hasAllPermissions: (permissions: Permission[]) => boolean;
  hasRole: (roleSlug: string) => boolean;
  hasAnyRole: (roleSlugs: string[]) => boolean;
  hasAllRoles: (roleSlugs: string[]) => boolean;
  isInBranch: (branchId: string) => boolean;
  isAgent: boolean;
  agentId: string | undefined;
  userPermissions: string[];
  userRoles: Role[];
  user: User | null;
  isLoading: boolean;
  isInitialized: boolean;
}

// Role names/slugs come back from the backend with inconsistent casing
// ("Agent", "AGENT", "agent"). Compare against both the slug and the display
// name, case-insensitively, so a role check never fails on casing alone.
const roleMatches = (role: Role, wanted: string): boolean => {
  const target = wanted.trim().toLowerCase();
  return (
    role.slug?.trim().toLowerCase() === target ||
    role.name?.trim().toLowerCase() === target
  );
};

export const AGENT_ROLE = "agent";



export function usePermissions(): UsePermissionsReturn {
  const { user, permissions: userPermissions, isLoading, isInitialized } = useAuthStore();

  const hasPermission = (permission: Permission): boolean => {
    return userPermissions.includes(permission);
  };

  const hasAnyPermission = (permissions: Permission[]): boolean => {
    return permissions.some(permission => userPermissions.includes(permission));
  };

  const hasAllPermissions = (permissions: Permission[]): boolean => {
    return permissions.every(permission => userPermissions.includes(permission));
  };

  const hasRole = (roleSlug: string): boolean => {
    return user?.roles?.some(role => roleMatches(role, roleSlug)) ?? false;
  };

  const hasAnyRole = (roleSlugs: string[]): boolean => {
    return roleSlugs.some(slug =>
      user?.roles?.some(role => roleMatches(role, slug))
    ) ?? false;
  };

  const hasAllRoles = (roleSlugs: string[]): boolean => {
    return roleSlugs.every(slug =>
      user?.roles?.some(role => roleMatches(role, slug))
    ) ?? false;
  };

  const isInBranch = (branchId: string): boolean => {
    return user?.branch_id === branchId;
  };

  // The logged-in user is a field agent. Their agent user id (used by the
  // /agents/{id}/* and /reports/agents/{id}/report endpoints) is their user id.
  const isAgent = hasRole(AGENT_ROLE);
  const agentId = isAgent ? user?.id : undefined;

  return {
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    hasRole,
    hasAnyRole,
    hasAllRoles,
    isInBranch,
    isAgent,
    agentId,
    userPermissions,
    userRoles: user?.roles ?? [],
    user,
    isLoading,
    isInitialized,
  };
}

// Optional: Create a more specific hook for feature-based permissions
export function useFeaturePermissions() {
  const { hasPermission, hasAnyPermission, isLoading, isInitialized } = usePermissions();

  return {
    // Employee management
    canManageEmployees: hasPermission(Permissions.EMPLOYEE.CREATE) || 
                        hasPermission(Permissions.EMPLOYEE.UPDATE) || 
                        hasPermission(Permissions.EMPLOYEE.DELETE),
    canViewEmployees: hasPermission(Permissions.EMPLOYEE.READ),
    canCreateEmployee: hasPermission(Permissions.EMPLOYEE.CREATE),
    canUpdateEmployee: hasPermission(Permissions.EMPLOYEE.UPDATE),
    canDeleteEmployee: hasPermission(Permissions.EMPLOYEE.DELETE),

    // Manager management
    canManageManagers: hasAnyPermission([
      Permissions.MANAGER.CREATE,
      Permissions.MANAGER.UPDATE,
      Permissions.MANAGER.DELETE,
    ]),
    canViewManagers: hasPermission(Permissions.MANAGER.READ),

    // Administrator management
    canManageAdministrators: hasAnyPermission([
      Permissions.ADMINISTRATOR.CREATE,
      Permissions.ADMINISTRATOR.UPDATE,
      Permissions.ADMINISTRATOR.DELETE,
    ]),
    canViewAdministrators: hasPermission(Permissions.ADMINISTRATOR.READ),

    // Member management
    canManageMembers: hasAnyPermission([
      Permissions.MEMBER.CREATE,
      Permissions.MEMBER.UPDATE,
      Permissions.MEMBER.DELETE,
    ]),
    canViewMembers: hasPermission(Permissions.MEMBER.READ),

    // Branch management
    canManageBranches: hasAnyPermission([
      Permissions.BRANCH.CREATE,
      Permissions.BRANCH.UPDATE,
      Permissions.BRANCH.DELETE,
      Permissions.BRANCH.ASSIGN,
    ]),
    canViewBranches: hasPermission(Permissions.BRANCH.READ),
    canAssignBranch: hasPermission(Permissions.BRANCH.ASSIGN),

    // Account management
    canManageAccounts: hasAnyPermission([
      Permissions.ACCOUNT.CREATE,
      Permissions.ACCOUNT.UPDATE,
      Permissions.ACCOUNT.DELETE,
    ]),
    canViewAccounts: hasPermission(Permissions.ACCOUNT.READ),

    // Account Type management
    canManageAccountTypes: hasAnyPermission([
      Permissions.ACCOUNT_TYPE.CREATE,
      Permissions.ACCOUNT_TYPE.UPDATE,
      Permissions.ACCOUNT_TYPE.DELETE,
    ]),
    canViewAccountTypes: hasPermission(Permissions.ACCOUNT_TYPE.READ),

    // Share management
    canManageShares: hasAnyPermission([
      Permissions.SHARE.CREATE,
      Permissions.SHARE.UPDATE,
      Permissions.SHARE.DELETE,
    ]),
    canViewShares: hasPermission(Permissions.SHARE.READ),

    // Loan management
    canManageLoans: hasAnyPermission([
      Permissions.LOAN.CREATE,
      Permissions.LOAN.UPDATE,
      Permissions.LOAN.DELETE,
    ]),
    canViewLoans: hasPermission(Permissions.LOAN.READ),
    // Loan specialized actions
    canApproveLoan: hasPermission(Permissions.LOAN.APPROVE),
    canRejectLoan: hasPermission(Permissions.LOAN.REJECT),
    canDisburseLoan: hasPermission(Permissions.LOAN.DISBURSE),

    // Payment management
    canManagePayments: hasAnyPermission([
      Permissions.PAYMENT.CREATE,
      Permissions.PAYMENT.UPDATE,
      Permissions.PAYMENT.DELETE,
    ]),
    canViewPayments: hasPermission(Permissions.PAYMENT.READ),
    // Payment specialized actions
    canApprovePayment: hasPermission(Permissions.PAYMENT.APPROVE),
    canReversePayment: hasPermission(Permissions.PAYMENT.REVERSE),

    // Share specialized action
    canBuyShare: hasPermission(Permissions.SHARE.BUY),

    // Member registration management
    canViewMemberRegistrations: hasPermission(Permissions.MEMBER_REGISTRATION.READ),
    canCreateMemberRegistration: hasPermission(Permissions.MEMBER_REGISTRATION.CREATE),
    canApproveMemberRegistration: hasPermission(Permissions.MEMBER_REGISTRATION.APPROVE),
    canRejectMemberRegistration: hasPermission(Permissions.MEMBER_REGISTRATION.REJECT),

    // Approval workflow specialized actions
    canViewApprovalWorkflow: hasPermission(Permissions.APPROVAL_WORKFLOW.READ),
    canApproveWorkflow: hasPermission(Permissions.APPROVAL_WORKFLOW.APPROVE),
    canRejectWorkflow: hasPermission(Permissions.APPROVAL_WORKFLOW.REJECT),
    canManageWorkflow: hasPermission(Permissions.APPROVAL_WORKFLOW.MANAGE),

    // Role & Permission management
    canManageRoles: hasAnyPermission([
      Permissions.ROLE.CREATE,
      Permissions.ROLE.UPDATE,
      Permissions.ROLE.DELETE,
    ]),
    canViewRoles: hasPermission(Permissions.ROLE.READ),

    canManagePermissions: hasAnyPermission([
      Permissions.PERMISSION.CREATE,
      Permissions.PERMISSION.UPDATE,
      Permissions.PERMISSION.DELETE,
    ]),
    canViewPermissions: hasPermission(Permissions.PERMISSION.READ),

    // System features
    canGenerateReports: hasPermission(Permissions.SYSTEM.GENERATE_REPORT),
    canAudit: hasPermission(Permissions.SYSTEM.AUDIT),
    canManageSettings: hasPermission(Permissions.SYSTEM.MANAGE_SETTINGS),

    // Granular settings (distinct from SYSTEM.MANAGE_SETTINGS)
    canViewSettings: hasAnyPermission([
      Permissions.SETTINGS.READ,
      Permissions.SYSTEM.MANAGE_SETTINGS,
    ]),
    canUpdateSettings: hasAnyPermission([
      Permissions.SETTINGS.UPDATE,
      Permissions.SYSTEM.MANAGE_SETTINGS,
    ]),

    // Access control / RBAC
    canManageRbac: hasPermission(Permissions.ACCESS_CONTROL.RBAC_MANAGE),
    canManageUserAccess: hasPermission(Permissions.ACCESS_CONTROL.USER_ACCESS_MANAGE),

    // Account journal / ledger
    canReadAccountJournal: hasPermission(Permissions.ACCOUNT_JOURNAL.READ),

        // CRUD operations helpers
    canCreate: (resource: CrudResource) =>
      hasPermission(Permissions[resource].CREATE as Permission),

    canRead: (resource: CrudResource) =>
      hasPermission(Permissions[resource].READ as Permission),

    canUpdate: (resource: CrudResource) =>
      hasPermission(Permissions[resource].UPDATE as Permission),

    canDelete: (resource: CrudResource) =>
      hasPermission(Permissions[resource].DELETE as Permission),

    // Most Important
    isLoading: isLoading || !isInitialized,
    isReady: isInitialized && !isLoading,
  };
}