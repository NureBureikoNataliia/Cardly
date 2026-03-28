import { supabase } from '@/src/lib/supabase';

function readAdminColumn(row: Record<string, unknown> | null | undefined): boolean {
  if (!row) return false;
  const v = row.isAdmin ?? row.isadmin ?? row.is_admin;
  return v === true || v === 'true' || v === 1;
}

/**
 * Resolves admin flag from `public.users` (then `public.profiles`).
 * Tries auth id on `user_id` / `id`, then **email** on `users` so Google OAuth (different auth uid
 * than the row created for email/password) still matches the same `users` row.
 */
export async function fetchIsAdmin(
  userId: string | undefined,
  email?: string | null,
): Promise<boolean> {
  if (!userId) return false;

  for (const col of ['user_id', 'id'] as const) {
    const { data, error } = await supabase.from('users').select('*').eq(col, userId).maybeSingle();
    if (error) continue;
    if (data && readAdminColumn(data as Record<string, unknown>)) return true;
    if (data) return false;
  }

  const normalizedEmail = email?.trim().toLowerCase();
  if (normalizedEmail) {
    const { data: byEmail, error: emailErr } = await supabase
      .from('users')
      .select('*')
      .ilike('email', normalizedEmail)
      .maybeSingle();
    if (!emailErr && byEmail) {
      return readAdminColumn(byEmail as Record<string, unknown>);
    }
  }

  const { data: prof, error: profErr } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();
  if (!profErr && prof) {
    return readAdminColumn(prof as Record<string, unknown>);
  }

  return false;
}
