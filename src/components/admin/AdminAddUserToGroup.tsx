"use client";

import { useState, useEffect, useCallback } from "react";

interface SearchUser {
  id: number;
  username: string;
  bracket_count: number;
}

interface UserBracket {
  id: number;
  name: string;
  tournament_id: number;
}

interface GroupOption {
  id: number;
  name: string;
  member_count: number;
}

const SEARCH_DEBOUNCE_MS = 300;

export default function AdminAddUserToGroup() {
  const [query, setQuery] = useState("");
  const [users, setUsers] = useState<SearchUser[]>([]);
  const [selectedUser, setSelectedUser] = useState<SearchUser | null>(null);
  const [brackets, setBrackets] = useState<UserBracket[]>([]);
  const [selectedBrackets, setSelectedBrackets] = useState<Set<number>>(new Set());
  const [groups, setGroups] = useState<GroupOption[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<number>(0);
  const [status, setStatus] = useState<{ type: "success" | "error"; msg: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Load all groups once
  useEffect(() => {
    fetch("/api/groups").then(r => r.ok ? r.json() : null).then(d => {
      if (d?.groups) setGroups(d.groups);
    });
  }, []);

  // Debounced user search
  useEffect(() => {
    if (query.trim().length === 0) { setUsers([]); return; }
    const timer = setTimeout(() => {
      fetch(`/api/admin/users?q=${encodeURIComponent(query.trim())}`)
        .then(r => r.ok ? r.json() : null)
        .then(d => { if (d?.users) setUsers(d.users); });
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query]);

  const selectUser = useCallback((u: SearchUser) => {
    setSelectedUser(u);
    setUsers([]);
    setQuery(u.username);
    setSelectedBrackets(new Set());
    fetch(`/api/admin/users/${u.id}/brackets`)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.brackets) setBrackets(d.brackets); });
  }, []);

  function toggleBracket(id: number) {
    setSelectedBrackets(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  async function handleSubmit() {
    if (!selectedUser || !selectedGroup) return;
    setSubmitting(true);
    setStatus(null);
    const res = await fetch("/api/admin/groups", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: selectedUser.id,
        group_id: selectedGroup,
        bracket_ids: Array.from(selectedBrackets),
      }),
    });
    const data = await res.json();
    setSubmitting(false);
    if (res.ok) {
      const parts: string[] = [];
      if (data.already_member) parts.push("already a member");
      else parts.push("added to group");
      if (data.brackets_added > 0) parts.push(`${data.brackets_added} bracket(s) assigned`);
      setStatus({ type: "success", msg: `✅ ${selectedUser.username}: ${parts.join(", ")}` });
      setSelectedUser(null);
      setQuery("");
      setBrackets([]);
      setSelectedBrackets(new Set());
    } else {
      setStatus({ type: "error", msg: data.error || "Failed" });
    }
  }

  return (
    <div className="space-y-4">
      {status && (
        <div className={`p-2 rounded text-sm ${status.type === "success" ? "bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300" : "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300"}`}>
          {status.msg}
        </div>
      )}

      {/* User search */}
      <div className="relative">
        <label className="block text-sm font-medium mb-1">Search User</label>
        <input
          type="text"
          value={query}
          onChange={e => { setQuery(e.target.value); setSelectedUser(null); setBrackets([]); }}
          placeholder="Type a username..."
          className="w-full px-3 py-2 border rounded text-sm dark:bg-gray-700 dark:border-gray-600"
        />
        {users.length > 0 && !selectedUser && (
          <ul className="absolute z-10 w-full bg-white dark:bg-gray-700 border dark:border-gray-600 rounded mt-1 shadow max-h-40 overflow-y-auto">
            {users.map(u => (
              <li key={u.id}>
                <button
                  onClick={() => selectUser(u)}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-600"
                >
                  {u.username} <span className="text-gray-400">({u.bracket_count} brackets)</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Group selector */}
      <div>
        <label className="block text-sm font-medium mb-1">Group</label>
        <select
          value={selectedGroup}
          onChange={e => setSelectedGroup(Number(e.target.value))}
          className="w-full px-3 py-2 border rounded text-sm dark:bg-gray-700 dark:border-gray-600"
        >
          <option value={0}>Select a group...</option>
          {groups.map(g => (
            <option key={g.id} value={g.id}>{g.name} ({g.member_count} members)</option>
          ))}
        </select>
      </div>

      {/* Bracket checkboxes */}
      {selectedUser && brackets.length > 0 && (
        <div>
          <label className="block text-sm font-medium mb-1">Assign Brackets (optional)</label>
          <div className="space-y-1 max-h-32 overflow-y-auto border rounded p-2 dark:border-gray-600">
            {brackets.map(b => (
              <label key={b.id} className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedBrackets.has(b.id)}
                  onChange={() => toggleBracket(b.id)}
                />
                {b.name}
              </label>
            ))}
          </div>
        </div>
      )}

      <button
        onClick={handleSubmit}
        disabled={!selectedUser || !selectedGroup || submitting}
        className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 transition"
      >
        {submitting ? "Adding..." : "Add to Group"}
      </button>
    </div>
  );
}
