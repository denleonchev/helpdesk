export const ROLES = {
  admin: "admin",
  agent: "agent",
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];
