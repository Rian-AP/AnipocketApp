import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { InteractionManager, Share } from 'react-native';

import type { CardMenuAction } from '@/components/CardContextMenu';
import { AnimeTitle, getTitleText } from '@/lib/api';
import { addBookmark, isBookmarked, removeBookmark } from '@/lib/bookmarks';
import { useI18n } from '@/lib/i18n';

/**
 * Builds the standard anime long-press actions (Open / Bookmark / Download / Share)
 * shared by every anime card surface — poster grid, hero carousel, etc. Bookmark
 * state is resolved lazily and reflected in the action's title + icon.
 */
export function useAnimeCardActions(params: {
  id: string;
  title: AnimeTitle;
  cover?: string | null;
  /** Invoked by the "Open" action (and typically the card tap too). */
  onOpen: () => void;
  /** Skip the bookmark lookup when the menu isn't shown. @default true */
  enabled?: boolean;
}): CardMenuAction[] {
  const { id, title, cover, onOpen, enabled = true } = params;
  const { t, language } = useI18n();
  const [bookmarked, setBookmarked] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    const task = InteractionManager.runAfterInteractions(() => {
      void isBookmarked(id).then((value) => {
        if (!cancelled) setBookmarked(value);
      });
    });
    return () => {
      cancelled = true;
      task.cancel();
    };
  }, [id, enabled]);

  const toggleBookmark = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    if (bookmarked) {
      setBookmarked(false);
      void removeBookmark(id);
    } else {
      setBookmarked(true);
      void addBookmark({
        animeId: id,
        animeTitle: getTitleText(title, language),
        animeTitleByLanguage: title,
        cover: cover ?? null,
      });
    }
  };

  const shareAnime = () => {
    void Share.share({
      message: getTitleText(title, language),
      url: `anipocket://anime/${id}`,
    }).catch(() => {});
  };

  return [
    {
      key: 'open',
      title: t('contextMenu.open'),
      icon: 'arrow.up.forward.app',
      onSelect: onOpen,
    },
    {
      key: 'bookmark',
      title: bookmarked ? t('contextMenu.removeBookmark') : t('contextMenu.addBookmark'),
      icon: bookmarked ? 'bookmark.slash' : 'bookmark',
      onSelect: toggleBookmark,
    },
    {
      key: 'download',
      title: t('contextMenu.download'),
      icon: 'arrow.down.circle',
      onSelect: () => router.push({ pathname: '/download-modal' as never, params: { animeId: id } }),
    },
    {
      key: 'share',
      title: t('contextMenu.share'),
      icon: 'square.and.arrow.up',
      onSelect: shareAnime,
    },
  ];
}
