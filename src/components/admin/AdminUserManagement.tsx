"use client";

import { useEffect, useState } from "react";

interface AdminUser {
  id: number;
  username: string;
  is_admin: number;
  created_at: string;
  bracket_count: number;
}

export default function AdminUserManagement() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [tempPassword, setTempPassword] = useState<{ userId: number; password: string } | null>(null);

  useEffect(() => {
    fetch("/api/admin/users")
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d?.users) setUsers(d.users); })
      .finally(() => setLoading(false));
  }, []);

  async function resetPassword(userId: number, username: string) {
    if (!confirm(`Reset password for "${username}"? A temporary password will be generated.`)) return;
    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, action: "reset_password" }),
    });
    if (res.ok) {
      const data = await res.json();
      setTempPassword({ userId, password: data.tempPassword });
    } else {
      const err = await res.json().catch(() => null);
      alert(err?.error || "Failed to reset password");
    }
  }

  async function toggleAdmin(userId: number, username: string, currentAdmin: number) {
    const action = currentAdmin ? "remove admin from" : "make admin";
    if (!confirm(`${action} "${username}"?`)) return;
    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, action: "toggle_admin" }),
    });
    if (res.ok) {
      const data = await res.json();
      setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, is_admin: data.is_admin } : u));
    } else {
      const err = await res.json().catch(() => null);
      alert(err?.error || "Failed to update");
    }
  }

  if (loading) return <p className="text-gray-500 text-sm">Loading users...</p>;

  return (
    <div>
      {tempPassword && (
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-300 rounded text-sm">
          <p className="font-semibold text-yellow-800">
            Temporary password for {users.find((u) => u.id === tempPassword.userId)?.username}:
          </p>
          <code className="block mt-1 p-2 bg-white border rounded font-mono text-lg select-all">
            {tempPassword.password}
          </code>
          <p className="text-yellow-700 text-xs mt-1">
            Share this with the user. They should change it after logging in.
          </p>
          <button onClick={() => setTempPassword(null)} className="mt-2 text-xs text-yellow-600 hover:underline">
            Dismiss
          </button>
        </div>
      )}
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-gray-500">
            <th className="py-2 px-2">Username</th>
            <th className="py-2 px-2">Role</th>
            <th className="py-2 px-2">Brackets</th>
            <th className="py-2 px-2">Joined</th>
            <th className="py-2 px-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id} className="border-b hover:bg-gray-50">
              <td className="py-2 px-2 font-medium">{u.username}</td>
              <td className="py-2 px-2">
                {u.is_admin ? (
                  <span className="text-xs bg-yellow-200 text-yellow-800 px-2 py-0.5 rounded">Admin</span>
                ) : (
                  <span className="text-xs text-gray-400">User</span>
                )}
              </td>
              <td className="py-2 px-2">{u.bracket_count}</td>
              <td className="py-2 px-2 text-gray-500">{new Date(u.created_at).toLocaleDateString()}</td>
              <td className="py-2 px-2">
                <div className="flex gap-1">
                  <button
                    onClick={() => resetPassword(u.id, u.username)}
                    className="px-2 py-1 text-xs bg-orange-100 text-orange-700 rounded hover:bg-orange-200 transition"
                  >
                    🔑 Reset PW
                  </button>
                  <button
                    onClick={() => toggleAdmin(u.id, u.username, u.is_admin)}
                    className="px-2 py-1 text-xs bg-purple-100 text-purple-700 rounded hover:bg-purple-200 transition"
                  >
                    {u.is_admin ? "Remove Admin" : "Make Admin"}
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-xs text-gray-400 mt-2">{users.length} registered user{users.length !== 1 ? "s" : ""}</p>
    </div>
  );
}
