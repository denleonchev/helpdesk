import { authClient } from "@/lib/auth-client";
import { ROLES, type Role } from "@/types/auth";

export function useRoles() {
  const { data: session } = authClient.useSession();
  const role = session?.user.role;

  return {
    isAdmin: role === ROLES.admin,
    isAgent: role === ROLES.agent,
    hasRole: (r: Role) => role === r,
  };
}
