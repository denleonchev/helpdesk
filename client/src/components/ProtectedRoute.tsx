import { Navigate, Outlet } from "react-router";
import { authClient } from "@/lib/auth-client";
import type { Role } from "@/types/auth";

interface Props {
  allowedRoles?: Role[];
}

export function ProtectedRoute({ allowedRoles }: Props) {
  const { data: session, isPending } = authClient.useSession();

  if (isPending) return null;
  if (!session) return <Navigate to="/login" replace />;

  if (allowedRoles && !allowedRoles.includes(session.user.role as Role)) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
