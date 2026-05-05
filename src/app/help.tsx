import { Text, View } from '@/src/components/Themed';
import React from 'react';
import { Platform, ScrollView, StyleSheet } from 'react-native';
import { useLanguage } from '@/src/contexts/LanguageContext';

export default function HelpScreen() {
  const { t } = useLanguage();
  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={Platform.OS === 'web'}
      >
        <Text style={styles.title}>{t('help')}</Text>
        <Text>{t('helpPlaceholder')}</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  container: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 8,
  },
});