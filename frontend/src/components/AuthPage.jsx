import { useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";

const inputClass =
  "w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-400/50";

const btnClass =
  "w-full rounded-2xl bg-teal-400 px-4 py-3 font-semibold text-slate-950 transition hover:bg-teal-300 disabled:opacity-50";

export function AuthPage() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function updateField(e) {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (mode === "login") {
        await login({ email: form.email, password: form.password });
      } else {
        await register({ name: form.name, email: form.email, password: form.password });
      }
    } catch (err) {
      const serverMessage = err.response?.data?.message;
      if (serverMessage) {
        setError(serverMessage);
      } else if (err.code === "ERR_NETWORK" || !err.response) {
        setError("Unable to connect to the backend server. Please ensure the backend is running on port 5004.");
      } else {
        setError(err.message || "Something went wrong. Please check your credentials and try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md rounded-[32px] border border-white/10 bg-white/5 p-8 backdrop-blur">
        <p className="text-sm uppercase tracking-[0.4em] text-teal-200">FinanceFlow</p>
        <h1 className="mt-3 text-3xl font-semibold text-white">
          {mode === "login" ? "Welcome back" : "Create account"}
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          {mode === "login" ? "Sign in to your dashboard" : "Start tracking your finances today"}
        </p>

        {error && (
          <div className="mt-4 rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
            {error}
          </div>
        )}

        <form className="mt-6 grid gap-3" onSubmit={handleSubmit}>
          {mode === "register" && (
            <input
              className={inputClass}
              type="text"
              name="name"
              placeholder="Full name"
              required
              value={form.name}
              onChange={updateField}
            />
          )}
          <input
            className={inputClass}
            type="email"
            name="email"
            placeholder="Email address"
            required
            value={form.email}
            onChange={updateField}
          />
          <input
            className={inputClass}
            type="password"
            name="password"
            placeholder="Password"
            required
            minLength={6}
            value={form.password}
            onChange={updateField}
          />
          <button className={btnClass} type="submit" disabled={loading}>
            {loading ? "Please wait…" : mode === "login" ? "Sign in" : "Create account"}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-slate-400">
          {mode === "login" ? "Don't have an account?" : "Already have an account?"}{" "}
          <button
            className="text-teal-300 hover:underline"
            onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(""); }}
          >
            {mode === "login" ? "Sign up" : "Sign in"}
          </button>
        </p>
      </div>
    </main>
  );
}
