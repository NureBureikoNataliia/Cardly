import { StyleSheet, Image  } from 'react-native';

import EditScreenInfo from '@/src/components/EditScreenInfo';
import { Text, View } from '@/src/components/Themed';
import { cards } from '@/assets/data/cards';

export default function TabTwoScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{cards[11].back_text}</Text>
            {cards[11].back_media_url && <Image source={{ uri: cards[11].back_media_url }} style={{ width: 300, height: 200 }}/>}
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
});
