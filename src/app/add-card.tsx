import Feather from '@expo/vector-icons/Feather';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, TextInput, TouchableOpacity } from 'react-native';

import { Deck } from '@/assets/data/decks';
import { Text, View } from '@/src/components/Themed';
import { supabase } from '@/src/lib/supabase';

export default function AddCardScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const deckId = typeof params.deckId === 'string' ? params.deckId : null;
  const [deck, setDeck] = useState<Deck | null>(null);
  const [frontText, setFrontText] = useState('');
  const [backText, setBackText] = useState('');
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!deckId) {
      setError('Deck not found');
      return;
    }

    const loadDeck = async () => {
      const { data, error } = await supabase
        .from('decks')
        .select('*')
        .eq('deck_id', deckId)
        .single();

      if (error) {
        setError('Failed to load deck');
      } else {
        setDeck(data as Deck);
      }
    };

    loadDeck();
  }, [deckId]);

  if (!deck) {
    return (
      <View style={styles.flex}>
        <View style={[styles.container, { alignItems: 'center', justifyContent: 'center' }]}>
          <Text style={styles.deckName}>{error ?? 'Deck not found'}</Text>
          <TouchableOpacity
            style={[styles.button, styles.cancelButton, { marginTop: 16, marginHorizontal: 16 }]}
            onPress={() => router.back()}
          >
            <Text style={styles.cancelButtonText}>Go back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const handleSave = async () => {
    if (!frontText.trim() || !backText.trim()) {
      return;
    }

    setIsSaving(true);
    setError(null);

    const { error: insertError } = await supabase
      .from('cards')
      .insert({
        deck_id: deckId,
        card_type: 'basic',
        front_text: frontText.trim(),
        back_text: backText.trim(),
        notes: notes.trim() || null,
      })
      .single();

    if (insertError) {
      setError(insertError.message || 'Failed to save card. Please try again.');
      setIsSaving(false);
      return;
    }

    router.back();
  };

  const isValid = frontText.trim().length > 0 && backText.trim().length > 0;

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.flex}
    >
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        <Text style={styles.deckName}>{deck.title}</Text>

        <View style={styles.formContainer}>
          <View style={styles.formGroup}>
            <Text style={styles.label}>Front</Text>
            <TextInput
              style={styles.input}
              placeholder="What should be learned?"
              placeholderTextColor="#999"
              value={frontText}
              onChangeText={setFrontText}
              multiline
              textAlignVertical="top"
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Back</Text>
            <TextInput
              style={styles.input}
              placeholder="Answer"
              placeholderTextColor="#999"
              value={backText}
              onChangeText={setBackText}
              multiline
              textAlignVertical="top"
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Notes (optional)</Text>
            <TextInput
              style={[styles.input, { minHeight: 80 }]}
              placeholder="Additional information..."
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
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.button,
              styles.saveButton,
              !isValid && styles.saveButtonDisabled
            ]}
            onPress={handleSave}
            disabled={!isValid || isSaving}
            accessibilityRole="button"
            accessibilityLabel="Save card"
          >
            {isSaving ? (
              <Text style={styles.buttonText}>Saving...</Text>
            ) : (
              <>
                <Feather name="check" size={20} color="#fff" />
                <Text style={styles.buttonText}>Save</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
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
