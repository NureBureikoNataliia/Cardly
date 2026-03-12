import Feather from '@expo/vector-icons/Feather';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
} from 'react-native';

import { Deck } from '@/assets/data/decks';
import { Text, View } from '@/src/components/Themed';
import { supabase } from '@/src/lib/supabase';
import ConfirmModal from '@/src/components/ConfirmModal';
import { useLanguage } from '@/src/contexts/LanguageContext';

export default function AddCardScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const deckId = Array.isArray(params.deckId) ? params.deckId[0] : (typeof params.deckId === 'string' ? params.deckId : null);
  const cardId = Array.isArray(params.cardId) ? params.cardId[0] : (typeof params.cardId === 'string' ? params.cardId : null);
  const { t } = useLanguage();
  const [deck, setDeck] = useState<Deck | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [frontText, setFrontText] = useState('');
  const [backText, setBackText] = useState('');
  const [frontImageUrl, setFrontImageUrl] = useState('');
  const [backImageUrl, setBackImageUrl] = useState('');
  const [notes, setNotes] = useState('');
  const [initialFront, setInitialFront] = useState('');
  const [initialBack, setInitialBack] = useState('');
  const [initialFrontImage, setInitialFrontImage] = useState('');
  const [initialBackImage, setInitialBackImage] = useState('');
  const [initialNotes, setInitialNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorModal, setErrorModal] = useState<string | null>(null);

  useEffect(() => {
    if (!deckId) {
      setError(t('deckNotFound'));
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    const loadDeckAndCard = async () => {
      const [{ data: deckData, error: deckError }, { data: cardData, error: cardError }] = await Promise.all([
        supabase
        .from('decks')
        .select('*')
        .eq('deck_id', deckId)
        .single(),
        cardId
          ? supabase
              .from('cards')
              .select('*')
              .eq('card_id', cardId)
              .single()
          : Promise.resolve({ data: null, error: null }),
      ]);

      if (deckError || cardError) {
        setError(t('failedToLoadData'));
      } else {
        setDeck(deckData as Deck);
        const front = cardData?.front_text ?? '';
        const back = cardData?.back_text ?? '';
        const frontImg = cardData?.front_media_url ?? '';
        const backImg = cardData?.back_media_url ?? '';
        const notesVal = cardData?.notes ?? '';
        setFrontText(front);
        setBackText(back);
        setFrontImageUrl(frontImg);
        setBackImageUrl(backImg);
        setNotes(notesVal);
        setInitialFront(front);
        setInitialBack(back);
        setInitialFrontImage(frontImg);
        setInitialBackImage(backImg);
        setInitialNotes(notesVal);
      }
      setIsLoading(false);
    };

    loadDeckAndCard();
  }, [deckId, cardId, t]);

  if (isLoading) {
    return (
      <View style={[styles.flex, styles.loadingContainer]}>
        <ActivityIndicator size="large" color="#4255ff" />
      </View>
    );
  }

  if (!deck) {
    return (
      <View style={styles.flex}>
        <View style={[styles.container, { alignItems: 'center', justifyContent: 'center' }]}>
          <Text style={styles.deckName}>{error ?? t('deckNotFound')}</Text>
          <TouchableOpacity
            style={[styles.button, styles.cancelButton, { marginTop: 16, marginHorizontal: 16 }]}
            onPress={() => router.back()}
          >
            <Text style={styles.cancelButtonText}>{t('goBack')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const handleSave = async () => {
    if (!frontText.trim() || !backText.trim()) {
      return;
    }
    if (!cardId && !deckId) {
      setError(t('deckNotFound'));
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const frontMedia = frontImageUrl.trim() || null;
      const backMedia = backImageUrl.trim() || null;
      const { error: upsertError } = cardId
        ? await supabase
            .from('cards')
            .update({
              front_text: frontText.trim(),
              back_text: backText.trim(),
              front_media_url: frontMedia,
              back_media_url: backMedia,
              notes: notes.trim() || null,
              updated_at: new Date().toISOString(),
            })
            .eq('card_id', cardId)
        : await supabase
            .from('cards')
            .insert({
              deck_id: deckId,
              card_type: 'basic',
              front_text: frontText.trim(),
              back_text: backText.trim(),
              front_media_url: frontMedia,
              back_media_url: backMedia,
              notes: notes.trim() || null,
            });

      if (upsertError) {
        const msg = upsertError.message || t('failedToSaveCard');
        setError(msg);
        setIsSaving(false);
        setErrorModal(msg);
        return;
      }

      router.back();
    } catch (err) {
      const msg = err instanceof Error ? err.message : t('unexpectedError');
      setError(msg);
      setIsSaving(false);
      setErrorModal(msg);
    }
  };

  const isValid = frontText.trim().length > 0 && backText.trim().length > 0;
  const hasChanges = frontText !== initialFront || backText !== initialBack
    || frontImageUrl !== initialFrontImage || backImageUrl !== initialBackImage || notes !== initialNotes;

  return (
    <>
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.flex}
    >
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        <Text style={styles.deckName}>{deck.title}</Text>

        <View style={styles.formContainer}>
          <View style={styles.formGroup}>
            <Text style={styles.label}>{t('front')}</Text>
            <TextInput
              style={styles.input}
              placeholder={t('frontPlaceholder')}
              placeholderTextColor="#999"
              value={frontText}
              onChangeText={setFrontText}
              multiline
              textAlignVertical="top"
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>{t('frontImageUrl')}</Text>
            <TextInput
              style={[styles.input, styles.urlInput]}
              placeholder="https://..."
              placeholderTextColor="#999"
              value={frontImageUrl}
              onChangeText={setFrontImageUrl}
              autoCapitalize="none"
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>{t('back')}</Text>
            <TextInput
              style={styles.input}
              placeholder={t('backPlaceholder')}
              placeholderTextColor="#999"
              value={backText}
              onChangeText={setBackText}
              multiline
              textAlignVertical="top"
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>{t('backImageUrl')}</Text>
            <TextInput
              style={[styles.input, styles.urlInput]}
              placeholder="https://..."
              placeholderTextColor="#999"
              value={backImageUrl}
              onChangeText={setBackImageUrl}
              autoCapitalize="none"
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>{t('notes')}</Text>
            <TextInput
              style={[styles.input, { minHeight: 80 }]}
              placeholder={t('notesPlaceholder')}
              placeholderTextColor="#999"
              value={notes}
              onChangeText={setNotes}
              multiline
              textAlignVertical="top"
            />
          </View>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.button, styles.cancelButton]}
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Cancel"
          >
            <Text style={styles.cancelButtonText}>{t('cancel')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.button,
              styles.saveButton,
              hasChanges && isValid && styles.saveButtonModified,
              !isValid && styles.saveButtonDisabled
            ]}
            onPress={handleSave}
            disabled={!isValid || isSaving}
            accessibilityRole="button"
            accessibilityLabel={t('save')}
          >
            {isSaving ? (
              <Text style={styles.buttonText}>{t('saving')}...</Text>
            ) : (
              <>
                <Feather name="check" size={20} color="#fff" />
                <Text style={styles.buttonText}>{cardId ? t('update') : t('save')}</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>

    <ConfirmModal
      visible={Boolean(errorModal)}
      title={t('error')}
      message={errorModal ?? ''}
      confirmText={t('ok')}
      cancelText={null}
      onConfirm={() => setErrorModal(null)}
      onCancel={() => setErrorModal(null)}
    />
    </>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f3f4f6',
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    flexGrow: 1,
    justifyContent: 'space-between',
    paddingBottom: 16,
  },
  deckName: {
    fontSize: 16,
    fontWeight: '600',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    opacity: 0.7,
  },
  formContainer: {
    padding: 16,
  },
  formGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    minHeight: 100,
  },
  urlInput: {
    minHeight: 44,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  cancelButton: {
    backgroundColor: '#f0f0f0',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  saveButton: {
    backgroundColor: '#64B5F6',
  },
  saveButtonModified: {
    backgroundColor: '#4255ff',
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  errorText: {
    marginTop: 4,
    color: '#ef4444',
    fontSize: 13,
  },
});
