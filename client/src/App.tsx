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
      <nav className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
        <span className="font-semibold text-gray-900">Helpdesk</span>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-600">{session?.user.name}</span>
          <button
            onClick={handleSignOut}
            className="text-sm px-3 py-1.5 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors cursor-pointer"
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
