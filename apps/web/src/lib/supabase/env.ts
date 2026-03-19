export interface SupabasePublicEnv {
  url: string;
  anonKey: string;
}

function readValue(value: string | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export function readSupabasePublicEnv(): SupabasePublicEnv | null {
  const url = readValue(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const anonKey = readValue(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

  if (!url || !anonKey) {
    return null;
  }

  return {
    url,
    anonKey,
  };
}

export function hasSupabasePublicEnv() {
  return readSupabasePublicEnv() !== null;
}

export function requireSupabasePublicEnv() {
  const env = readSupabasePublicEnv();

  if (!env) {
    throw new Error(
      "Supabase public env is missing. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY before enabling server-backed collaboration.",
    );
  }

  return env;
}
