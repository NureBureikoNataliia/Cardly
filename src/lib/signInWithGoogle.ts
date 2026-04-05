import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';

import { supabase } from '@/src/lib/supabase';

/**
 * Starts Supabase Google OAuth. On web, the client redirects the browser.
 * On native, opens an in-app browser session and exchanges the auth code for a session.
 */
export async function signInWithGoogleOAuth(): Promise<{ error: Error | null }> {
  try {
    const redirectTo = Linking.createURL('/');

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
        skipBrowserRedirect: Platform.OS !== 'web',
      },
    });

    if (error) return { error };

    if (Platform.OS === 'web') {
      return { error: null };
    }

    if (!data?.url) {
      return { error: new Error('OAuth URL missing') };
    }

    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);

    if (result.type === 'success' && result.url) {
      const url = new URL(result.url);
      const code = url.searchParams.get('code');
      if (code) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
        return { error: exchangeError ?? null };
      }
      const hash = url.hash.replace(/^#/, '');
      if (hash) {
        const hashParams = new URLSearchParams(hash);
        const access_token = hashParams.get('access_token');
        const refresh_token = hashParams.get('refresh_token');
        if (access_token && refresh_token) {
          const { error: sessionError } = await supabase.auth.setSession({ access_token, refresh_token });
          return { error: sessionError ?? null };
        }
      }
    }

    return { error: null };
  } catch (e) {
    return { error: e instanceof Error ? e : new Error(String(e)) };
  }
}
