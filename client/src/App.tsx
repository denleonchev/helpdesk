import { Routes, Route, Navigate } from "react-router";
import { LoginPage } from "./pages/LoginPage";
import { HomePage } from "./pages/HomePage";
import { UsersPage } from "./pages/UsersPage";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Layout } from "@/components/Layout";

export default function App() {
  return (
    <Routes>
      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route path="/" element={<HomePage />} />
          <Route element={<ProtectedRoute allowedRoles={["admin"]} />}>
            <Route path="/users" element={<UsersPage />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
      <Route path="/login" element={<LoginPage />} />
    </Routes>
  );
}
