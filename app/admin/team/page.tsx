"use client";

/**
 * Team — A10
 * ----------------------------------------------------------------------------
 * Who can do what in the console, plus inviting and changing roles.
 *
 * The permission matrix is the point of this screen, and it comes from the
 * backend rather than being written in the UI — every row corresponds to a
 * guard that actually runs. A matrix written by hand drifts from the code
 * within a month and then actively misleads, which is worse than not having
 * one: an admin reads "cannot modify a super admin", believes it, and never
 * discovers the guard was removed.
 *
 * The design has a "Preview as" selector. It changes which column is
 * highlighted — it does not change what the viewer can do, and the screen says
 * so. A preview that silently granted permissions would be a security hole; one
 * that looks like it restricts them but doesn't is just confusing.
 */

import React, { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import {
  UserPlus, Check, X, Loader2, AlertCircle, Info, Shield, Mail, Clock,
} from "lucide-react";

import AdminShell from "@/components/admin/AdminShell";
import {
  getTeam, inviteTeamMember, updateUserRole,
  type TeamMember, type PermissionRow, type ConsoleRole,
} from "@/lib/api/admin";

const ROLE_LABEL: Record<string, string> = {
  admin: "Admin",
  super_admin: "Super admin",
};

const STATUS_STYLE: Record<string, string> = {
  active: "bg-[#E7FBEB] text-[#28603A]",
  invited: "bg-[#F3FEFD] text-[#004643]",
  "never signed in": "bg-[#FFFBF2] text-[#8a6d1f]",
};

function fmtWhen(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", {
    day: "numeric", month: "short", year: "numeric",
  });
}

function TeamInner() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [permissions, setPermissions] = useState<PermissionRow[]>([]);
  const [roles, setRoles] = useState<ConsoleRole[]>(["admin", "super_admin"]);
  const [viewerRole, setViewerRole] = useState<string>("admin");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [previewRole, setPreviewRole] = useState<string>("admin");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<ConsoleRole>("admin");
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [inviteError, setInviteError] = useState<string | null>(null);

  const [changingId, setChangingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await getTeam();
      if (res.success) {
        setMembers(res.data.members);
        setPermissions(res.data.permissions);
        setRoles(res.data.roles);
        setViewerRole(res.data.viewer_role);
        setPreviewRole(res.data.viewer_role);
        setError(null);
      } else {
        setError(typeof res.error === "string" ? res.error : "Could not load the team.");
      }
    } catch {
      setError("Could not load the team.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const isSuper = viewerRole === "super_admin";

  const send = useCallback(async () => {
    const email = inviteEmail.trim();
    if (!email) return;
    setSending(true);
    setInviteError(null);
    try {
      const res = await inviteTeamMember(email, inviteRole);
      if (!res.success) {
        setInviteError(typeof res.error === "string" ? res.error : "Could not send the invite.");
        return;
      }
      setNotice(`Invite sent to ${email}. They set their own password from the link.`);
      setInviteOpen(false);
      setInviteEmail("");
      await load();
      setTimeout(() => setNotice(null), 8000);
    } catch {
      setInviteError("Could not send the invite.");
    } finally {
      setSending(false);
    }
  }, [inviteEmail, inviteRole, load]);

  const changeRole = useCallback(async (member: TeamMember, role: ConsoleRole) => {
    setChangingId(member.id);
    setError(null);
    try {
      const res = await updateUserRole(member.id, role);
      if (!res.success) {
        setError(typeof res.error === "string" ? res.error : "Could not change that role.");
        return;
      }
      await load();
    } catch {
      setError("Could not change that role.");
    } finally {
      setChangingId(null);
    }
  }, [load]);

  if (loading) {
    return (
      <div className="flex items-center justify-center px-6 py-24">
        <Loader2 className="h-5 w-5 animate-spin text-[#004643]" />
      </div>
    );
  }

  return (
    <div className="px-6 py-7 lg:px-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-[24px] text-[#101212]">Team</h1>
          <p className="mt-1 text-[12.5px] text-[#646968]">Who can do what in the console.</p>
        </div>

        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-[12px] text-[#646968]">
            Preview as
            <select
              value={previewRole}
              onChange={e => setPreviewRole(e.target.value)}
              className="rounded-full border border-[#D5DBDA] bg-white px-3 py-1.5 text-[12.5px] text-[#343837] focus:border-[#87DDD7] focus:outline-none"
            >
              {roles.map(r => <option key={r} value={r}>{ROLE_LABEL[r] ?? r}</option>)}
            </select>
          </label>

          {isSuper && (
            <button
              onClick={() => { setInviteOpen(true); setInviteError(null); }}
              className="flex items-center gap-1.5 rounded-full bg-[#004643] px-4 py-2 text-[12.5px] font-medium text-white hover:bg-[#003836]"
            >
              <UserPlus size={13} />
              Invite member
            </button>
          )}
        </div>
      </div>

      {!isSuper && (
        <div className="mt-5 flex items-start gap-2.5 rounded-xl border border-[#E6EBEA] bg-white p-3.5 text-[12.5px] text-[#4B4F4F]">
          <Info size={15} className="mt-px shrink-0 text-[#646968]" />
          Your role ({ROLE_LABEL[viewerRole] ?? viewerRole}) can see the team but not
          invite members or change roles.
        </div>
      )}

      {notice && (
        <div className="mt-5 flex items-start gap-2.5 rounded-xl border border-[#28603A]/25 bg-[#E7FBEB] p-3.5 text-[12.5px] text-[#28603A]">
          <Check size={15} className="mt-px shrink-0" strokeWidth={3} />
          {notice}
        </div>
      )}

      {error && (
        <div className="mt-5 flex items-start gap-2.5 rounded-xl border border-[#812F28]/25 bg-[#FFFAF9] p-3.5 text-[12.5px] text-[#812F28]">
          <AlertCircle size={15} className="mt-px shrink-0" />
          {error}
        </div>
      )}

      {/* Invite */}
      {inviteOpen && (
        <div className="mt-5 rounded-2xl border border-[#D5DBDA] bg-white p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-[13px] font-medium text-[#101212]">Invite a team member</h2>
              <p className="mt-1 text-[12px] text-[#646968]">
                They receive a one-time link and set their own password. Nobody
                else ever knows it.
              </p>
            </div>
            <button
              onClick={() => setInviteOpen(false)}
              aria-label="Cancel"
              className="flex h-7 w-7 items-center justify-center rounded-full text-[#8E9493] hover:bg-[#F1F4F4]"
            >
              <X size={14} />
            </button>
          </div>

          <div className="mt-4 flex flex-wrap items-end gap-3">
            <label className="min-w-[240px] flex-1">
              <span className="block text-[11.5px] font-medium text-[#101212]">Email</span>
              <input
                type="email"
                value={inviteEmail}
                onChange={e => setInviteEmail(e.target.value)}
                onKeyDown={e => e.key === "Enter" && send()}
                placeholder="name@nooi.com"
                className="mt-1 w-full rounded-xl border border-[#D5DBDA] px-3 py-2 text-[12.5px] placeholder:text-[#B3B9B9] focus:border-[#87DDD7] focus:outline-none"
              />
            </label>

            <label>
              <span className="block text-[11.5px] font-medium text-[#101212]">Role</span>
              <select
                value={inviteRole}
                onChange={e => setInviteRole(e.target.value as ConsoleRole)}
                className="mt-1 rounded-xl border border-[#D5DBDA] bg-white px-3 py-2 text-[12.5px] focus:border-[#87DDD7] focus:outline-none"
              >
                {roles.map(r => <option key={r} value={r}>{ROLE_LABEL[r] ?? r}</option>)}
              </select>
            </label>

            <button
              onClick={send}
              disabled={!inviteEmail.trim() || sending}
              className="flex items-center gap-2 rounded-full bg-[#004643] px-4 py-2 text-[12.5px] font-medium text-white hover:bg-[#003836] disabled:opacity-40"
            >
              {sending && <Loader2 size={13} className="animate-spin" />}
              Send invite
            </button>
          </div>

          {inviteError && (
            <p className="mt-2 text-[11.5px] text-[#812F28]">{inviteError}</p>
          )}
        </div>
      )}

      {/* Members */}
      <div className="mt-5 overflow-hidden rounded-2xl border border-[#D5DBDA] bg-white">
        <div className="hidden grid-cols-[2fr_1fr_1fr_1fr] gap-4 border-b border-[#E6EBEA] bg-[#FBFCFC] px-5 py-2.5 text-[11px] font-medium uppercase tracking-wide text-[#8E9493] md:grid">
          <span>Member</span>
          <span>Role</span>
          <span>Last sign-in</span>
          <span>Status</span>
        </div>

        {members.length === 0 && (
          <div className="px-5 py-10 text-center text-[12.5px] text-[#8E9493]">
            No console members yet.
          </div>
        )}

        {members.map(m => (
          <div
            key={m.id}
            className="grid grid-cols-1 gap-1 border-b border-[#F1F4F4] px-5 py-3.5 last:border-b-0 md:grid-cols-[2fr_1fr_1fr_1fr] md:items-center md:gap-4"
          >
            <span className="flex min-w-0 items-center gap-2.5">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#004643] text-[12px] font-medium text-white">
                {(m.full_name || m.email || "?").trim().charAt(0).toUpperCase()}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-[13px] font-medium text-[#101212]">
                  {m.full_name || "—"}
                </span>
                <span className="flex items-center gap-1 truncate text-[11px] text-[#8E9493]">
                  <Mail size={9} />
                  {m.email ?? "no email"}
                </span>
              </span>
            </span>

            <span>
              {isSuper ? (
                <select
                  value={m.role}
                  disabled={changingId === m.id}
                  onChange={e => changeRole(m, e.target.value as ConsoleRole)}
                  className="rounded-full border border-[#D5DBDA] bg-white px-2.5 py-1 text-[12px] text-[#343837] focus:border-[#87DDD7] focus:outline-none disabled:opacity-50"
                >
                  {roles.map(r => <option key={r} value={r}>{ROLE_LABEL[r] ?? r}</option>)}
                </select>
              ) : (
                <span className="flex items-center gap-1.5 text-[12.5px] text-[#4B4F4F]">
                  {m.role === "super_admin" && <Shield size={11} className="text-[#004643]" />}
                  {ROLE_LABEL[m.role] ?? m.role}
                </span>
              )}
            </span>

            <span className="flex items-center gap-1 text-[12px] text-[#646968]">
              <Clock size={10} className="text-[#B3B9B9]" />
              {fmtWhen(m.last_sign_in_at)}
            </span>

            <span>
              <span className={`inline-block rounded-full px-2 py-0.5 text-[10.5px] font-medium ${STATUS_STYLE[m.status] ?? ""}`}>
                {m.status}
              </span>
            </span>
          </div>
        ))}
      </div>

      {/* Permission matrix */}
      <section className="mt-6 overflow-hidden rounded-2xl border border-[#D5DBDA] bg-white">
        <div className="border-b border-[#E6EBEA] px-5 py-3.5">
          <h2 className="text-[13px] font-medium text-[#101212]">Permissions</h2>
          <p className="mt-0.5 text-[11.5px] text-[#646968]">
            Taken from the checks that actually run on the server, not written by
            hand. Previewing a role highlights its column — it doesn&apos;t change
            what you can do.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px]">
            <thead>
              <tr className="border-b border-[#E6EBEA] bg-[#FBFCFC]">
                <th className="px-5 py-2.5 text-start text-[11px] font-medium uppercase tracking-wide text-[#8E9493]">
                  Permission
                </th>
                {roles.map(r => (
                  <th
                    key={r}
                    className={`px-4 py-2.5 text-center text-[11px] font-medium uppercase tracking-wide ${
                      previewRole === r ? "bg-[#F3FEFD] text-[#004643]" : "text-[#8E9493]"
                    }`}
                  >
                    {ROLE_LABEL[r] ?? r}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {permissions.map(p => (
                <tr key={p.label} className="border-b border-[#F1F4F4] last:border-b-0">
                  <td className="px-5 py-2.5">
                    <span className="block text-[12.5px] text-[#101212]">{p.label}</span>
                    {p.note && (
                      <span className="block font-mono text-[10.5px] text-[#B3B9B9]">{p.note}</span>
                    )}
                  </td>
                  {roles.map(r => {
                    const allowed = p[r as "admin" | "super_admin"];
                    return (
                      <td
                        key={r}
                        className={`px-4 py-2.5 text-center ${previewRole === r ? "bg-[#F3FEFD]" : ""}`}
                      >
                        {allowed ? (
                          <Check size={14} className="mx-auto text-[#28603A]" strokeWidth={3} />
                        ) : (
                          <span className="text-[#D5DBDA]">—</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

export default function AdminTeamPage() {
  return (
    <AdminShell>
      <Suspense fallback={<div className="px-6 py-20" />}>
        <TeamInner />
      </Suspense>
    </AdminShell>
  );
}