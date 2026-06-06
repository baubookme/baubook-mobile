// Milestone 2: questo file diventerà supabase.ts quando collegheremo l'app al progetto Supabase.
//
// Dipendenze previste, da installare quando iniziamo Auth/DB dall'app:
// npx expo install @supabase/supabase-js @react-native-async-storage/async-storage react-native-url-polyfill
//
// Struttura prevista:
// import 'react-native-url-polyfill/auto';
// import AsyncStorage from '@react-native-async-storage/async-storage';
// import { createClient } from '@supabase/supabase-js';
// import { env, supabaseClientKey } from './env';
//
// export const supabase = createClient(env.supabaseUrl, supabaseClientKey, {
//   auth: {
//     storage: AsyncStorage,
//     persistSession: true,
//     autoRefreshToken: true,
//     detectSessionInUrl: false,
//   },
// });
