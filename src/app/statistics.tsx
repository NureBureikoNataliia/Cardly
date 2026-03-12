import { Text, View } from '@/src/components/Themed';
import React from 'react';
import { StyleSheet } from 'react-native';
import { useLanguage } from '@/src/contexts/LanguageContext';

export default function StatisticsScreen() {
  const { t } = useLanguage();
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('statistics')}</Text>
      <Text>{t('statisticsPlaceholder')}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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