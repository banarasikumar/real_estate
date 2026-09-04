"use client";

import React, { useEffect, useState } from "react";
import { getAllProfiles, updateUserRole, useAuth, getUserProfile } from "@repo/api";
import { Users, Shield, UserCheck, Search, Sparkles, Check, AlertCircle } from "lucide-react";

export default function UsersAdminPage() {
  const { session } = useAuth();
  const [profiles, setProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);

  const fetchUsers = async () => {
    setLoading(true);
    const data = await getAllProfiles();
    setProfiles(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchUsers();
    if (session?.user?.id) {
      getUserProfile(session.user.id).then((p) => {
        if (p) setCurrentUserRole(p.role);
      });
    }
  }, [session?.user?.id]);

  const handleRoleChange = async (userId: string, newRole: any) => {
    setUpdatingId(userId);
    setFeedback(null);
    try {
      const result = await updateUserRole(userId, newRole);
      if (result.success) {
        setProfiles((prev) =>
          prev.map((p) => (p.id === userId ? { ...p, role: newRole } : p))
        );
        setFeedback({ msg: "User role updated successfully!", type: "success" });
      } else {
        throw result.error || new Error("Failed to update role");
      }
    } catch (err: any) {
      setFeedback({ msg: err?.message || "Failed to update role", type: "error" });
    } finally {
      setUpdatingId(null);
    }
  };

  const isSuperAdmin = currentUserRole === "SUPER_ADMIN";

  const filteredProfiles = profiles.filter((p) => {
    const q = searchQuery.toLowerCase();
    const name = (p.full_name || "").toLowerCase();
    const role = (p.role || "").toLowerCase();
    const id = (p.id || "").toLowerCase();
    return name.includes(q) || role.includes(q) || id.includes(q);
  });

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "SUPER_ADMIN":
        return "bg-purple-100 text-purple-800 border-purple-200";
      case "ADMIN":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "OWNER":
        return "bg-amber-100 text-amber-800 border-amber-200";
      default:
        return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-blue-600 uppercase tracking-wider mb-1">
            <Shield className="w-4 h-4" />
            <span>Role-Based Access Control</span>
          </div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">
            User & Admin Management
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">
            View registered platform accounts and manage administrative privileges.
          </p>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name or role..."
            className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 shadow-xs"
          />
        </div>
      </div>

      {/* Feedback banner */}
      {feedback && (
        <div
          className={`p-4 rounded-xl flex items-center gap-2.5 text-xs font-semibold ${
            feedback.type === "success"
              ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
              : "bg-red-50 text-red-800 border border-red-200"
          }`}
        >
          {feedback.type === "success" ? (
            <Check className="w-4 h-4 text-emerald-600" />
          ) : (
            <AlertCircle className="w-4 h-4 text-red-600" />
          )}
          <span>{feedback.msg}</span>
        </div>
      )}

      {/* Table Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center p-16">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
          </div>
        ) : filteredProfiles.length === 0 ? (
          <div className="text-center p-12 text-slate-500 text-sm">
            No users found matching your search.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-600 text-xs uppercase tracking-wider border-b border-slate-200">
                  <th className="py-4 px-6 font-semibold">User</th>
                  <th className="py-4 px-6 font-semibold">Role</th>
                  <th className="py-4 px-6 font-semibold">User ID</th>
                  <th className="py-4 px-6 font-semibold">Registered</th>
                  <th className="py-4 px-6 font-semibold text-right">Role Assignment</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredProfiles.map((user) => {
                  const isCurrentUser = session?.user?.id === user.id;
                  const isBusy = updatingId === user.id;

                  return (
                    <tr key={user.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-700 text-xs">
                            {user.full_name ? user.full_name.charAt(0).toUpperCase() : "U"}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 flex items-center gap-1.5">
                              <span>{user.full_name || "Unnamed Account"}</span>
                              {isCurrentUser && (
                                <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-bold">
                                  You
                                </span>
                              )}
                            </p>
                            <p className="text-xs text-slate-400 font-mono">
                              {user.phone_number || "No phone recorded"}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="py-4 px-6">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border ${getRoleBadge(
                            user.role
                          )}`}
                        >
                          {user.role}
                        </span>
                      </td>

                      <td className="py-4 px-6 font-mono text-xs text-slate-400">
                        {user.id.substring(0, 8)}...
                      </td>

                      <td className="py-4 px-6 text-xs text-slate-500">
                        {new Date(user.created_at).toLocaleDateString()}
                      </td>

                      <td className="py-4 px-6 text-right">
                        {isSuperAdmin && !isCurrentUser ? (
                          <div className="flex items-center justify-end gap-2">
                            <select
                              value={user.role}
                              disabled={isBusy}
                              onChange={(e) => handleRoleChange(user.id, e.target.value)}
                              className="text-xs font-semibold bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-700 outline-none focus:border-blue-500 cursor-pointer shadow-xs disabled:opacity-50"
                            >
                              <option value="USER">USER</option>
                              <option value="OWNER">OWNER</option>
                              <option value="ADMIN">ADMIN</option>
                              <option value="SUPER_ADMIN">SUPER_ADMIN</option>
                            </select>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 italic">
                            {isCurrentUser ? "Self (Cannot modify)" : "Super Admin only"}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
