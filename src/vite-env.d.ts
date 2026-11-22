/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface ImportMetaEnv {
  /** Supabase project URL (optional; cloud backup is hidden without it). */
  readonly VITE_SUPABASE_URL?: string;
  /** Supabase anon public key (optional). */
  readonly VITE_SUPABASE_ANON_KEY?: string;
}
