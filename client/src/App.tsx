import { Routes, Route, Navigate, Outlet, useNavigate } from "react-router";
import { authClient } from "./lib/auth-client";
import { LoginPage } from "./pages/LoginPage";
import { HomePage } from "./pages/HomePage";
import { Button } from "@/components/ui/button";
import { ProtectedRoute } from "@/components/ProtectedRoute";

function Layout() {
  const navigate = useNavigate();
  const { data: session } = authClient.useSession();

  async function handleSignOut() {
    await authClient.signOut();
    navigate("/login");
  }

  return (
    <>
      <nav className="bg-background border-b px-6 py-3 flex items-center justify-between">
        <span className="font-semibold">Helpdesk</span>
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground">{session?.user.name}</span>
          <Button variant="outline" size="sm" onClick={handleSignOut}>
            Sign out
          </Button>
        </div>
      </nav>
      <Outlet />
    </>
  );
}

export default function App() {
  return (
    <Routes>
      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route path="/" element={<HomePage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
      <Route path="/login" element={<LoginPage />} />
    </Routes>
  );
}
