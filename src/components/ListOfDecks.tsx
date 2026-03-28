import React, { useRef, useState } from 'react';
import {
  FlatList,
  Image,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';

import { Deck } from '@/assets/data/decks';
import { Text } from '@/src/components/Themed';
import { useLanguage } from '@/src/contexts/LanguageContext';
import Feather from '@expo/vector-icons/Feather';

export interface ListOfDecksProps {
  decks?: Deck[];
  cardCounts?: Record<string, number>;
  ratingByDeckId?: Record<string, number>; // average rating (1..5)
  ratingCountByDeckId?: Record<string, number>; // number of ratings
  onPressDeck?: (deck: Deck) => void;
  onEditDeck?: (deck: Deck) => void;
  onDeleteDeck?: (deck: Deck) => void;
  showPrivate?: boolean;
  readOnly?: boolean;
  /** When set with readOnly (e.g. public decks), shows ⋮ → report flow. */
  onReportDeck?: (deck: Deck) => void;
  listHeaderComponent?: React.ReactElement | null;
}

function DeckCardInner({
  item,
  count,
  ratingAvg,
  ratingCount,
  hasCover,
  isGrid,
  onPress,
  onEdit,
  onDelete,
  readOnly,
  onReportDeck,
  t,
}: {
  item: Deck;
  count: number;
  ratingAvg: number;
  ratingCount: number;
  hasCover: boolean;
  isGrid: boolean;
  onPress: () => void;
  onEdit: () => void;
  onDelete: () => void;
  readOnly?: boolean;
  onReportDeck?: (deck: Deck) => void;
  t: (key: string) => string;
}) {
  const [menuVisible, setMenuVisible] = useState(false);
  const [menuLayout, setMenuLayout] = useState<{ x: number; y: number } | null>(null);
  const menuButtonRef = useRef<View>(null);

  const openMenu = () => {
    menuButtonRef.current?.measureInWindow((x, y, width, height) => {
      const left = Math.max(8, x + width - 160);
      setMenuLayout({ x: left, y: y + height + 4 });
      setMenuVisible(true);
    });
  };

  const handleEdit = () => {
    setMenuVisible(false);
    onEdit();
  };

  const handleDelete = () => {
    setMenuVisible(false);
    onDelete();
  };

  const handleReport = () => {
    setMenuVisible(false);
    onReportDeck?.(item);
  };

  return (
    <View style={[styles.card, isGrid && styles.cardGrid]}>
      <TouchableOpacity
        style={[styles.cardTouchable, isGrid && styles.cardTouchableGrid]}
        onPress={onPress}
        activeOpacity={0.85}
        accessibilityRole="button"
      >
        <View style={styles.coverWrap}>
          {hasCover ? (
            <Image source={{ uri: item.cover_image_url! }} style={styles.cover} resizeMode="cover" />
          ) : (
            <View style={styles.coverPlaceholder}>
              <Feather name="image" size={28} color="#b8c0d0" />
            </View>
          )}
        </View>
        <View style={[styles.cardContent, isGrid && styles.cardContentGrid]}>
          <View style={styles.cardIcon}>
            <Feather name="layers" size={20} color="#4255ff" />
          </View>
          <View style={[styles.cardBody, isGrid && styles.cardBodyGrid]}>
            <View style={isGrid ? styles.titleSlot : undefined}>
              <Text style={styles.title} numberOfLines={2}>
                {item.title}
              </Text>
            </View>
            {(item.description || isGrid) && (
              <View style={isGrid ? styles.descriptionSlot : undefined}>
                <Text
                  style={[styles.description, isGrid && styles.descriptionInGrid]}
                  numberOfLines={2}
                >
                  {item.description ? item.description : '\u00a0'}
                </Text>
              </View>
            )}
            <Text style={styles.meta}>
              {count} {count !== 1 ? t('cards') : t('card')}
              {item.is_public ? ` • ${t('public')}` : ` • ${t('private')}`}
            </Text>
            <View style={styles.ratingSlot}>
              {ratingCount > 0 ? (
                <View style={styles.ratingRow}>
                  <Feather name="star" size={14} color="#f59e0b" />
                  <Text style={styles.ratingText}>
                    {ratingAvg.toFixed(1)} ({ratingCount})
                  </Text>
                </View>
              ) : null}
            </View>
          </View>
          <View style={styles.cardActions}>
            {(!readOnly || onReportDeck) && (
              <Pressable
                ref={menuButtonRef}
                onPress={(e) => {
                  e?.stopPropagation?.();
                  openMenu();
                }}
                style={styles.menuButton}
                hitSlop={8}
              >
                <Feather name="more-vertical" size={20} color="#9ca3af" />
              </Pressable>
            )}
            <Feather name="chevron-right" size={20} color="#9ca3af" />
          </View>
        </View>
      </TouchableOpacity>

      <Modal
        visible={menuVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuVisible(false)}
      >
        <Pressable style={styles.menuOverlay} onPress={() => setMenuVisible(false)}>
          {menuLayout && (
            <View style={[styles.menuCard, { left: menuLayout.x, top: menuLayout.y }]}>
              {readOnly && onReportDeck ? (
                <TouchableOpacity style={styles.menuItem} onPress={handleReport}>
                  <Feather name="flag" size={18} color="#1f2937" />
                  <Text style={styles.menuItemText}>{t('reportBoard')}</Text>
                </TouchableOpacity>
              ) : (
                <>
                  <TouchableOpacity style={styles.menuItem} onPress={handleEdit}>
                    <Feather name="edit-2" size={18} color="#1f2937" />
                    <Text style={styles.menuItemText}>{t('editBoard')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.menuItem, styles.menuItemDanger]} onPress={handleDelete}>
                    <Feather name="trash-2" size={18} color="#dc2626" />
                    <Text style={[styles.menuItemText, styles.menuItemTextDanger]}>{t('deleteBoard')}</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          )}
        </Pressable>
      </Modal>
    </View>
  );
}

export function ListOfDecks({
  decks = [],
  cardCounts = {},
  ratingByDeckId = {},
  ratingCountByDeckId = {},
  onPressDeck,
  onEditDeck,
  onDeleteDeck,
  showPrivate = true,
  readOnly = false,
  onReportDeck,
  listHeaderComponent = null,
}: ListOfDecksProps) {
  const { t } = useLanguage();
  const { width } = useWindowDimensions();

  // Wide web: 3 columns; narrow / native: 1
  const numColumns = Platform.OS === 'web' && width >= 900 ? 3 : 1;

  const data = React.useMemo(() => decks.filter((d) => showPrivate || d.is_public), [decks, showPrivate]);

  const renderItem = ({ item }: { item: Deck }) => {
    const count = cardCounts[item.deck_id] ?? 0;
    const ratingCount = ratingCountByDeckId[item.deck_id] ?? 0;
    const ratingAvg = ratingByDeckId[item.deck_id] ?? 0;
    const hasCover = Boolean(item.cover_image_url);

    const isGrid = numColumns > 1;

    return (
      <View style={isGrid ? styles.gridCell : undefined}>
        <DeckCardInner
          item={item}
          count={count}
          ratingAvg={ratingAvg}
          ratingCount={ratingCount}
          hasCover={hasCover}
          isGrid={isGrid}
          onPress={() => onPressDeck?.(item)}
          onEdit={() => onEditDeck?.(item)}
          onDelete={() => onDeleteDeck?.(item)}
          readOnly={readOnly}
          onReportDeck={onReportDeck}
          t={t}
        />
      </View>
    );
  };

  return (
    <View style={styles.listWrapper}>
      <FlatList
        data={data}
        keyExtractor={(d) => String(d.deck_id)}
        renderItem={renderItem}
        numColumns={numColumns}
        key={numColumns}
        columnWrapperStyle={numColumns > 1 ? styles.gridRow : undefined}
        ListHeaderComponent={listHeaderComponent}
        style={styles.list}
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

export default ListOfDecks;

const styles = StyleSheet.create({
  listWrapper: {
    flex: 1,
    width: '100%',
  },
  container: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 100,
  },
  list: {
    flex: 1,
    width: '100%',
  },
  gridRow: {
    alignItems: 'stretch',
  },
  gridCell: {
    flex: 1,
    margin: 6,
    minWidth: 0,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'visible',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },
  cardGrid: {
    flex: 1,
  },
  cardTouchable: {
    overflow: 'hidden',
    borderRadius: 12,
  },
  cardTouchableGrid: {
    flex: 1,
    flexDirection: 'column',
  },
  coverWrap: {
    width: '100%',
    height: 120,
    backgroundColor: '#e8ecf2',
  },
  cover: {
    width: '100%',
    height: '100%',
    backgroundColor: '#e5e7eb',
  },
  coverPlaceholder: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#eef1f6',
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  cardContentGrid: {
    flex: 1,
    alignItems: 'center',
  },
  cardIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: 'rgba(66, 85, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBody: {
    flex: 1,
    minWidth: 0,
  },
  cardBodyGrid: {
    flexGrow: 1,
  },
  titleSlot: {
    minHeight: 48,
    justifyContent: 'flex-start',
  },
  descriptionSlot: {
    marginTop: 4,
    minHeight: 44,
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  menuButton: {
    padding: 4,
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1f2937',
  },
  description: {
    marginTop: 4,
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
  },
  descriptionInGrid: {
    marginTop: 0,
  },
  meta: {
    marginTop: 6,
    fontSize: 13,
    color: '#9ca3af',
  },
  ratingSlot: {
    minHeight: 22,
    marginTop: 6,
    justifyContent: 'center',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  ratingText: {
    fontSize: 13,
    color: '#f59e0b',
    fontWeight: '700',
  },
  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuCard: {
    position: 'absolute',
    backgroundColor: '#fff',
    borderRadius: 10,
    paddingVertical: 6,
    minWidth: 160,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  menuItemDanger: {},
  menuItemText: {
    fontSize: 16,
    color: '#1f2937',
  },
  menuItemTextDanger: {
    color: '#dc2626',
  },
});
