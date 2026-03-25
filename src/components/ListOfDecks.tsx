import React, { useRef, useState } from 'react';
import {
  FlatList,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';

import { Deck } from '@/assets/data/decks';
import { Text } from '@/src/components/Themed';
import { useLanguage } from '@/src/contexts/LanguageContext';
import Feather from '@expo/vector-icons/Feather';

export interface ListOfDecksProps {
  decks?: Deck[];
  cardCounts?: Record<string, number>;
  onPressDeck?: (deck: Deck) => void;
  onEditDeck?: (deck: Deck) => void;
  onDeleteDeck?: (deck: Deck) => void;
  showPrivate?: boolean;
  readOnly?: boolean;
  listHeaderComponent?: React.ReactElement | null;
}

function DeckCardInner({
  item,
  count,
  hasCover,
  onPress,
  onEdit,
  onDelete,
  readOnly,
  t,
}: {
  item: Deck;
  count: number;
  hasCover: boolean;
  onPress: () => void;
  onEdit: () => void;
  onDelete: () => void;
  readOnly?: boolean;
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

  return (
    <View style={styles.card}>
      <TouchableOpacity
        style={styles.cardTouchable}
        onPress={onPress}
        activeOpacity={0.85}
        accessibilityRole="button"
      >
        {hasCover && (
          <Image source={{ uri: item.cover_image_url! }} style={styles.cover} resizeMode="cover" />
        )}
        <View style={[styles.cardContent, !hasCover && styles.cardContentNoCover]}>
          <View style={styles.cardIcon}>
            <Feather name="layers" size={20} color="#4255ff" />
          </View>
          <View style={styles.cardBody}>
            <Text style={styles.title} numberOfLines={2}>
              {item.title}
            </Text>
            {item.description ? (
              <Text style={styles.description} numberOfLines={2}>
                {item.description}
              </Text>
            ) : null}
            <Text style={styles.meta}>
              {count} {count !== 1 ? t('cards') : t('card')}
              {item.is_public ? ` • ${t('public')}` : ` • ${t('private')}`}
            </Text>
          </View>
          <View style={styles.cardActions}>
            {!readOnly && (
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
              <TouchableOpacity style={styles.menuItem} onPress={handleEdit}>
                <Feather name="edit-2" size={18} color="#1f2937" />
                <Text style={styles.menuItemText}>{t('editBoard')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.menuItem, styles.menuItemDanger]} onPress={handleDelete}>
                <Feather name="trash-2" size={18} color="#dc2626" />
                <Text style={[styles.menuItemText, styles.menuItemTextDanger]}>{t('deleteBoard')}</Text>
              </TouchableOpacity>
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
  onPressDeck,
  onEditDeck,
  onDeleteDeck,
  showPrivate = true,
  readOnly = false,
  listHeaderComponent = null,
}: ListOfDecksProps) {
  const { t } = useLanguage();
  const data = React.useMemo(() => decks.filter((d) => showPrivate || d.is_public), [decks, showPrivate]);

  const renderItem = ({ item }: { item: Deck }) => {
    const count = cardCounts[item.deck_id] ?? 0;
    const hasCover = Boolean(item.cover_image_url);

    return (
      <DeckCardInner
        item={item}
        count={count}
        hasCover={hasCover}
        onPress={() => onPressDeck?.(item)}
        onEdit={() => onEditDeck?.(item)}
        onDelete={() => onDeleteDeck?.(item)}
        readOnly={readOnly}
        t={t}
      />
    );
  };

  return (
    <View style={styles.listWrapper}>
      <FlatList
        data={data}
        keyExtractor={(d) => String(d.deck_id)}
        renderItem={renderItem}
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
    maxWidth: 640,
    alignSelf: 'center',
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
  cardTouchable: {
    overflow: 'hidden',
    borderRadius: 12,
  },
  cover: {
    width: '100%',
    height: 120,
    backgroundColor: '#e5e7eb',
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  cardContentNoCover: {
    paddingTop: 16,
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
  meta: {
    marginTop: 6,
    fontSize: 13,
    color: '#9ca3af',
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
