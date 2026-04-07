import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";
import { Platform } from "react-native";
import "react-native-url-polyfill/auto";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

const storage = Platform.OS === "web" ? undefined : AsyncStorage;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage,
    // Вмикаємо збереження сесії як на web, так і на native
    persistSession: true,
    autoRefreshToken: true,
    // На web дозволяємо детектити сесію в URL (для magic link тощо)
    detectSessionInUrl: Platform.OS === "web",
  },
});
