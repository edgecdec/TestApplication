"use client";

import { useState, FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";

interface AuthFormProps {
  mode: "login" | "register";
}

export default function AuthForm({ mode }: AuthFormProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [recoveryCode, setRecoveryCode] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") || "/dashboard";

  const isLogin = mode === "login";
  const title = isLogin ? "Log In" : "Register";
  const endpoint = isLogin ? "/api/auth/login" : "/api/auth/register";
  const altText = isLogin ? "Don't have an account?" : "Already have an account?";
  const redirectParam = redirect !== "/dashboard" ? `?redirect=${encodeURIComponent(redirect)}` : "";
  const altLink = (isLogin ? "/register" : "/login") + redirectParam;
  const altLabel = isLogin ? "Register" : "Log In";

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Something went wrong");
        return;
      }

      if (!isLogin && data.recoveryCode) {
        setRecoveryCode(data.recoveryCode);
        return;
      }

      router.push(redirect);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (recoveryCode) {
    return (
      <main className="flex min-h-screen items-center justify-center p-4">
        <div className="w-full max-w-sm space-y-4 text-center">
          <p className="text-4xl">🔑</p>
          <h1 className="text-xl font-bold dark:text-white">Save Your Recovery Code</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">If you forget your password, you&apos;ll need this code to reset it. Save it somewhere safe — it won&apos;t be shown again.</p>
          <div className="bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-300 dark:border-yellow-700 rounded-lg p-4">
            <p className="font-mono text-lg font-bold tracking-widest select-all dark:text-yellow-200">{recoveryCode}</p>
          </div>
          <button onClick={() => { navigator.clipboard.writeText(recoveryCode); }} className="text-sm text-blue-600 hover:underline">
            📋 Copy to clipboard
          </button>
          <button onClick={() => router.push(redirect)} className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
            I&apos;ve saved it — Continue
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4">
        <h1 className="text-2xl font-bold text-center">{title}</h1>

        {error && (
          <p className="text-red-600 text-sm text-center bg-red-50 p-2 rounded" role="alert">
            {error}
          </p>
        )}

        <div>
          <label htmlFor="username" className="block text-sm font-medium mb-1">
            Username
          </label>
          <input
            id="username"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            autoComplete="username"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium mb-1">
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete={isLogin ? "current-password" : "new-password"}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition"
        >
          {loading ? "Please wait..." : title}
        </button>

        <p className="text-sm text-center text-gray-600">
          {altText}{" "}
          <a href={altLink} className="text-blue-600 hover:underline">
            {altLabel}
          </a>
        </p>
        {isLogin && (
          <p className="text-sm text-center">
            <a href="/forgot-password" className="text-gray-500 hover:underline">Forgot password?</a>
          </p>
        )}
      </form>
    </main>
  );
}
