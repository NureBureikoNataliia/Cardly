import React, { useRef, useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';

import { Text } from './Themed';
import { useLanguage } from '@/src/contexts/LanguageContext';

type Locale = 'en' | 'uk';

const LOCALES: { value: Locale; labelKey: string }[] = [
  { value: 'en', labelKey: 'langEnglish' },
  { value: 'uk', labelKey: 'langUkrainian' },
];

export function LanguageDropdown() {
  const { locale, setLocale, t } = useLanguage();
  const [visible, setVisible] = useState(false);
  const [layout, setLayout] = useState<{ x: number; y: number } | null>(null);
  const buttonRef = useRef<View>(null);

  const openDropdown = () => {
    buttonRef.current?.measureInWindow((x, y, width, height) => {
      const dropdownWidth = 140;
      const left = Math.max(8, x + width - dropdownWidth);
      setLayout({ x: left, y: y + height + 6 });
      setVisible(true);
    });
  };

  const selectLocale = (value: Locale) => {
    setLocale(value);
    setVisible(false);
  };

  const displayLabel = locale === 'en' ? 'EN' : 'УК';

  return (
    <>
      <Pressable
        ref={buttonRef}
        onPress={openDropdown}
        style={styles.button}
        hitSlop={8}
      >
        <Text style={styles.buttonText}>{displayLabel}</Text>
      </Pressable>

      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={() => setVisible(false)}
      >
        <Pressable style={styles.overlay} onPress={() => setVisible(false)}>
          {layout && (
            <View style={[styles.dropdown, { left: Math.max(8, layout.x), top: layout.y }]}>
              {LOCALES.map(({ value, labelKey }) => (
                <TouchableOpacity
                  key={value}
                  style={[styles.option, value === locale && styles.optionSelected]}
                  onPress={() => selectLocale(value)}
                >
                  <Text style={[styles.optionText, value === locale && styles.optionTextSelected]}>
                    {t(labelKey)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: 'rgba(224, 218, 255, 0.7)',
    outlineStyle: 'none',
    outlineWidth: 0,
    shadowColor: 'rgba(167, 139, 250, 0.35)',
    shadowOffset: { width: -1, height: -1 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 0,
  },
  buttonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#6366f1',
    textShadowColor: 'rgba(99, 102, 241, 0.3)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 4,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  dropdown: {
    position: 'absolute',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 6,
    minWidth: 140,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  option: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  optionSelected: {
    backgroundColor: 'rgba(66, 85, 255, 0.08)',
  },
  optionText: {
    fontSize: 16,
    color: '#1f2937',
  },
  optionTextSelected: {
    color: '#4255ff',
    fontWeight: '600',
  },
});
