"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [recoveryCode, setRecoveryCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/recover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, recoveryCode, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Recovery failed"); return; }
      setSuccess(true);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <main className="flex min-h-screen items-center justify-center p-4">
        <div className="w-full max-w-sm space-y-4 text-center">
          <p className="text-4xl">✅</p>
          <h1 className="text-xl font-bold dark:text-white">Password Reset</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">Your password has been updated. You can now log in.</p>
          <button onClick={() => router.push("/login")} className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
            Go to Login
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4">
        <h1 className="text-2xl font-bold text-center dark:text-white">Reset Password</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 text-center">Enter your username and the recovery code you saved when you registered.</p>

        {error && <p className="text-red-600 text-sm text-center bg-red-50 dark:bg-red-900/30 p-2 rounded" role="alert">{error}</p>}

        <div>
          <label htmlFor="username" className="block text-sm font-medium mb-1 dark:text-gray-300">Username</label>
          <input id="username" type="text" value={username} onChange={(e) => setUsername(e.target.value)} required autoComplete="username"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white" />
        </div>

        <div>
          <label htmlFor="recoveryCode" className="block text-sm font-medium mb-1 dark:text-gray-300">Recovery Code</label>
          <input id="recoveryCode" type="text" value={recoveryCode} onChange={(e) => setRecoveryCode(e.target.value)} required
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono dark:bg-gray-800 dark:text-white" />
        </div>

        <div>
          <label htmlFor="newPassword" className="block text-sm font-medium mb-1 dark:text-gray-300">New Password</label>
          <input id="newPassword" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required autoComplete="new-password"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-white" />
        </div>

        <button type="submit" disabled={loading} className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition">
          {loading ? "Please wait..." : "Reset Password"}
        </button>

        <p className="text-sm text-center text-gray-600 dark:text-gray-400">
          Remember your password? <a href="/login" className="text-blue-600 hover:underline">Log In</a>
        </p>
      </form>
    </main>
  );
}
