import React from 'react';
import { FlatList, Image, StyleSheet, TouchableOpacity } from 'react-native';

import { cards } from '@/assets/data/cards';
import { Deck, decks as defaultDecks } from '@/assets/data/decks';
import { Text, View } from '@/src/components/Themed';

export interface ListOfDecksProps {
  decks?: Deck[];
  onPressDeck?: (deck: Deck) => void;
  showPrivate?: boolean; // whether to include private decks (default true)
}

export function ListOfDecks({ decks = defaultDecks, onPressDeck, showPrivate = true }: ListOfDecksProps) {
  const cardCounts = React.useMemo(() => {
    const m = new Map<number, number>();
    for (const c of cards) {
      m.set(c.deck_id, (m.get(c.deck_id) ?? 0) + 1);
    }
    return m;
  }, []);

  const data = React.useMemo(() => decks.filter((d) => showPrivate || d.is_public), [decks, showPrivate]);

  const renderItem = ({ item }: { item: Deck }) => {
    const count = cardCounts.get(item.deck_id) ?? 0;
    const hasCover = Boolean(item.cover_image_url);

    return (
      <TouchableOpacity accessibilityRole="button" style={styles.item} onPress={() => onPressDeck?.(item)}>
        <View style={styles.info}>
          <Text style={styles.title}>{item.title}</Text>
          {item.description ? <Text style={styles.description}>{item.description}</Text> : null}
          <Text style={styles.meta}>{count} card{count !== 1 ? 's' : ''} • {item.is_public ? 'Public' : 'Private'}</Text>
        </View>

        {hasCover && (
          <Image
            source={{ uri: item.cover_image_url! }}
            style={styles.cover}
            resizeMode="cover"
          />
        )}
      </TouchableOpacity>
    );
  };

  return (
    <FlatList
      data={data}
      keyExtractor={(d) => String(d.deck_id)}
      renderItem={renderItem}
      style={styles.list}
      contentContainerStyle={styles.container}
      ItemSeparatorComponent={() => <View style={styles.separator} />}
    />
  );
}

export default ListOfDecks;

const styles = StyleSheet.create({
  container: {
    paddingVertical: 8,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  cover: {
    width: 96,
    height: 64,
    borderRadius: 8,
    backgroundColor: '#eaeaea',
    marginLeft: 12,
  },
  info: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
  },
  description: {
    marginTop: 4,
    fontSize: 13,
    color: '#666',
  },
  meta: {
    marginTop: 6,
    fontSize: 12,
    color: '#888',
  },
  list: {
    flex: 1,
    width: '100%',
  },
  separator: {
    height: 1,
    marginHorizontal: 12,
    backgroundColor: '#efefef',
  },
});