import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useCallback, useRef, useState } from 'react';
import {
  Animated,
  Image as RNImage,
  Modal,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  ViewStyle,
} from 'react-native';

import type { CardMenuAction } from './CardContextMenu';
import { useTheme } from '@/lib/theme';

interface AndroidCardMenuProps {
  children: React.ReactNode;
  onTap: () => void;
  actions: CardMenuAction[];
  preview?: { uri: string; width?: number; height?: number } | null;
  enabled?: boolean;
  onMenuOpenChange?: (open: boolean) => void;
  style?: StyleProp<ViewStyle>;
}

// The actions carry iOS SF Symbol names; map the ones we use to Ionicons for Android.
const SF_TO_IONICON: Record<string, string> = {
  'arrow.up.forward.app': 'open-outline',
  bookmark: 'bookmark-outline',
  'bookmark.slash': 'bookmark',
  'arrow.down.circle': 'download-outline',
  'square.and.arrow.up': 'share-social-outline',
  'play.circle': 'play-circle-outline',
  trash: 'trash-outline',
};

/**
 * Android long-press context menu (Pinterest style): a tap navigates, a long-press
 * lifts a cover preview + action sheet over a dimmed backdrop. Uses `Pressable`'s
 * `onLongPress` — React Native guarantees `onPress` does not also fire when a long
 * press is recognised, so the card never navigates while opening the menu.
 *
 * (iOS uses the native UIContextMenu via Zeego; Android has no equivalent primitive
 * with a preview, so we render our own.)
 */
export function AndroidCardMenu({
  children,
  onTap,
  actions,
  preview,
  enabled = true,
  onMenuOpenChange,
  style,
}: AndroidCardMenuProps) {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const [open, setOpen] = useState(false);
  const anim = useRef(new Animated.Value(0)).current;

  const close = useCallback(
    (after?: () => void) => {
      Animated.timing(anim, { toValue: 0, duration: 140, useNativeDriver: true }).start(() => {
        setOpen(false);
        onMenuOpenChange?.(false);
        after?.();
      });
    },
    [anim, onMenuOpenChange],
  );

  const openMenu = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    onMenuOpenChange?.(true);
    setOpen(true);
    anim.setValue(0);
    Animated.spring(anim, { toValue: 1, useNativeDriver: true, friction: 9, tension: 90 }).start();
  }, [anim, onMenuOpenChange]);

  const handleTap = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    onTap();
  }, [onTap]);

  if (!enabled) {
    return (
      <Pressable onPress={handleTap} style={style}>
        {children}
      </Pressable>
    );
  }

  const previewWidth = preview ? Math.min(Math.round(width * 0.62), 248) : 0;
  const previewHeight = preview ? Math.round(previewWidth / 0.7) : 0;

  return (
    <>
      <Pressable onPress={handleTap} onLongPress={openMenu} delayLongPress={300} style={style}>
        {children}
      </Pressable>

      <Modal
        visible={open}
        transparent
        statusBarTranslucent
        animationType="none"
        onRequestClose={() => close()}
      >
        <View style={styles.root}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => close()}>
            <Animated.View style={[StyleSheet.absoluteFill, styles.scrim, { opacity: anim }]} />
          </Pressable>

          <View style={styles.center} pointerEvents="box-none">
            <Animated.View
              pointerEvents="box-none"
              style={[
                styles.block,
                {
                  opacity: anim,
                  transform: [{ scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1] }) }],
                },
              ]}
            >
              {preview ? (
                <RNImage
                  source={{ uri: preview.uri }}
                  style={[styles.preview, { width: previewWidth, height: previewHeight }]}
                  resizeMode="cover"
                />
              ) : null}

              <View style={[styles.actions, { backgroundColor: theme.colors.panel, borderColor: theme.colors.border }]}>
                {actions.map((action, index) => {
                  const iconName = action.icon ? SF_TO_IONICON[action.icon] : undefined;
                  const color = action.destructive ? theme.colors.dangerText : theme.colors.text;
                  return (
                    <Pressable
                      key={action.key}
                      onPress={() => close(() => action.onSelect())}
                      android_ripple={{ color: theme.colors.border }}
                      style={[
                        styles.actionRow,
                        index > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.colors.border },
                      ]}
                    >
                      <Text style={[styles.actionLabel, { color }]} numberOfLines={1}>
                        {action.title}
                      </Text>
                      {iconName ? <Ionicons name={iconName as never} size={20} color={color} /> : null}
                    </Pressable>
                  );
                })}
              </View>
            </Animated.View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  scrim: {
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  center: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
  },
  block: {
    alignItems: 'center',
    gap: 16,
    maxWidth: 360,
    width: '100%',
  },
  preview: {
    borderRadius: 18,
    backgroundColor: 'rgba(127,127,127,0.2)',
  },
  actions: {
    width: '100%',
    maxWidth: 280,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 15,
    gap: 16,
  },
  actionLabel: {
    flexShrink: 1,
    fontSize: 16,
    fontWeight: '600',
  },
});
