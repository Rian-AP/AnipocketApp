import { Image } from 'expo-image';
import { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { CardContextMenu, CardMenuAction } from '@/components/CardContextMenu';
import { useAnimeCardActions } from '@/components/useAnimeCardActions';
import { AnimeTitle, getTitleText } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import { useTheme } from '@/lib/theme';

interface AnimeListItem {
  id: string;
  title: AnimeTitle;
  cover?: string | null;
  episode?: string | null;
  synopsis?: string | null;
  dub?: boolean;
  studio?: string | null;
}

interface AnimeCardProps {
  item: AnimeListItem;
  onPress: (id: string) => void;
  variant?: 'compact' | 'wide' | 'grid';
  /**
   * Native long-press preview + context menu (Apple Music style) via Zeego.
   * @default true
   */
  previewMenu?: boolean;
  /**
   * Override the default anime actions (Open / Bookmark / Download / Share) with a
   * custom set — e.g. offline downloads use Play / Delete. The cover preview is kept.
   */
  menuActions?: CardMenuAction[];
}

export function AnimePosterCard({ item, onPress, variant = 'compact', previewMenu = true, menuActions }: AnimeCardProps) {
  const { t, language } = useI18n();
  const theme = useTheme();
  const wide = variant === 'wide';
  const grid = variant === 'grid';
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [imageError, setImageError] = useState(false);

  const open = () => onPress(item.id);

  // Default anime actions. The bookmark lookup is skipped when the menu is hidden or
  // when the caller supplies its own actions.
  const defaultActions = useAnimeCardActions({
    id: item.id,
    title: item.title,
    cover: item.cover,
    onOpen: open,
    enabled: previewMenu && !menuActions,
  });
  const actions = menuActions ?? defaultActions;

  const cardBody = (
      <View style={[styles.surface, grid && styles.surfaceGrid]}>
        {item.cover && !imageError ? (
          <Image
            source={item.cover}
            style={[styles.cover, wide ? styles.coverWide : grid ? styles.coverGrid : styles.coverCompact]}
            contentFit="cover"
            onError={() => setImageError(true)}
          />
        ) : (
          <View
            style={[
              styles.cover,
              wide ? styles.coverWide : grid ? styles.coverGrid : styles.coverCompact,
              styles.coverFallback,
            ]}
          >
            <Text style={styles.coverFallbackText}>{t('anime.noCover')}</Text>
          </View>
        )}

        <View style={[styles.body, grid && styles.bodyGrid]}>
          <Text numberOfLines={grid ? 3 : 2} style={[styles.title, wide && styles.titleWide, grid && styles.titleGrid]}>
            {getTitleText(item.title, language)}
          </Text>

          {!grid && item.synopsis ? (
            <Text numberOfLines={3} style={styles.meta}>
              {item.synopsis}
            </Text>
          ) : null}

          <View style={styles.badgesRow}>
            {item.episode ? (
              <View style={[styles.badge, styles.badgeEpisode]}>
                <Text style={[styles.badgeText, styles.badgeEpisodeText]}>
                  {t('anime.episodeLabel', { number: item.episode })}
                </Text>
              </View>
            ) : null}

            {item.studio ? (
              <View style={[styles.badge, styles.badgeDub]}>
                <Text numberOfLines={1} style={[styles.badgeText, styles.badgeDubText]}>
                  {item.studio}
                </Text>
              </View>
            ) : null}
          </View>
        </View>
      </View>
  );

  const cardStyle = [styles.card, wide ? styles.cardWide : grid ? styles.cardGrid : styles.cardCompact];

  const preview = item.cover && !imageError ? { uri: item.cover } : null;

  return (
    <CardContextMenu
      onTap={open}
      actions={actions}
      preview={preview}
      enabled={previewMenu}
      style={cardStyle}
    >
      {cardBody}
    </CardContextMenu>
  );
}

const createStyles = (theme: ReturnType<typeof useTheme>) => StyleSheet.create({
  card: {
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.panel,
    marginBottom: 10,
  },
  cardCompact: {
    minHeight: 108,
  },
  cardWide: {
    width: 286,
    minHeight: 176,
    marginRight: 12,
  },
  cardGrid: {
    width: '100%',
    flex: 1,
    minHeight: 238,
    marginBottom: 0,
  },
  surface: {
    flexDirection: 'row',
    padding: 9,
    gap: 12,
    flex: 1,
  },
  surfaceGrid: {
    flexDirection: 'column',
    gap: 0,
    padding: 0,
  },
  cover: {
    borderRadius: 14,
    backgroundColor: theme.colors.panelSoft,
  },
  coverCompact: {
    width: 68,
    height: 92,
  },
  coverWide: {
    width: 104,
    height: 146,
  },
  coverGrid: {
    width: '100%',
    aspectRatio: 0.78,
    borderRadius: 14,
  },
  coverFallback: {
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  coverFallbackText: {
    color: theme.colors.muted,
    fontSize: 10,
    letterSpacing: 1,
  },
  body: {
    flex: 1,
    justifyContent: 'space-between',
  },
  bodyGrid: {
    flex: 1,
    justifyContent: 'space-between',
    gap: 10,
    paddingHorizontal: 10,
    paddingTop: 10,
    paddingBottom: 10,
  },
  title: {
    color: theme.colors.text,
    fontSize: 16,
    lineHeight: 21,
    fontWeight: '700',
  },
  titleWide: {
    fontSize: 17,
  },
  titleGrid: {
    fontSize: 15,
    lineHeight: 20,
    // Reserve the full 3-line height so every grid card is the same height (the
    // native context-menu wrapper sizes to content and can't stretch cards to an
    // equal row height the way a plain flex child would). Covers are already uniform.
    minHeight: 60,
  },
  meta: {
    color: theme.colors.muted,
    fontSize: 12,
    marginTop: 6,
    lineHeight: 17,
  },
  badgesRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
    width: '100%',
    minWidth: 0,
  },
  badge: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  badgeEpisode: {
    backgroundColor: theme.colors.accentSurface,
  },
  badgeDub: {
    backgroundColor: theme.colors.warningSurface,
    flexShrink: 1,
    minWidth: 0,
    maxWidth: '100%',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  badgeEpisodeText: {
    color: theme.colors.text,
  },
  badgeDubText: {
    color: theme.colors.warningText,
    flexShrink: 1,
  },
});
