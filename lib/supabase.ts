import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';

const SUPABASE_URL = (
  process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://eoivcawwunyqhpkztgdt.supabase.co'
).trim();
const SUPABASE_KEY = (
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVvaXZjYXd3dW55cWhwa3p0Z2R0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkxMzEwMzMsImV4cCI6MjA5NDcwNzAzM30.zuyARszQTvzyGIT6jDpGA0uRJiuLmolNUinHwsJDvJw'
).trim();

export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_KEY);

export const supabase = isSupabaseConfigured
  ? createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
        flowType: 'pkce',
      },
      global: {
        fetch: fetch.bind(globalThis),
      },
    })
  : null;

export type GoogleSignInResult =
  | { ok: true }
  | { ok: false; cancelled?: boolean; error?: string };

/**
 * Signs in with Google using Supabase OAuth + an in-app browser.
 *
 * Flow:
 * 1. Ask Supabase for the Google consent URL (PKCE).
 * 2. Open it in a secure in-app browser session.
 * 3. Google redirects back to our app (mobile://) with a `code`.
 * 4. Exchange that code for a real Supabase session.
 *
 * The auth state listener in account.tsx then picks up the new session.
 */
export async function signInWithGoogle(): Promise<GoogleSignInResult> {
  if (!supabase) {
    return { ok: false, error: 'not-configured' };
  }

  // Deep link back into the app, e.g. "mobile://auth/callback"
  const redirectTo = Linking.createURL('auth/callback');

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo,
      skipBrowserRedirect: true,
      queryParams: { prompt: 'select_account' },
    },
  });

  if (error || !data?.url) {
    return { ok: false, error: error?.message || 'no-url' };
  }

  // Open the consent screen and wait for the redirect back to redirectTo.
  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);

  if (result.type === 'cancel' || result.type === 'dismiss') {
    return { ok: false, cancelled: true };
  }

  if (result.type !== 'success' || !result.url) {
    return { ok: false, error: 'no-redirect' };
  }

  // The redirect URL carries either ?code=... (PKCE) or #access_token=... (implicit).
  const parsed = Linking.parse(result.url);
  const code =
    typeof parsed.queryParams?.code === 'string' ? parsed.queryParams.code : null;

  if (code) {
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
    if (exchangeError) {
      return { ok: false, error: exchangeError.message };
    }
    return { ok: true };
  }

  // Fallback: tokens in the URL fragment (#access_token=...&refresh_token=...)
  const fragment = result.url.includes('#') ? result.url.split('#')[1] : '';
  const params: Record<string, string> = {};
  for (const pair of fragment.split('&')) {
    const [key, value] = pair.split('=');
    if (key) params[decodeURIComponent(key)] = decodeURIComponent(value || '');
  }
  const accessToken = params['access_token'];
  const refreshToken = params['refresh_token'];

  if (accessToken && refreshToken) {
    const { error: sessionError } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    if (sessionError) {
      return { ok: false, error: sessionError.message };
    }
    return { ok: true };
  }

  return { ok: false, error: 'no-session' };
}

