import { useCallback, useEffect, useRef, useState } from 'react';
import { NativeScrollEvent, NativeSyntheticEvent } from 'react-native';

const DEFAULT_PAGE_SIZE = 20;

/**
 * Client-side infinite scroll hook.
 *
 * Takes a full sorted/filtered array and exposes a growing visible slice.
 * Call `loadMore()` to show the next page, or use `onScroll` on a ScrollView
 * to trigger automatically near the bottom.
 *
 * When `items` changes (e.g. filter/search update) the visible count resets to
 * the first page so the user always sees fresh results from the top.
 */
export function useInfiniteScroll<T>(
  items: T[],
  pageSize: number = DEFAULT_PAGE_SIZE,
) {
  const [visibleCount, setVisibleCount] = useState(pageSize);
  // Track the identity of the source array to reset on filter/search changes.
  const prevItemsRef = useRef(items);

  // Reset to first page whenever the source list reference changes.
  useEffect(() => {
    if (prevItemsRef.current !== items) {
      prevItemsRef.current = items;
      setVisibleCount(pageSize);
    }
  }, [items, pageSize]);

  const visibleItems = items.slice(0, visibleCount);
  const hasMore = visibleCount < items.length;

  const loadMore = useCallback(() => {
    if (hasMore) {
      setVisibleCount((prev) => Math.min(prev + pageSize, items.length));
    }
  }, [hasMore, pageSize, items.length]);

  /**
   * Attach this to a ScrollView's onScroll prop.
   * Triggers loadMore when the user is within `threshold` px of the bottom.
   */
  const onScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>, threshold = 200) => {
      const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
      const distanceFromBottom =
        contentSize.height - layoutMeasurement.height - contentOffset.y;
      if (distanceFromBottom < threshold && hasMore) {
        loadMore();
      }
    },
    [hasMore, loadMore],
  );

  return {
    visibleItems,
    hasMore,
    loadMore,
    onScroll,
    totalCount: items.length,
  };
}
