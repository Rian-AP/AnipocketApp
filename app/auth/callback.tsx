import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { supabase } from '@/lib/supabase';
import { useTheme } from '@/lib/theme';

/**
 * OAuth deep-link landing route (e.g. `mobile://auth/callback?code=...`).
 *
 * On iOS the in-app auth session intercepts the redirect, so this route is never hit.
 * On Android the `mobile://` redirect is dispatched to the app as a deep link, so
 * without this route Expo Router would show "page not found". Here we finish the PKCE
 * exchange (if the code wasn't already consumed by the in-app session) and return to
 * the account screen — the auth listener there then shows the signed-in profile.
 */
export default function AuthCallback() {
  const theme = useTheme();
  const params = useLocalSearchParams<{ code?: string }>();
  const handledRef = useRef(false);

  useEffect(() => {
    if (handledRef.current) return;
    handledRef.current = true;

    const code = typeof params.code === 'string' ? params.code : null;

    void (async () => {
      if (code && supabase) {
        // The in-app session may have already consumed this code — ignore that error.
        try {
          await supabase.auth.exchangeCodeForSession(code);
        } catch {
          // no-op
        }
      }
      router.replace('/account');
    })();
  }, [params.code]);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <ActivityIndicator color={theme.colors.indicator} size="large" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
