import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useNavigate } from "react-router";
import { authClient } from "../lib/auth-client";

const schema = z.object({
  email: z.email("Invalid email"),
  password: z.string().min(1, "Password is required"),
});

type FormValues = z.infer<typeof schema>;

export function LoginPage() {
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  async function onSubmit(values: FormValues) {
    const { error } = await authClient.signIn.email(values);
    if (error) {
      setError("root", { message: error.message ?? "Invalid credentials" });
    } else {
      navigate("/");
    }
  }

  return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh", background: "#f9fafb" }}>
      <div style={{ background: "white", padding: "2rem", borderRadius: "8px", width: "360px", boxShadow: "0 1px 4px rgba(0,0,0,0.1)" }}>
        <h1 style={{ margin: "0 0 1.5rem", fontSize: "1.25rem", fontWeight: 600 }}>Helpdesk — Sign in</h1>
        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <div style={{ marginBottom: "1rem" }}>
            <label style={{ display: "block", marginBottom: "0.25rem", fontSize: "0.875rem", fontWeight: 500 }}>
              Email
            </label>
            <input
              type="email"
              autoFocus
              {...register("email")}
              style={{ width: "100%", padding: "0.5rem 0.75rem", border: `1px solid ${errors.email ? "#dc2626" : "#d1d5db"}`, borderRadius: "6px", fontSize: "0.875rem", boxSizing: "border-box" }}
            />
            {errors.email && <p style={{ color: "#dc2626", fontSize: "0.8rem", margin: "0.25rem 0 0" }}>{errors.email.message}</p>}
          </div>
          <div style={{ marginBottom: "1.25rem" }}>
            <label style={{ display: "block", marginBottom: "0.25rem", fontSize: "0.875rem", fontWeight: 500 }}>
              Password
            </label>
            <input
              type="password"
              {...register("password")}
              style={{ width: "100%", padding: "0.5rem 0.75rem", border: `1px solid ${errors.password ? "#dc2626" : "#d1d5db"}`, borderRadius: "6px", fontSize: "0.875rem", boxSizing: "border-box" }}
            />
            {errors.password && <p style={{ color: "#dc2626", fontSize: "0.8rem", margin: "0.25rem 0 0" }}>{errors.password.message}</p>}
          </div>
          {errors.root && (
            <p style={{ color: "#dc2626", fontSize: "0.875rem", margin: "0 0 1rem" }}>{errors.root.message}</p>
          )}
          <button
            type="submit"
            disabled={isSubmitting}
            style={{ width: "100%", padding: "0.625rem", background: "#2563eb", color: "white", border: "none", borderRadius: "6px", fontSize: "0.875rem", fontWeight: 500, cursor: isSubmitting ? "not-allowed" : "pointer", opacity: isSubmitting ? 0.7 : 1 }}
          >
            {isSubmitting ? "Signing in..." : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
