export const API_ENDPOINTS = {
    AUTH: {
        LOGIN: "/auth/login",
        PROFILE: "/auth/profile",
        REGISTER: "/auth/register",
        LOGIN_MEMBER: "/auth/login-member",
        LOGIN_TOTP: "/auth/login-totp",
        REFRESH: "/auth/refresh/",
        LOGOUT: "/auth/logout",
        CHANGE_PASSWORD: "/auth/change-password",
        FORGOT_PASSWORD: "/auth/forgot-password",
        RESET_PASSWORD: "/auth/reset-password",
        ENABLE_TOTP: (userId: string) => `/auth/enable-totp/${userId}`,
        DISABLE_TOTP: (userId: string) => `/auth/disable-totp/${userId}`,
    },
    ME: "/me",
    ROLES: {
        LIST: "/user-roles",
        CREATE: "/user-roles",
        ASSIGN_PERMISSIONS: "/user-roles/assign-permissions",
        REVOKE_ROLE_PERMISSION: "/user-roles/revoke-role-permission",
        REVOKE_USER_ROLE: "/user-roles/revoke-user-role",
        ROLE_PERMISSIONS: (id: string) => `/user-roles/${id}/permissions`,
        DELETE: (slug: string) => `/user-roles/${slug}`,
    },
    PERMISSIONS: {
        LIST: "/user-permissions/all",
        CREATE: "/user-permissions",
        DELETE: (slug: string) => `/user-permissions/${slug}`,
    },
    BRANCHES: {
        LIST: "/branches",
        WITH_MANAGERS: "/branches/with-managers",
        DETAIL: (id: string) => `/branches/${id}`,
        CREATE: "/branches",
        UPDATE: (id: string) => `/branches/${id}`,
        DELETE: (id: string) => `/branches/${id}`,
        ASSIGN_MANAGER: (id: string) => `/branches/${id}/assign-manager`,
    },
    USERS: {
        LIST: "/users",
        DETAIL: (id: string) => `/users/${id}`,
        CREATE: "/users",
        UPDATE: (id: string) => `/users/${id}`,
        DELETE: (id: string) => `/users/${id}`,
        BY_BRANCH: (branchId: string) => `/users/branches/${branchId}`,
        BY_ROLE: (roleId: string) => `/users/roles/${roleId}`,
        BY_ID: (userId: string) => `/users/${userId}`,
        BY_PERMISSION: (permissionId: string) => `/users/permissions/${permissionId}`,
        BY_ROLE_ID: (roleId: string) => `/users/roles/${roleId}`,
        BY_ROLE_SLUG: (roleSlug: string) => `/users/roles-slug/${roleSlug}`,
    },
    AGENTS: {
        LIST: "/agents",
        CREATE: "/agents",
        CREATE_FROM_MEMBER: "/agents/from-member",
        DETAIL: (id: string) => `/agents/${id}`,
        UPDATE: (id: string) => `/agents/${id}`,
        DELETE: (id: string) => `/agents/${id}`,
        // Commission summary (totals) and the paginated per-commission list.
        COMMISSION_SUMMARY: (id: string) => `/agents/${id}/commission`,
        COMMISSIONS: (id: string) => `/agents/${id}/commissions`,
        PAY_COMMISSION: (id: string, commissionId: string) =>
            `/agents/${id}/commissions/${commissionId}/pay`,
        // Paginated list of members registered by this agent.
        MEMBERS: (id: string) => `/agents/${id}/members`,
    },
    MEMBERS: {
        LIST: "/members",
        // Members who have not fully paid regular savings, with live
        // outstanding + deadline-passed overdue amounts per member.
        REGULAR_SAVING_DELINQUENT: "/members/regular-saving-delinquent",
        // Organization/institution members (org data lives in the member's Meta;
        // the legal representative's phone/email map to top-level contact fields).
        ORGANIZATIONS: "/members/organization",
        ORGANIZATION_DETAIL: (id: string) => `/members/organization/${id}`,
        CREATE: "/members",
        DETAIL: (id: string) => `/members/${id}`,
        UPDATE: (id: string) => `/members/${id}`,
        DELETE: (id: string) => `/members/${id}`,
        UPDATE_STATUS: (type: string, id: string) =>
            `/members/${type}/${id}`,
        PROFILE_PHOTO: (id: string) => `/members/${id}/profile-photo`,
        ID_PHOTO: (id: string) => `/members/${id}/id-photo`,
        DEBIT_ACCOUNTS: (id: string) => `/members/${id}/debit-accounts`,
    },
    FILES: {
        UPLOAD: "/files/upload",
    },
    REPORTS: {
        MEMBER_STATS:     "/reports/members/stats",
        SAVINGS_SUMMARY:  "/reports/savings/summary",
        SAVINGS_TRENDS:   "/reports/savings/trends",
        SAVINGS_DORMANT:  "/reports/savings/dormant",
        DORMANT_ACCOUNTS: "/reports/savings/dormant",
        LOAN_PORTFOLIO:   "/reports/loans/portfolio",
        LOAN_PAR:         "/reports/loans/par",
        CASH_DAILY:       "/reports/cash/daily",
        SHARES_CAPITAL:   "/reports/shares/capital",

        // Executive dashboard
        EXEC_SNAPSHOT:          "/reports/executive/snapshot",
        EXEC_DIGITAL_ADOPTION:  "/reports/executive/digital-adoption",

        // Members (extended)
        MEMBER_GROWTH:        "/reports/members/growth",
        MEMBER_DEMOGRAPHICS:  "/reports/members/demographics",
        MEMBER_FUNNEL:        "/reports/members/funnel",
        MEMBER_CHANNELS:      "/reports/members/channel-performance",

        // Loans (extended)
        LOAN_APPROVAL_RATE:        "/reports/loans/approval-rate",
        LOAN_BRANCH_REPAYMENT:     "/reports/loans/branch-repayment",
        LOAN_DURATION_PREFERENCE:  "/reports/loans/duration-preference",
        LOAN_PURPOSE_BREAKDOWN:    "/reports/loans/purpose-breakdown",
        LOAN_REPEAT_RATE:          "/reports/loans/repeat-rate",
        LOAN_SIZE_TREND:           "/reports/loans/size-trend",

        // Payments
        PAYMENT_REVENUE_BY_TYPE:        "/reports/payments/revenue-by-type",
        PAYMENT_CASH_FLOW_TREND:        "/reports/payments/cash-flow-trend",
        PAYMENT_COLLECTION_EFFICIENCY:  "/reports/payments/collection-efficiency",
        PAYMENT_METHOD_TRENDS:          "/reports/payments/method-trends",
        PAYMENT_PEAK_TIMES:             "/reports/payments/peak-times",
        PAYMENT_AVG_VALUES:             "/reports/payments/avg-values",

        // Products
        PRODUCT_PORTFOLIO_MIX:   "/reports/products/portfolio-mix",
        PRODUCT_ADOPTION:        "/reports/products/adoption",
        PRODUCT_BALANCE_GROWTH:  "/reports/products/balance-growth",
        PRODUCT_CROSS_HOLDINGS:  "/reports/products/cross-holdings",

        // Agents
        AGENT_REPORT: (id: string) => `/reports/agents/${id}/report`,
        AGENT_STATS: "/reports/agents/stats",

        // Branches
        BRANCH_KPI:         "/reports/branches/kpi",
        BRANCH_EFFICIENCY:  "/reports/branches/efficiency",
        BRANCH_GROWTH:      "/reports/branches/growth",
        BRANCH_GEOGRAPHIC:  "/reports/branches/geographic",
    },
    MEMBER_PORTAL: {
        LIST: '/member_portal/accounts',
        CREATE: '/member_portal/accounts',
        DETAILS: (id: string) => `/member_portal/accounts/${id}`,
    },

    MEMBER_REGISTRATION_REQUESTS: {
        LIST: "/member-registration-requests",
        CREATE: "/member-registration-requests",
        DETAIL: (id: string) => `/member-registration-requests/${id}`,
        UPDATE: (id: string) => `/member-registration-requests/${id}`,
        DELETE: (id: string) => `/member-registration-requests/${id}`,
        APPROVE: (id: string) => `/member-registration-requests/${id}/approve`,
        REJECT: (id: string) => `/member-registration-requests/${id}/reject`,
        // NOTE: placeholder endpoints — backend SMS-OTP for member registration
        // is not implemented yet. Update paths once the backend exists.
        SEND_OTP: "/member-registration-requests/send-otp",
        VERIFY_OTP: "/member-registration-requests/verify-otp",
    },
    ACCOUNT_TYPES: {
        LIST: "/account-types",
        CREATE: "/account-types",
        DETAIL: (id: string) => `/account-types/${id}`,
        UPDATE: (id: string) => `/account-types/${id}`,
        DELETE: (id: string) => `/account-types/${id}`,
    },

    ACCOUNTS: {
        LIST: "/accounts",
        CREATE: "/accounts",
        DETAIL: (id: string) => `/accounts/${id}`,
        UPDATE: (id: string) => `/accounts/${id}`,
        DELETE: (id: string) => `/accounts/${id}`,
        LEDGER: (accountId: string) => `/accounts/ledger/${accountId}`,
        ACCOUNT_TRANSACTIONS: (accountId: string) => `/accounts/transactions/${accountId}`,
        CALCULATE_INTEREST: "/accounts/calculate-interest",
        UPDATE_STATUS: (id: string) => `/accounts/status/${id}`,
    },

    TRANSACTIONS: {
        LIST: "/transactions",
        DEPOSIT: (accountId: string) => `/transactions/deposit/${accountId}`,
        WITHDRAW: (accountId: string) => `/transactions/withdraw/${accountId}`,
        DETAIL: (id: string) => `/transactions/${id}`,
        INVOICE: (txId: string) => `/transactions/invoice/${txId}`,
        BY_TYPE: (type: string) => `/transactions/type/${type}`,
        STATUS: (accountId: string) => `/transactions/status/${accountId}`,
    },

    APPLICATION_CONFIG: {
        GET: '/application/config',
        UPDATE: '/application/config',
    },
    PAYMENTS: {
        LIST: '/payments',
        CREATE: '/payments',
        MEMBERSHIP_FEE: '/payments/membership-fee',
        REGULAR_SAVING: '/payments/regular-saving',
        PRE_REGULAR_SAVING: '/payments/pre-regular-saving',
        VOLUNTARY_SAVING: '/payments/voluntary-saving',
        SHARE: '/payments/share',
        PRODUCT_GROUP_SUMMARY: '/payments/product-group-summary',
        DETAIL: (id: string) => `/payments/${id}`,
        DELETE: (id: string) => `/payments/${id}`,
        MEMBER: (memberId: string) => `/payments/member/${memberId}`,
        UPDATE_STATUS: (id: string) => `/payments/${id}/status`,
        REVERSE: (id: string) => `/payments/${id}/reverse`,
        ATTACHMENTS: {
            LIST: (paymentId: string) => `/payments/${paymentId}/attachments`,
            UPLOAD: (paymentId: string) => `/payments/${paymentId}/attachments`,
            DELETE: (paymentId: string, attachmentId: string) => `/payments/${paymentId}/attachments/${attachmentId}`,
            DOWNLOAD: (paymentId: string, attachmentId: string) => `/payments/${paymentId}/attachments/${attachmentId}/download`,
        },
    },
    IMPORTS: {
        // Upload an .xlsx to create an async import job (members + payments).
        UPLOAD: '/import/excel',
        LIST: '/import/jobs',
        DETAIL: (id: string) => `/import/jobs/${id}`,
        DELETE: (id: string) => `/import/jobs/${id}`,
        RESET: (id: string) => `/import/jobs/${id}/reset`,
    },
    PRODUCT_TEMPLATE_SYNCS: {
        LIST: '/product-template-syncs',
        DEBIT_ACCOUNTS: '/product-template-syncs/debit-accounts',
        DEBIT_ACCOUNTS_BY_GROUP: '/product-template-syncs/debit-accounts/by-product-group',
        SINGLE: (id: string) => `/product-template-syncs/${id}`,
    },
    FINANCING_PRODUCTS: {
        LIST: "/financing-products",
        DETAIL: (id: string) => `/financing-products/${id}`,
        CREATE: "/financing-products",
        UPDATE: (id: string) => `/financing-products/${id}`,
        DELETE: (id: string) => `/financing-products/${id}`,
    },
    FINANCING_CONTRACTS: {
        LIST: "/financing-contracts",
        DETAIL: (id: string) => `/financing-contracts/${id}`,
        CREATE: "/financing-contracts",
        UPDATE: (id: string) => `/financing-contracts/${id}`,
        DELETE: (id: string) => `/financing-contracts/${id}`,
        SUBMIT: (id: string) => `/financing-contracts/${id}/submit`,
        APPROVE: (id: string) => `/financing-contracts/${id}/approve`,
        REJECT: (id: string) => `/financing-contracts/${id}/reject`,
        ACTIVATE: (id: string) => `/financing-contracts/${id}/activate`,
        CLOSE: (id: string) => `/financing-contracts/${id}/close`,
    },
    FINANCING_PAYMENTS: {
        LIST: "/financing-payments",
        LIST_BY_CONTRACT: (contractId: string) => `/financing-contracts/${contractId}/payments`,
        DETAIL: (id: string) => `/financing-payments/${id}`,
        CREATE: "/financing-payments",
    },

    SAVING_TYPES: {
        LIST: "/saving-types",
        DETAIL: (id: string) => `/saving-types/${id}`,
        CREATE: "/saving-types",
        UPDATE: (id: string) => `/saving-types/${id}`,
        DELETE: (id: string) => `/saving-types/${id}`,
    },

    SAVING_CONTRACTS: {
        LIST:          "/saving-contracts",
        DETAIL:        (id: string) => `/saving-contracts/${id}`,
        CREATE:        "/saving-contracts",
        UPDATE_STATUS: (id: string) => `/saving-contracts/${id}/status`,
        DELETE:        (id: string) => `/saving-contracts/${id}`,
        BY_MEMBER:     (memberId: string) => `/saving-contracts/member/${memberId}`,
        REPAYMENT_SCHEDULE: (id: string) => `/saving-contracts/${id}/repayment-schedule`,
    },

    APPROVAL_TEMPLATES: {
        LIST:   "/approval-templates",
        CREATE: "/approval-templates",
        DETAIL: (id: string) => `/approval-templates/${id}`,
        UPDATE: (id: string) => `/approval-templates/${id}`,
        DELETE: (id: string) => `/approval-templates/${id}`,
    },

    APPROVAL_WORKFLOWS: {
        SUBMIT:    "/approval-workflows",
        APPROVE:   "/approval-workflows/approve",
        REJECT:    "/approval-workflows/reject",
        PENDING:   "/approval-workflows/pending",
        DETAIL:    (id: string) => `/approval-workflows/${id}`,
        BY_OBJECT: (type: string, id: string) => `/approval-workflows/by-object/${type}/${id}`,
    },

    LOANS: {
        LIST:         "/loans",
        APPLY:        "/loans/apply",
        ELIGIBILITY:  "/loans/eligibility-check",
        // Member-level eligibility breakdown (voluntary saving / credit score /
        // saving contract scores + total). Scaffolded path — adjust to backend.
        ELIGIBILITY_SUMMARY: (memberId: string) => `/loans/eligibility/${memberId}`,
        DETAIL:       (id: string) => `/loans/${id}`,
        APPROVE:      (id: string) => `/loans/${id}/approve`,
        REJECT:       (id: string) => `/loans/${id}/reject`,
        DOWN_PAYMENT: (id: string) => `/loans/${id}/down-payment`,
        DISBURSE:     (id: string) => `/loans/${id}/disburse`,
    },

};
