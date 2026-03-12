import Feather from '@expo/vector-icons/Feather';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  TextInput,
  TouchableOpacity,
} from 'react-native';

import { supabase } from '@/src/lib/supabase';
import { useAuth } from '@/src/contexts/AuthContext';
import { useLanguage } from '@/src/contexts/LanguageContext';
import { Text, View } from '@/src/components/Themed';

export default function AddDeckScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ deckId?: string }>();
  const deckId = typeof params.deckId === 'string' ? params.deckId : Array.isArray(params.deckId) ? params.deckId[0] : undefined;
  const { user } = useAuth();
  const { t } = useLanguage();
  const isEdit = Boolean(deckId);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [coverUrl, setCoverUrl] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(isEdit);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!deckId || !user) return;
    (async () => {
      const { data, error: fetchError } = await supabase
        .from('decks')
        .select('*')
        .eq('deck_id', deckId)
        .eq('creator_id', user.id)
        .single();
      if (fetchError || !data) {
        setError(t('deckNotFoundOrNoAccess'));
        return;
      }
      setTitle(data.title ?? '');
      setDescription(data.description ?? '');
      setCoverUrl(data.cover_image_url ?? '');
      setIsPublic(data.is_public ?? true);
    })().finally(() => setIsLoading(false));
  }, [deckId, user]);

  const isValid = title.trim().length > 0;

  const handleSave = async () => {
    if (!user) {
      setError(t('mustBeLoggedIn'));
      return;
    }
    if (!isValid || isSaving) return;

    setIsSaving(true);
    setError(null);

    if (isEdit && deckId) {
      const { error: updateError } = await supabase
        .from('decks')
        .update({
          title: title.trim(),
          description: description.trim() || null,
          cover_image_url: coverUrl.trim() || null,
          is_public: isPublic,
        })
        .eq('deck_id', deckId)
        .eq('creator_id', user.id);

      if (updateError) {
        const msg = updateError.message || 'Failed to update deck. Please try again.';
        setError(msg);
        setIsSaving(false);
        return;
      }
    } else {
      const { error: insertError } = await supabase
        .from('decks')
        .insert({
          creator_id: user.id,
          title: title.trim(),
          description: description.trim() || null,
          cover_image_url: coverUrl.trim() || null,
          is_public: isPublic,
        })
        .select('*')
        .single();

      if (insertError) {
        setError(insertError.message || 'Failed to create deck. Please try again.');
        setIsSaving(false);
        return;
      }
    }

    router.back();
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.flex}
    >
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        <View style={styles.header}>
          <Text style={styles.screenTitle}>{isEdit ? t('editDeck') : t('createNewDeck')}</Text>
          <Text style={styles.screenSubtitle}>
            {isEdit ? t('deckSubtitleEdit') : t('deckSubtitleCreate')}
          </Text>
        </View>

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#2563eb" />
          </View>
        ) : (
          <>
        <View style={styles.formCard}>
          <View style={[styles.formGroup, styles.formGroupFirst]}>
            <Text style={styles.label}>
              {t('title')} <Text style={styles.requiredMark}>*</Text>
            </Text>
            <TextInput
              style={styles.input}
              placeholder={t('title')}
              placeholderTextColor="#999"
              value={title}
              onChangeText={setTitle}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>{t('description')}</Text>
            <TextInput
              style={[styles.input, styles.multilineInput]}
              placeholder={t('description')}
              placeholderTextColor="#999"
              value={description}
              onChangeText={setDescription}
              multiline
              textAlignVertical="top"
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>{t('coverImageUrl')}</Text>
            <TextInput
              style={styles.input}
              placeholder="https://..."
              placeholderTextColor="#999"
              value={coverUrl}
              onChangeText={setCoverUrl}
              autoCapitalize="none"
            />
          </View>

          <View style={[styles.formGroup, styles.switchRow]}>
            <View>
              <Text style={styles.label}>{t('publicDeck')}</Text>
              <Text style={styles.helperText}>{t('publicDeckHelp')}</Text>
            </View>
            <Switch value={isPublic} onValueChange={setIsPublic} />
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
              (!isValid || isSaving) && styles.saveButtonDisabled,
            ]}
            onPress={handleSave}
            disabled={!isValid || isSaving}
            accessibilityRole="button"
            accessibilityLabel={isEdit ? t('update') : t('create')}
          >
            {isSaving ? (
              <Text style={styles.buttonText}>{t('saving')}...</Text>
            ) : (
              <>
                <Feather name="check" size={20} color="#fff" />
                <Text style={styles.buttonText}>{isEdit ? t('update') : t('create')}</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
  },
  contentContainer: {
    flexGrow: 1,
    justifyContent: 'space-between',
    paddingBottom: 24,
    paddingHorizontal: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 200,
  },
  header: {
    paddingTop: 16,
    paddingBottom: 12,
  },
  screenTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
    opacity: 0.9,
  },
  screenSubtitle: {
    fontSize: 13,
    color: '#6b7280',
  },
  formCard: {
    padding: 16,
    borderRadius: 16,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    marginBottom: 16,
  },
  formGroup: {
    marginBottom: 20,
  },
  formGroupFirst: {
    marginTop: 4,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  requiredMark: {
    color: '#ef4444',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    backgroundColor: '#f9fafb',
  },
  multilineInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  helperText: {
    fontSize: 12,
    color: '#666',
  },
  errorText: {
    marginTop: 4,
    color: '#ef4444',
    fontSize: 13,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 0,
    paddingBottom: 8,
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
    backgroundColor: '#2563eb',
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});

