import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const configurado = Boolean(url && key);

/** Correo de la cuenta compartida del equipo; la contraseña es el "código del equipo". */
export const CORREO_EQUIPO = (import.meta.env.VITE_TEAM_EMAIL as string | undefined) ?? '';

export const supabase = createClient(url ?? 'http://localhost', key ?? 'sin-llave', {
  auth: { persistSession: true, autoRefreshToken: true },
});
