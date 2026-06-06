export const env = {
  supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL ?? '',
  supabasePublishableKey: process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? '',
  supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '',
  googleMapsAndroidApiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_ANDROID_API_KEY ?? '',
};

export const supabaseClientKey = env.supabasePublishableKey || env.supabaseAnonKey;

export const hasSupabaseConfig = Boolean(env.supabaseUrl && supabaseClientKey);
export const hasGoogleMapsConfig = Boolean(env.googleMapsAndroidApiKey);
