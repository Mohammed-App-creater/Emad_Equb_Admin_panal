// lib/permissions.ts

export const Permissions = {
  // Role permissions
  ROLE: {
    CREATE: 'role:create',
    READ: 'role:read',
    UPDATE: 'role:update',
    DELETE: 'role:delete',
  },

  // Permission management
  PERMISSION: {
    CREATE: 'permission:create',
    READ: 'permission:read',
    UPDATE: 'permission:update',
    DELETE: 'permission:delete',
  },

  // Employee permissions
  EMPLOYEE: {
    CREATE: 'employee:create',
    READ: 'employee:read',
    UPDATE: 'employee:update',
    DELETE: 'employee:delete',
  },

  // Manager permissions
  MANAGER: {
    CREATE: 'manager:create',
    READ: 'manager:read',
    UPDATE: 'manager:update',
    DELETE: 'manager:delete',
  },

  // Administrator permissions
  ADMINISTRATOR: {
    CREATE: 'administrator:create',
    READ: 'administrator:read',
    UPDATE: 'administrator:update',
    DELETE: 'administrator:delete',
  },

  // Member permissions
  MEMBER: {
    CREATE: 'member:create',
    READ: 'member:read',
    UPDATE: 'member:update',
    DELETE: 'member:delete',
    EXPORT: 'member:export',
    UPLOAD_DOCUMENT: 'member:upload-document',
  },

  // Branch permissions
  BRANCH: {
    CREATE: 'branch:create',
    READ: 'branch:read',
    UPDATE: 'branch:update',
    DELETE: 'branch:delete',
    ASSIGN: 'branch:assign-user',
  },

  // Account permissions
  ACCOUNT: {
    CREATE: 'account:create',
    READ: 'account:read',
    UPDATE: 'account:update',
    DELETE: 'account:delete',
  },

  // Account Type permissions
  ACCOUNT_TYPE: {
    CREATE: 'account-type:create',
    READ: 'account-type:read',
    UPDATE: 'account-type:update',
    DELETE: 'account-type:delete',
  },

  // Share permissions
  SHARE: {
    CREATE: 'share:create',
    READ: 'share:read',
    UPDATE: 'share:update',
    DELETE: 'share:delete',
    BUY: 'share:buy',
    APPROVE: 'share:approve',
  },

  // Loan permissions
  LOAN: {
    CREATE: 'loan:create',
    READ: 'loan:read',
    UPDATE: 'loan:update',
    DELETE: 'loan:delete',
    APPROVE: 'loan:approve',
    REJECT: 'loan:reject',
    DISBURSE: 'loan:disburse',
    EXPORT: 'loan:export',
    RESTRUCTURE: 'loan:restructure',
    WRITE_OFF: 'loan:write-off',
  },

  // Payment permissions
  PAYMENT: {
    CREATE: 'payment:create',
    READ: 'payment:read',
    UPDATE: 'payment:update',
    DELETE: 'payment:delete',
    APPROVE: 'payment:approve',
    REVERSE: 'payment:reverse',
    EXPORT: 'payment:export',
    REFUND: 'payment:refund',
  },

  // User permissions
  USER: {
    CREATE: 'user:create',
    READ: 'user:read',
    UPDATE: 'user:update',
    DELETE: 'user:delete',
    ACTIVATE: 'user:activate',
    DEACTIVATE: 'user:deactivate',
    ASSIGN_ROLE: 'user:assign-role',
    REVOKE_ROLE: 'user:revoke-role',
    MANAGE_ACCESS: 'user:manage-access',
  },

  // Agent permissions
  AGENT: {
    CREATE: 'agent:create',
    READ: 'agent:read',
    UPDATE: 'agent:update',
    DELETE: 'agent:delete',
  },

  // Saving Contract permissions
  SAVING_CONTRACT: {
    CREATE: 'saving-contract:create',
    READ: 'saving-contract:read',
    UPDATE: 'saving-contract:update',
    DELETE: 'saving-contract:delete',
    CLOSE: 'saving-contract:close',
    FREEZE: 'saving-contract:freeze',
  },

  // Approval Workflow permissions (note: API uses underscores in the slug)
  APPROVAL_WORKFLOW: {
    CREATE: 'approval_workflow:create',
    READ: 'approval_workflow:read',
    UPDATE: 'approval_workflow:update',
    DELETE: 'approval_workflow:delete',
    APPROVE: 'approval_workflow:approve',
    REJECT: 'approval_workflow:reject',
    MANAGE: 'approval_workflow:manage',
  },

  // Product Configuration permissions
  PRODUCT_CONFIGURATION: {
    CREATE: 'product-configuration:create',
    READ: 'product-configuration:read',
    UPDATE: 'product-configuration:update',
    DELETE: 'product-configuration:delete',
  },

  // Product Template permissions
  PRODUCT_TEMPLATE: {
    READ: 'product-template:read',
  },

  // Settings permissions (granular; distinct from SYSTEM.MANAGE_SETTINGS)
  SETTINGS: {
    READ: 'settings:read',
    UPDATE: 'settings:update',
  },

  // Account Journal permissions
  ACCOUNT_JOURNAL: {
    READ: 'account-journal:read',
  },

  // Access control / RBAC permissions
  ACCESS_CONTROL: {
    RBAC_MANAGE: 'rbac:manage',
    USER_ACCESS_MANAGE: 'user:manage-access',
  },

  // Member Registration permissions
  MEMBER_REGISTRATION: {
    CREATE: 'member-registration:create',
    READ: 'member-registration:read',
    UPDATE: 'member-registration:update',
    DELETE: 'member-registration:delete',
    APPROVE: 'member-registration:approve',
    REJECT: 'member-registration:reject',
  },

  // Report permissions
  REPORT: {
    GENERATE: 'report:generate',
    EXPORT: 'report:export',
    READ: 'report:read',
  },

  // Audit log permissions
  AUDIT_LOG: {
    READ: 'audit_log:read',
    EXPORT: 'audit_log:export',
  },

  // System permissions
  // NOTE: the backend has no standalone `audit` or `manage:settings` slugs;
  // these map to the closest real permissions (audit_log:read / settings:update).
  SYSTEM: {
    GENERATE_REPORT: 'report:generate',
    AUDIT: 'audit_log:read',
    MANAGE_SETTINGS: 'settings:update',
  },
} as const;

// Type for permission values
export type Permission = typeof Permissions[keyof typeof Permissions][keyof typeof Permissions[keyof typeof Permissions]];
// Or a more specific type:
export type PermissionSlug = typeof Permissions[keyof typeof Permissions][keyof typeof Permissions[keyof typeof Permissions]];

// Array of all permissions (useful for select inputs, etc.)
export const ALL_PERMISSIONS = Object.values(Permissions).reduce((acc, category) => {
  return [...acc, ...Object.values(category)];
}, [] as string[]);

// Grouped by category (useful for UI organization)
export const PERMISSIONS_BY_CATEGORY = {
  'Role Management': [
    Permissions.ROLE.CREATE,
    Permissions.ROLE.READ,
    Permissions.ROLE.UPDATE,
    Permissions.ROLE.DELETE,
  ],
  'Permission Management': [
    Permissions.PERMISSION.CREATE,
    Permissions.PERMISSION.READ,
    Permissions.PERMISSION.UPDATE,
    Permissions.PERMISSION.DELETE,
  ],
  'Employee Management': [
    Permissions.EMPLOYEE.CREATE,
    Permissions.EMPLOYEE.READ,
    Permissions.EMPLOYEE.UPDATE,
    Permissions.EMPLOYEE.DELETE,
  ],
  'Manager Management': [
    Permissions.MANAGER.CREATE,
    Permissions.MANAGER.READ,
    Permissions.MANAGER.UPDATE,
    Permissions.MANAGER.DELETE,
  ],
  'Administrator Management': [
    Permissions.ADMINISTRATOR.CREATE,
    Permissions.ADMINISTRATOR.READ,
    Permissions.ADMINISTRATOR.UPDATE,
    Permissions.ADMINISTRATOR.DELETE,
  ],
  'Member Management': [
    Permissions.MEMBER.CREATE,
    Permissions.MEMBER.READ,
    Permissions.MEMBER.UPDATE,
    Permissions.MEMBER.DELETE,
  ],
  'Branch Management': [
    Permissions.BRANCH.CREATE,
    Permissions.BRANCH.READ,
    Permissions.BRANCH.UPDATE,
    Permissions.BRANCH.DELETE,
    Permissions.BRANCH.ASSIGN,
  ],
  'Account Management': [
    Permissions.ACCOUNT.CREATE,
    Permissions.ACCOUNT.READ,
    Permissions.ACCOUNT.UPDATE,
    Permissions.ACCOUNT.DELETE,
  ],
  'Account Type Management': [
    Permissions.ACCOUNT_TYPE.CREATE,
    Permissions.ACCOUNT_TYPE.READ,
    Permissions.ACCOUNT_TYPE.UPDATE,
    Permissions.ACCOUNT_TYPE.DELETE,
  ],
  'Share Management': [
    Permissions.SHARE.CREATE,
    Permissions.SHARE.READ,
    Permissions.SHARE.UPDATE,
    Permissions.SHARE.DELETE,
    Permissions.SHARE.BUY,
  ],
  'Finance Management': [
    Permissions.LOAN.CREATE,
    Permissions.LOAN.READ,
    Permissions.LOAN.UPDATE,
    Permissions.LOAN.DELETE,
    Permissions.LOAN.APPROVE,
    Permissions.LOAN.REJECT,
    Permissions.LOAN.DISBURSE,
  ],
  'Payment Management': [
    Permissions.PAYMENT.CREATE,
    Permissions.PAYMENT.READ,
    Permissions.PAYMENT.UPDATE,
    Permissions.PAYMENT.DELETE,
    Permissions.PAYMENT.APPROVE,
    Permissions.PAYMENT.REVERSE,
  ],
  'User Management': [
    Permissions.USER.CREATE,
    Permissions.USER.READ,
    Permissions.USER.UPDATE,
    Permissions.USER.DELETE,
  ],
  'Agent Management': [
    Permissions.AGENT.CREATE,
    Permissions.AGENT.READ,
    Permissions.AGENT.UPDATE,
    Permissions.AGENT.DELETE,
  ],
  'Saving Contract Management': [
    Permissions.SAVING_CONTRACT.CREATE,
    Permissions.SAVING_CONTRACT.READ,
    Permissions.SAVING_CONTRACT.UPDATE,
    Permissions.SAVING_CONTRACT.DELETE,
  ],
  'Approval Workflow Management': [
    Permissions.APPROVAL_WORKFLOW.CREATE,
    Permissions.APPROVAL_WORKFLOW.READ,
    Permissions.APPROVAL_WORKFLOW.UPDATE,
    Permissions.APPROVAL_WORKFLOW.DELETE,
    Permissions.APPROVAL_WORKFLOW.APPROVE,
    Permissions.APPROVAL_WORKFLOW.REJECT,
    Permissions.APPROVAL_WORKFLOW.MANAGE,
  ],
  'Product Configuration': [
    Permissions.PRODUCT_CONFIGURATION.CREATE,
    Permissions.PRODUCT_CONFIGURATION.READ,
    Permissions.PRODUCT_CONFIGURATION.UPDATE,
    Permissions.PRODUCT_CONFIGURATION.DELETE,
    Permissions.PRODUCT_TEMPLATE.READ,
  ],
  'Member Registration Management': [
    Permissions.MEMBER_REGISTRATION.CREATE,
    Permissions.MEMBER_REGISTRATION.READ,
    Permissions.MEMBER_REGISTRATION.UPDATE,
    Permissions.MEMBER_REGISTRATION.DELETE,
    Permissions.MEMBER_REGISTRATION.APPROVE,
    Permissions.MEMBER_REGISTRATION.REJECT,
  ],
  'System': [
    Permissions.SYSTEM.GENERATE_REPORT,
    Permissions.SYSTEM.AUDIT,
    Permissions.SYSTEM.MANAGE_SETTINGS,
    Permissions.SETTINGS.READ,
    Permissions.SETTINGS.UPDATE,
    Permissions.ACCOUNT_JOURNAL.READ,
    Permissions.ACCESS_CONTROL.RBAC_MANAGE,
    Permissions.ACCESS_CONTROL.USER_ACCESS_MANAGE,
  ],
};


import { Users, Wallet, CreditCard, Building2, Settings, Shield, UserCog, Landmark, Receipt, ScrollText, UserPlus, UserCheck, FileSignature, GitPullRequestArrow, SlidersHorizontal } from "lucide-react";


interface Permission2 {
  id: string;
  title: string;
  description: string;
  slug: string;
}

interface Category {
  id: string;
  title: string;
  icon: React.ElementType;
  permissions: Permission2[];
}

export const PERMISSION_DATA: Category[] = [
  {
    id: "member_management",
    title: "Member Management",
    icon: Users,
    permissions: [
      {
        id: "create_member",
        slug: "member:create",
        title: "Create Members",
        description: "Create new member entries",
      },
      {
        id: "read_member",
        slug: "member:read",
        title: "View Members",
        description: "Access to member directory",
      },
      {
        id: "update_member",
        slug: "member:update",
        title: "Edit Members",
        description: "Modify member personal info",
      },
      {
        id: "delete_member",
        slug: "member:delete",
        title: "Delete Members",
        description: "Remove member entries",
      },
      {
        id: "export_member",
        slug: "member:export",
        title: "Export Members",
        description: "Export member data",
      },
      {
        id: "upload_member_document",
        slug: "member:upload-document",
        title: "Upload Member Documents",
        description: "Attach documents to a member",
      },
    ],
  },
  {
    id: "employee_management",
    title: "Employee Management",
    icon: UserCog,
    permissions: [
      {
        id: "create_employee",
        slug: "employee:create",
        title: "Create Employees",
        description: "Add new employees",
      },
      {
        id: "read_employee",
        slug: "employee:read",
        title: "View Employees",
        description: "Access employee directory",
      },
      {
        id: "update_employee",
        slug: "employee:update",
        title: "Edit Employees",
        description: "Modify employee information",
      },
      {
        id: "delete_employee",
        slug: "employee:delete",
        title: "Delete Employees",
        description: "Remove employee entries",
      },
    ],
  },
  {
    id: "manager_management",
    title: "Manager Management",
    icon: Shield,
    permissions: [
      {
        id: "create_manager",
        slug: "manager:create",
        title: "Create Managers",
        description: "Add new managers",
      },
      {
        id: "read_manager",
        slug: "manager:read",
        title: "View Managers",
        description: "Access manager directory",
      },
      {
        id: "update_manager",
        slug: "manager:update",
        title: "Edit Managers",
        description: "Modify manager information",
      },
      {
        id: "delete_manager",
        slug: "manager:delete",
        title: "Delete Managers",
        description: "Remove manager entries",
      },
    ],
  },
  {
    id: "administrator_management",
    title: "Administrator Management",
    icon: Settings,
    permissions: [
      {
        id: "create_administrator",
        slug: "administrator:create",
        title: "Create Administrators",
        description: "Add new administrators",
      },
      {
        id: "read_administrator",
        slug: "administrator:read",
        title: "View Administrators",
        description: "Access administrator directory",
      },
      {
        id: "update_administrator",
        slug: "administrator:update",
        title: "Edit Administrators",
        description: "Modify administrator information",
      },
      {
        id: "delete_administrator",
        slug: "administrator:delete",
        title: "Delete Administrators",
        description: "Remove administrator entries",
      },
    ],
  },
  {
    id: "branch_management",
    title: "Branch Management",
    icon: Building2,
    permissions: [
      {
        id: "create_branch",
        slug: "branch:create",
        title: "Create Branches",
        description: "Add new branches",
      },
      {
        id: "read_branch",
        slug: "branch:read",
        title: "View Branches",
        description: "Access branch directory",
      },
      {
        id: "update_branch",
        slug: "branch:update",
        title: "Edit Branches",
        description: "Modify branch information",
      },
      {
        id: "delete_branch",
        slug: "branch:delete",
        title: "Delete Branches",
        description: "Remove branch entries",
      },
      {
        id: "assign_branch",
        slug: "branch:assign-user",
        title: "Assign Branches",
        description: "Assign users to branches",
      },
    ],
  },
  {
    id: "account_management",
    title: "Account Management",
    icon: Landmark,
    permissions: [
      {
        id: "create_account",
        slug: "account:create",
        title: "Create Accounts",
        description: "Open new accounts",
      },
      {
        id: "read_account",
        slug: "account:read",
        title: "View Accounts",
        description: "Access account details",
      },
      {
        id: "update_account",
        slug: "account:update",
        title: "Update Accounts",
        description: "Modify account information",
      },
      {
        id: "delete_account",
        slug: "account:delete",
        title: "Close Accounts",
        description: "Close or remove accounts",
      },
    ],
  },
  {
    id: "account_type_management",
    title: "Account Type Management",
    icon: Landmark,
    permissions: [
      {
        id: "create_account_type",
        slug: "account-type:create",
        title: "Create Account Types",
        description: "Add new account types",
      },
      {
        id: "read_account_type",
        slug: "account-type:read",
        title: "View Account Types",
        description: "Access account type definitions",
      },
      {
        id: "update_account_type",
        slug: "account-type:update",
        title: "Update Account Types",
        description: "Modify account type definitions",
      },
      {
        id: "delete_account_type",
        slug: "account-type:delete",
        title: "Delete Account Types",
        description: "Remove account type definitions",
      },
    ],
  },
  {
    id: "savings_shares",
    title: "Savings & Shares",
    icon: Wallet,
    permissions: [
      {
        id: "create_share",
        slug: "share:create",
        title: "Create Shares",
        description: "Issue new shares",
      },
      {
        id: "read_share",
        slug: "share:read",
        title: "View Shares",
        description: "Access share information",
      },
      {
        id: "update_share",
        slug: "share:update",
        title: "Update Shares",
        description: "Modify share details",
      },
      {
        id: "delete_share",
        slug: "share:delete",
        title: "Delete Shares",
        description: "Remove or redeem shares",
      },
      {
        id: "buy_share",
        slug: "share:buy",
        title: "Buy Shares",
        description: "Purchase shares on behalf of members",
      },
      {
        id: "approve_share",
        slug: "share:approve",
        title: "Approve Shares",
        description: "Approve pending share purchases",
      },
    ],
  },
  {
    id: "loan_management",
    title: "Finance Management",
    icon: CreditCard,
    permissions: [
      {
        id: "create_loan",
        slug: "loan:create",
        title: "Create Finances",
        description: "Originate new finances",
      },
      {
        id: "read_loan",
        slug: "loan:read",
        title: "View Finances",
        description: "Access finance information",
      },
      {
        id: "update_loan",
        slug: "loan:update",
        title: "Update Finances",
        description: "Modify finance details",
      },
      {
        id: "delete_loan",
        slug: "loan:delete",
        title: "Delete Finances",
        description: "Remove finance records",
      },
      {
        id: "approve_loan",
        slug: "loan:approve",
        title: "Approve Finances",
        description: "Approve pending finance applications",
      },
      {
        id: "reject_loan",
        slug: "loan:reject",
        title: "Reject Finances",
        description: "Reject finance applications",
      },
      {
        id: "disburse_loan",
        slug: "loan:disburse",
        title: "Disburse Finances",
        description: "Release approved finance funds",
      },
      {
        id: "export_loan",
        slug: "loan:export",
        title: "Export Finances",
        description: "Export finance data",
      },
      {
        id: "restructure_loan",
        slug: "loan:restructure",
        title: "Restructure Finances",
        description: "Restructure existing finances",
      },
      {
        id: "write_off_loan",
        slug: "loan:write-off",
        title: "Write Off Finances",
        description: "Write off outstanding finances",
      },
    ],
  },
  {
    id: "payment_management",
    title: "Payment Management",
    icon: Receipt,
    permissions: [
      {
        id: "create_payment",
        slug: "payment:create",
        title: "Create Payments",
        description: "Process new payments",
      },
      {
        id: "read_payment",
        slug: "payment:read",
        title: "View Payments",
        description: "Access payment history",
      },
      {
        id: "update_payment",
        slug: "payment:update",
        title: "Update Payments",
        description: "Modify payment records",
      },
      {
        id: "delete_payment",
        slug: "payment:delete",
        title: "Delete Payments",
        description: "Remove payment entries",
      },
      {
        id: "approve_payment",
        slug: "payment:approve",
        title: "Approve Payments",
        description: "Approve pending payments",
      },
      {
        id: "reverse_payment",
        slug: "payment:reverse",
        title: "Reverse Payments",
        description: "Reverse or roll back a payment",
      },
      {
        id: "export_payment",
        slug: "payment:export",
        title: "Export Payments",
        description: "Export payment data",
      },
      {
        id: "refund_payment",
        slug: "payment:refund",
        title: "Refund Payments",
        description: "Issue a payment refund",
      },
    ],
  },
  {
    id: "member_registration",
    title: "Member Registration",
    icon: UserPlus,
    permissions: [
      {
        id: "create_member_registration",
        slug: "member-registration:create",
        title: "Create Registrations",
        description: "Submit new member registration requests",
      },
      {
        id: "read_member_registration",
        slug: "member-registration:read",
        title: "View Registrations",
        description: "Access registration requests",
      },
      {
        id: "update_member_registration",
        slug: "member-registration:update",
        title: "Edit Registrations",
        description: "Modify registration details",
      },
      {
        id: "delete_member_registration",
        slug: "member-registration:delete",
        title: "Delete Registrations",
        description: "Remove registration entries",
      },
      {
        id: "approve_member_registration",
        slug: "member-registration:approve",
        title: "Approve Registrations",
        description: "Approve pending member registrations",
      },
      {
        id: "reject_member_registration",
        slug: "member-registration:reject",
        title: "Reject Registrations",
        description: "Reject member registration requests",
      },
    ],
  },
  {
    id: "role_management",
    title: "Role Management",
    icon: ScrollText,
    permissions: [
      {
        id: "create_role",
        slug: "role:create",
        title: "Create Roles",
        description: "Add new roles",
      },
      {
        id: "read_role",
        slug: "role:read",
        title: "View Roles",
        description: "Access role directory",
      },
      {
        id: "update_role",
        slug: "role:update",
        title: "Edit Roles",
        description: "Modify role permissions",
      },
      {
        id: "delete_role",
        slug: "role:delete",
        title: "Delete Roles",
        description: "Remove roles",
      },
    ],
  },
  {
    id: "permission_management",
    title: "Permission Management",
    icon: Shield,
    permissions: [
      {
        id: "create_permission",
        slug: "permission:create",
        title: "Create Permissions",
        description: "Add new permissions",
      },
      {
        id: "read_permission",
        slug: "permission:read",
        title: "View Permissions",
        description: "Access permission list",
      },
      {
        id: "update_permission",
        slug: "permission:update",
        title: "Edit Permissions",
        description: "Modify permissions",
      },
      {
        id: "delete_permission",
        slug: "permission:delete",
        title: "Delete Permissions",
        description: "Remove permissions",
      },
    ],
  },
  {
    id: "user_management",
    title: "User Management",
    icon: Users,
    permissions: [
      {
        id: "create_user",
        slug: "user:create",
        title: "Create Users",
        description: "Add new system users",
      },
      {
        id: "read_user",
        slug: "user:read",
        title: "View Users",
        description: "Access the user directory",
      },
      {
        id: "update_user",
        slug: "user:update",
        title: "Edit Users",
        description: "Modify user information",
      },
      {
        id: "delete_user",
        slug: "user:delete",
        title: "Delete Users",
        description: "Remove user accounts",
      },
      {
        id: "activate_user",
        slug: "user:activate",
        title: "Activate Users",
        description: "Activate user accounts",
      },
      {
        id: "deactivate_user",
        slug: "user:deactivate",
        title: "Deactivate Users",
        description: "Deactivate user accounts",
      },
      {
        id: "assign_user_role",
        slug: "user:assign-role",
        title: "Assign User Roles",
        description: "Assign roles to users",
      },
      {
        id: "revoke_user_role",
        slug: "user:revoke-role",
        title: "Revoke User Roles",
        description: "Revoke roles from users",
      },
    ],
  },
  {
    id: "agent_management",
    title: "Agent Management",
    icon: UserCheck,
    permissions: [
      {
        id: "create_agent",
        slug: "agent:create",
        title: "Create Agents",
        description: "Register new field agents",
      },
      {
        id: "read_agent",
        slug: "agent:read",
        title: "View Agents",
        description: "Access the agent directory",
      },
      {
        id: "update_agent",
        slug: "agent:update",
        title: "Edit Agents",
        description: "Modify agent information",
      },
      {
        id: "delete_agent",
        slug: "agent:delete",
        title: "Delete Agents",
        description: "Remove agent records",
      },
    ],
  },
  {
    id: "saving_contract_management",
    title: "Saving Contract Management",
    icon: FileSignature,
    permissions: [
      {
        id: "create_saving_contract",
        slug: "saving-contract:create",
        title: "Create Saving Contracts",
        description: "Originate new saving contracts",
      },
      {
        id: "read_saving_contract",
        slug: "saving-contract:read",
        title: "View Saving Contracts",
        description: "Access saving contract information",
      },
      {
        id: "update_saving_contract",
        slug: "saving-contract:update",
        title: "Update Saving Contracts",
        description: "Modify saving contract details",
      },
      {
        id: "delete_saving_contract",
        slug: "saving-contract:delete",
        title: "Delete Saving Contracts",
        description: "Remove saving contract records",
      },
      {
        id: "close_saving_contract",
        slug: "saving-contract:close",
        title: "Close Saving Contracts",
        description: "Close active saving contracts",
      },
      {
        id: "freeze_saving_contract",
        slug: "saving-contract:freeze",
        title: "Freeze Saving Contracts",
        description: "Freeze or suspend saving contracts",
      },
    ],
  },
  {
    id: "approval_workflow_management",
    title: "Approval Workflow Management",
    icon: GitPullRequestArrow,
    permissions: [
      {
        id: "create_approval_workflow",
        slug: "approval_workflow:create",
        title: "Create Workflows",
        description: "Submit items into approval workflows",
      },
      {
        id: "read_approval_workflow",
        slug: "approval_workflow:read",
        title: "View Workflows",
        description: "Access approval workflow status",
      },
      {
        id: "update_approval_workflow",
        slug: "approval_workflow:update",
        title: "Update Workflows",
        description: "Modify approval workflow details",
      },
      {
        id: "delete_approval_workflow",
        slug: "approval_workflow:delete",
        title: "Delete Workflows",
        description: "Remove approval workflow entries",
      },
      {
        id: "approve_approval_workflow",
        slug: "approval_workflow:approve",
        title: "Approve Workflow Steps",
        description: "Approve pending workflow steps",
      },
      {
        id: "reject_approval_workflow",
        slug: "approval_workflow:reject",
        title: "Reject Workflow Steps",
        description: "Reject pending workflow steps",
      },
      {
        id: "manage_approval_workflow",
        slug: "approval_workflow:manage",
        title: "Manage Workflows",
        description: "Configure approval workflow templates",
      },
    ],
  },
  {
    id: "product_configuration",
    title: "Product Configuration",
    icon: SlidersHorizontal,
    permissions: [
      {
        id: "create_product_configuration",
        slug: "product-configuration:create",
        title: "Create Product Config",
        description: "Add new product configurations",
      },
      {
        id: "read_product_configuration",
        slug: "product-configuration:read",
        title: "View Product Config",
        description: "Access product configurations",
      },
      {
        id: "update_product_configuration",
        slug: "product-configuration:update",
        title: "Update Product Config",
        description: "Modify product configurations",
      },
      {
        id: "delete_product_configuration",
        slug: "product-configuration:delete",
        title: "Delete Product Config",
        description: "Remove product configurations",
      },
      {
        id: "read_product_template",
        slug: "product-template:read",
        title: "View Product Templates",
        description: "Access product templates",
      },
    ],
  },
  {
    id: "system",
    title: "System",
    icon: Settings,
    permissions: [
      {
        id: "generate_report",
        slug: "report:generate",
        title: "Generate Reports",
        description: "Create system reports",
      },
      {
        id: "export_report",
        slug: "report:export",
        title: "Export Reports",
        description: "Export generated reports",
      },
      {
        id: "read_report",
        slug: "report:read",
        title: "View Reports",
        description: "Access generated reports",
      },
      {
        id: "audit",
        slug: "audit_log:read",
        title: "Audit Logs",
        description: "Access audit trail",
      },
      {
        id: "export_audit_log",
        slug: "audit_log:export",
        title: "Export Audit Logs",
        description: "Export audit trail entries",
      },
      {
        id: "read_settings",
        slug: "settings:read",
        title: "View Settings",
        description: "View application settings",
      },
      {
        id: "update_settings",
        slug: "settings:update",
        title: "Update Settings",
        description: "Modify application settings",
      },
      {
        id: "read_account_journal",
        slug: "account-journal:read",
        title: "View Account Journal",
        description: "Access account journal / ledger entries",
      },
      {
        id: "rbac_manage",
        slug: "rbac:manage",
        title: "Manage RBAC",
        description: "Manage roles and permission assignments",
      },
      {
        id: "user_access_manage",
        slug: "user:manage-access",
        title: "Manage User Access",
        description: "Control user access across the system",
      },
    ],
  },
];
