import Feather from '@expo/vector-icons/Feather';
import { StyleSheet, TouchableOpacity } from 'react-native';

import ListOfDecks from '@/src/components/ListOfDecks';
import { View } from '@/src/components/Themed';

export default function MainScreen() {
  return (
    <View style={styles.container}>
      <ListOfDecks />

      <TouchableOpacity
        style={styles.fab}
        onPress={() => console.log('Add deck')}
        accessibilityRole="button"
        accessibilityLabel="Add deck"
      >
        <Feather name="plus" size={24} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  separator: {
    marginVertical: 30,
    height: 1,
    width: '80%',
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#2fdc38ff',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.5,
  },
});
