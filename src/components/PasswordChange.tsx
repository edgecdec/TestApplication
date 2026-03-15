"use client";

import { useState } from "react";
import { PASSWORD_MIN_LENGTH } from "@/lib/constants";

export default function PasswordChange() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [status, setStatus] = useState<{ type: "success" | "error"; msg: string } | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus(null);
    if (newPassword.length < PASSWORD_MIN_LENGTH) {
      setStatus({ type: "error", msg: `Password must be at least ${PASSWORD_MIN_LENGTH} characters` });
      return;
    }
    if (newPassword !== confirm) {
      setStatus({ type: "error", msg: "New passwords do not match" });
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatus({ type: "error", msg: data.error || "Failed to change password" });
      } else {
        setStatus({ type: "success", msg: "Password changed successfully" });
        setCurrentPassword("");
        setNewPassword("");
        setConfirm("");
      }
    } catch {
      setStatus({ type: "error", msg: "Network error" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Current Password</label>
        <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required className="w-full border rounded px-3 py-1.5 text-sm" />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">New Password</label>
        <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required className="w-full border rounded px-3 py-1.5 text-sm" />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Confirm New Password</label>
        <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required className="w-full border rounded px-3 py-1.5 text-sm" />
      </div>
      {status && (
        <p className={`text-sm ${status.type === "success" ? "text-green-600" : "text-red-600"}`}>{status.msg}</p>
      )}
      <button type="submit" disabled={saving} className="px-4 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 transition">
        {saving ? "Saving..." : "Change Password"}
      </button>
    </form>
  );
}
