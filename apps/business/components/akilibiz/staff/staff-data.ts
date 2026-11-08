"use client";

import { useCallback, useState } from "react";

export interface StaffRole { id: number; name: string; }
export interface StaffMember { id: number; username: string; full_name: string; email?: string | null; phone?: string | null; role_id: number; role_name: string; is_active: boolean; notes?: string | null; created_at: string; }
export interface StaffPayload { username?: string; full_name: string; email?: string | null; password?: string; phone?: string | null; role_id: number; is_active?: boolean; notes?: string | null; }

const roles: StaffRole[] = [{ id: 1, name: "Business Owner" }, { id: 2, name: "Manager" }, { id: 3, name: "Cashier" }];
const seed: StaffMember[] = [{ id: 1, username: "albert", full_name: "Albert Watbin", email: "albert@example.com", phone: "+256 701 123 456", role_id: 1, role_name: "Business Owner", is_active: true, notes: "Primary business account", created_at: "2026-01-12T09:00:00Z" }, { id: 2, username: "grace", full_name: "Grace Namusoke", email: "grace@example.com", phone: "+256 772 456 789", role_id: 3, role_name: "Cashier", is_active: true, notes: null, created_at: "2026-04-05T09:00:00Z" }];

export function useStaffData() {
  const [staff, setStaff] = useState<StaffMember[]>(seed);
  const addStaff = useCallback(async (payload: Required<Pick<StaffPayload, "username">> & StaffPayload) => { const role = roles.find((item) => item.id === payload.role_id); if (!role) return null; const member: StaffMember = { id: Date.now(), username: payload.username, full_name: payload.full_name, email: payload.email ?? null, phone: payload.phone ?? null, role_id: role.id, role_name: role.name, is_active: payload.is_active ?? true, notes: payload.notes ?? null, created_at: new Date().toISOString() }; setStaff((members) => [member, ...members]); return member; }, []);
  const editStaff = useCallback(async (id: number, payload: StaffPayload) => { const role = roles.find((item) => item.id === payload.role_id); if (!role) return null; let updated: StaffMember | null = null; setStaff((members) => members.map((member) => { if (member.id !== id) return member; updated = { ...member, ...payload, full_name: payload.full_name, email: payload.email ?? null, phone: payload.phone ?? null, role_id: role.id, role_name: role.name, is_active: payload.is_active ?? member.is_active, notes: payload.notes ?? null }; return updated; })); return updated; }, []);
  const setActive = useCallback(async (id: number, is_active: boolean) => { setStaff((members) => members.map((member) => member.id === id ? { ...member, is_active } : member)); return true; }, []);
  return { staff, roles, loading: false, error: null as string | null, getStaff: async () => staff, getStaffMember: async (id: number) => staff.find((member) => member.id === id) ?? null, getStaffRoles: async () => roles, addStaff, editStaff, setActive, clearError: () => {} };
}
