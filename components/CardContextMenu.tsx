import * as Haptics from 'expo-haptics';
import { useRef } from 'react';
import { Image as RNImage, Platform, Pressable, StyleProp, ViewStyle } from 'react-native';
import * as ContextMenu from 'zeego/context-menu';

import { AndroidCardMenu } from './AndroidCardMenu';

export type CardMenuAction = {
  key: string;
  title: string;
  /** SF Symbol name (iOS). */
  icon?: string;
  destructive?: boolean;
  onSelect: () => void;
};

interface CardContextMenuProps {
  children: React.ReactNode;
  /** Fired on a genuine tap (never when a long-press opened the menu). */
  onTap: () => void;
  actions: CardMenuAction[];
  /** Optional cover preview shown on long-press (Apple Music style). */
  preview?: { uri: string; width?: number; height?: number } | null;
  /** When false, renders a plain tappable wrapper with no menu. */
  enabled?: boolean;
  /**
   * Notified when the menu is about to open (`true`) / close (`false`). Useful for
   * pausing animations behind the menu (e.g. a carousel auto-advance) so the trigger
   * isn't scrolled/unmounted while the native menu is presented.
   */
  onMenuOpenChange?: (open: boolean) => void;
  style?: StyleProp<ViewStyle>;
}

/**
 * Wraps any card with a native long-press context menu + tap-to-open. iOS uses the
 * native UIContextMenu (via Zeego); Android renders a Pinterest-style preview + action
 * sheet ({@link AndroidCardMenu}) since it has no equivalent native primitive.
 */
export function CardContextMenu(props: CardContextMenuProps) {
  if (Platform.OS === 'android') {
    return <AndroidCardMenu {...props} />;
  }
  return <IosCardMenu {...props} />;
}

/**
 * iOS implementation. Centralises the gesture handling that keeps tap and long-press
 * from colliding: `onOpenWillChange` flags the menu BEFORE it appears, and the tap is
 * deferred + guarded so navigating never races the menu gesture (which crashes —
 * zeego#61) and a long-press never also navigates (zeego#145).
 */
function IosCardMenu({
  children,
  onTap,
  actions,
  preview,
  enabled = true,
  onMenuOpenChange,
  style,
}: CardContextMenuProps) {
  const menuActiveRef = useRef(false);

  const handleTap = () => {
    if (menuActiveRef.current) return;
    setTimeout(() => {
      if (menuActiveRef.current) return;
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      onTap();
    }, 60);
  };

  const trigger = (
    <Pressable onPress={handleTap} style={style}>
      {children}
    </Pressable>
  );

  if (!enabled) {
    return trigger;
  }

  const previewWidth = preview?.width ?? 200;
  const previewHeight = preview?.height ?? Math.round(previewWidth / 0.7);

  return (
    // Zeego's native ContextMenuView sizes to its intrinsic content (it ignores
    // flexGrow), so callers must give `children` a concrete/intrinsic size — don't
    // rely on flex-fill through this wrapper.
    <ContextMenu.Root
      // `onOpenWillChange` maps to the native iOS onMenuWillShow/Hide (fires before
      // the menu appears) but isn't in Zeego's Radix-based prop types, hence the cast.
      {...({ onOpenWillChange: (willOpen: boolean) => { menuActiveRef.current = willOpen; onMenuOpenChange?.(willOpen); } } as any)}
    >
      <ContextMenu.Trigger>{trigger}</ContextMenu.Trigger>

      <ContextMenu.Content>
        {preview ? (
          <ContextMenu.Preview backgroundColor="clear">
            {() => (
              <RNImage
                source={{ uri: preview.uri }}
                style={{ width: previewWidth, height: previewHeight }}
                resizeMode="cover"
              />
            )}
          </ContextMenu.Preview>
        ) : null}

        {actions.map((action) => (
          <ContextMenu.Item key={action.key} destructive={action.destructive} onSelect={action.onSelect}>
            <ContextMenu.ItemTitle>{action.title}</ContextMenu.ItemTitle>
            {action.icon ? <ContextMenu.ItemIcon ios={{ name: action.icon as never }} /> : null}
          </ContextMenu.Item>
        ))}
      </ContextMenu.Content>
    </ContextMenu.Root>
  );
}
