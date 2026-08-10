import { createClient } from '@supabase/supabase-js';

import type { Database } from './database.types';

type SupabaseConfig =
  | {
      status: 'ready';
      anonKey: string;
      url: string;
    }
  | {
      status: 'missing';
      missing: string[];
    };

export type SupabaseClientStatus =
  | {
      status: 'ready';
      client: unknown;
    }
  | {
      status: 'missing';
      message: string;
      missing: string[];
    };

let browserClient: unknown;

function readStringEnv(name: string) {
  const env = import.meta.env as unknown as Record<string, unknown>;
  const value = env[name];

  return typeof value === 'string' ? value.trim() : undefined;
}

export function readSupabaseConfig(): SupabaseConfig {
  const url = readStringEnv('VITE_SUPABASE_URL');
  const anonKey = readStringEnv('VITE_SUPABASE_ANON_KEY');

  if (!url || !anonKey) {
    const missing = [
      url ? undefined : 'VITE_SUPABASE_URL',
      anonKey ? undefined : 'VITE_SUPABASE_ANON_KEY',
    ].filter((name): name is string => Boolean(name));

    return {
      missing,
      status: 'missing',
    };
  }

  return {
    anonKey,
    status: 'ready',
    url,
  };
}

export function getSupabaseClientStatus(): SupabaseClientStatus {
  const config = readSupabaseConfig();

  if (config.status === 'missing') {
    return {
      message:
        'Supabase configuration is missing. Add the browser-safe project URL and anon key to your local environment.',
      missing: config.missing,
      status: 'missing',
    };
  }

  browserClient ??= createClient<Database>(config.url, config.anonKey, {
    auth: {
      autoRefreshToken: true,
      detectSessionInUrl: true,
      persistSession: true,
    },
  });

  return {
    client: browserClient,
    status: 'ready',
  };
}
