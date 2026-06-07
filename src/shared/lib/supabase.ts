import 'react-native-url-polyfill/auto';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import { env, hasSupabaseConfig, supabaseClientKey } from './env';

let client: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient | null {
  if (!hasSupabaseConfig) {
    return null;
  }

  if (!client) {
    client = createClient(env.supabaseUrl, supabaseClientKey, {
      auth: {
        storage: AsyncStorage,
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
      },
    });
  }

  return client;
}

export const supabase = getSupabaseClient();

export function getSupabaseConfigSummary() {
  return {
    configured: hasSupabaseConfig,
    url: env.supabaseUrl,
    keyPrefix: supabaseClientKey ? `${supabaseClientKey.slice(0, 6)}...${supabaseClientKey.slice(-4)}` : '',
  };
}
