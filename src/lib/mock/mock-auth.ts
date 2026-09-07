import type { User, Role } from "@/lib/auth/auth-store";
import { EKUB_PERMS } from "@/lib/auth/ekub-permissions";

const ALL_PERMS = Object.values(EKUB_PERMS);

// Agents are field staff — for the admin console they only ever get read
// access to a couple of surfaces. They never hold approve / execute / payout
// slugs, which is how segregation of duties (NFR-4, FR-7.4) shows up in the UI.
const AGENT_PERMS = [EKUB_PERMS.PAYMENT_READ, EKUB_PERMS.APPLICATION_READ];

function role(name: string, slug: string): Role {
  return {
    id: `role-${slug}`,
    name,
    slug,
    created_at: new Date(0).toISOString(),
    updated_at: new Date(0).toISOString(),
    permissions: null,
  };
}

function baseUser(over: Partial<User>): User {
  return {
    id: "u-0",
    full_name: "",
    first_name: "",
    last_name: "",
    email: "",
    branch_id: "hq",
    branch: null,
    roles: [],
    phone_number: "+251900000000",
    gender: "male",
    status: true,
    totp_enabled: false,
    ...over,
  };
}

export type MockRoleKey = "admin" | "agent";

export const MOCK_USERS: Record<MockRoleKey, { user: User; permissions: string[] }> = {
  admin: {
    user: baseUser({
      id: "u-admin",
      full_name: "Aisha Mohammed",
      first_name: "Aisha",
      last_name: "Mohammed",
      email: "admin@emadekub.com",
      roles: [role("Administrator", "admin")],
      job_title: "Operations Admin",
    }),
    permissions: ALL_PERMS,
  },
  agent: {
    user: baseUser({
      id: "u-agent",
      full_name: "Yusuf Kedir",
      first_name: "Yusuf",
      last_name: "Kedir",
      email: "agent@emadekub.com",
      roles: [role("Agent", "agent")],
      job_title: "Field Agent",
    }),
    permissions: AGENT_PERMS,
  },
};
