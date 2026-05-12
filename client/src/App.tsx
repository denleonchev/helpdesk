import { Routes, Route, Navigate, Outlet, useNavigate } from "react-router";
import { authClient } from "./lib/auth-client";
import { LoginPage } from "./pages/LoginPage";
import { HomePage } from "./pages/HomePage";

function Layout() {
  const navigate = useNavigate();
  const { data: session } = authClient.useSession();

  async function handleSignOut() {
    await authClient.signOut();
    navigate("/login");
  }

  return (
    <>
      <nav style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.75rem 1.5rem", background: "white", borderBottom: "1px solid #e5e7eb" }}>
        <span style={{ fontWeight: 600, fontSize: "0.9375rem" }}>Helpdesk</span>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <span style={{ fontSize: "0.875rem", color: "#374151" }}>{session?.user.name}</span>
          <button
            onClick={handleSignOut}
            style={{ padding: "0.375rem 0.75rem", background: "transparent", border: "1px solid #d1d5db", borderRadius: "6px", cursor: "pointer", fontSize: "0.875rem" }}
          >
            Sign out
          </button>
        </div>
      </nav>
      <Outlet />
    </>
  );
}

export default function App() {
  const { data: session, isPending } = authClient.useSession();

  if (isPending) return null;

  return (
    <Routes>
      {session ? (
        <Route element={<Layout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Route>
      ) : (
        <>
          <Route path="/login" element={<LoginPage />} />
          <Route path="*" element={<Navigate to="/login" />} />
        </>
      )}
    </Routes>
  );
}
