import Feather from '@expo/vector-icons/Feather';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';

import { supabase } from '@/src/lib/supabase';
import { useAuth } from '@/src/contexts/AuthContext';
import { useLanguage } from '@/src/contexts/LanguageContext';

export default function AddDeckScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ deckId?: string }>();
  const deckId =
    typeof params.deckId === 'string'
      ? params.deckId
      : Array.isArray(params.deckId)
      ? params.deckId[0]
      : undefined;
  const { user } = useAuth();
  const { t } = useLanguage();
  const { width: screenWidth } = useWindowDimensions();
  const isEdit = Boolean(deckId);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [coverUrl, setCoverUrl] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(isEdit);
  const [error, setError] = useState<string | null>(null);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [imgRatio, setImgRatio] = useState<number | null>(null);

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
    if (!user) { setError(t('mustBeLoggedIn')); return; }
    if (!isValid || isSaving) return;
    setIsSaving(true);
    setError(null);

    if (isEdit && deckId) {
      const { error: e } = await supabase
        .from('decks')
        .update({
          title: title.trim(),
          description: description.trim() || null,
          cover_image_url: coverUrl.trim() || null,
          is_public: isPublic,
        })
        .eq('deck_id', deckId)
        .eq('creator_id', user.id);
      if (e) { setError(e.message); setIsSaving(false); return; }
    } else {
      const { error: e } = await supabase
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
      if (e) { setError(e.message); setIsSaving(false); return; }
    }
    router.back();
  };

  const hasCover = coverUrl.trim().length > 0;
  const coverH = imgRatio
    ? Math.min(Math.max((screenWidth - 48) / imgRatio, 120), 380)
    : 160;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1, backgroundColor: '#f5f6fa' }}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >

        {/* ── HERO HEADER ── */}
        <View style={styles.hero}>
          <View style={styles.heroBadge}>
            <Feather name={isEdit ? 'edit-3' : 'layers'} size={20} color="#4255ff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.heroTitle}>
              {isEdit ? t('editDeck') : t('createNewDeck')}
            </Text>
            <Text style={styles.heroSub}>
              {isEdit ? t('deckSubtitleEdit') : t('deckSubtitleCreate')}
            </Text>
          </View>
        </View>

        {isLoading ? (
          <View style={styles.loading}>
            <ActivityIndicator size="large" color="#4255ff" />
          </View>
        ) : (
          <>
            {/* ── COVER BLOCK ── */}
            <View style={[styles.coverWrap, { height: coverH }]}>
              {hasCover ? (
                <>
                  <Image
                    source={{ uri: coverUrl.trim() }}
                    style={StyleSheet.absoluteFill}
                    resizeMode={imgRatio && imgRatio < 1.4 ? 'contain' : 'cover'}
                    onLoad={e => {
                      const source = e.nativeEvent?.source;
                      if (source?.width && source?.height) {
                        setImgRatio(source.width / source.height);
                      }
                    }}
                    onError={() => setImgRatio(null)}
                  />
                  {/* dim overlay */}
                  <View style={styles.coverOverlay} />
                  <Pressable
                    style={styles.coverClear}
                    onPress={() => { setCoverUrl(''); setImgRatio(null); }}
                    hitSlop={6}
                  >
                    <Feather name="x" size={14} color="#fff" />
                  </Pressable>
                </>
              ) : (
                <View style={styles.coverEmpty}>
                  <View style={styles.coverEmptyIcon}>
                    <Feather name="image" size={28} color="#a5b4fc" />
                  </View>
                  <Text style={styles.coverEmptyTitle}>{t('coverPreview')}</Text>
                  <Text style={styles.coverEmptyHint}>{t('coverImageUrl')}</Text>
                </View>
              )}
            </View>

            {/* ── FORM CARD ── */}
            <View style={styles.card}>

              {/* TITLE */}
              <Field label={t('title')} required>
                <InputRow
                  icon="type"
                  focused={focusedField === 'title'}
                  onFocus={() => setFocusedField('title')}
                  onBlur={() => setFocusedField(null)}
                >
                  <TextInput
                    style={styles.input}
                    placeholder={t('title')}
                    placeholderTextColor="#c4cbd8"
                    value={title}
                    onChangeText={setTitle}
                    onFocus={() => setFocusedField('title')}
                    onBlur={() => setFocusedField(null)}
                    returnKeyType="next"
                  />
                  {title.length > 0 && (
                    <Pressable onPress={() => setTitle('')} hitSlop={8}>
                      <Feather name="x-circle" size={16} color="#d1d5db" />
                    </Pressable>
                  )}
                </InputRow>
              </Field>

              {/* DESCRIPTION */}
              <Field label={t('description')}>
                <InputRow
                  icon="align-left"
                  focused={focusedField === 'desc'}
                  onFocus={() => setFocusedField('desc')}
                  onBlur={() => setFocusedField(null)}
                  multiline
                >
                  <TextInput
                    style={[styles.input, styles.inputMulti]}
                    placeholder={t('description')}
                    placeholderTextColor="#c4cbd8"
                    value={description}
                    onChangeText={setDescription}
                    onFocus={() => setFocusedField('desc')}
                    onBlur={() => setFocusedField(null)}
                    multiline
                    textAlignVertical="top"
                    numberOfLines={3}
                  />
                </InputRow>
              </Field>

              {/* COVER URL */}
              <Field label={t('coverImageUrl')}>
                <InputRow
                  icon="link-2"
                  focused={focusedField === 'cover'}
                  onFocus={() => setFocusedField('cover')}
                  onBlur={() => setFocusedField(null)}
                >
                  <TextInput
                    style={styles.input}
                    placeholder="https://..."
                    placeholderTextColor="#c4cbd8"
                    value={coverUrl}
                    onChangeText={setCoverUrl}
                    onFocus={() => setFocusedField('cover')}
                    onBlur={() => setFocusedField(null)}
                    autoCapitalize="none"
                    keyboardType="url"
                  />
                  {coverUrl.length > 0 && (
                    <Pressable onPress={() => { setCoverUrl(''); setImgRatio(null); }} hitSlop={8}>
                      <Feather name="x-circle" size={16} color="#d1d5db" />
                    </Pressable>
                  )}
                </InputRow>
              </Field>

              {/* VISIBILITY */}
              <View style={[styles.toggleRow, isPublic && styles.toggleRowActive]}>
                <View style={[styles.toggleIcon, isPublic ? styles.toggleIconOn : styles.toggleIconOff]}>
                  <Feather name={isPublic ? 'globe' : 'lock'} size={17} color={isPublic ? '#4255ff' : '#9ca3af'} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.toggleLabel}>
                    {isPublic ? t('public') : t('private')}
                  </Text>
                  <Text style={styles.toggleHint} numberOfLines={1}>{t('publicDeckHelp')}</Text>
                </View>
                <Switch
                  value={isPublic}
                  onValueChange={setIsPublic}
                  trackColor={{ false: '#e5e7eb', true: 'rgba(66,85,255,0.28)' }}
                  thumbColor={isPublic ? '#4255ff' : '#d1d5db'}
                  ios_backgroundColor="#e5e7eb"
                />
              </View>

              {/* ERROR */}
              {error ? (
                <View style={styles.errorBox}>
                  <Feather name="alert-circle" size={15} color="#dc2626" />
                  <Text style={styles.errorTxt}>{error}</Text>
                </View>
              ) : null}
            </View>

            {/* ── BUTTONS ── */}
            <View style={styles.buttons}>
              <TouchableOpacity
                style={styles.btnCancel}
                onPress={() => router.back()}
                activeOpacity={0.7}
              >
                <Text style={styles.btnCancelTxt}>{t('cancel')}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.btnSave, (!isValid || isSaving) && styles.btnSaveOff]}
                onPress={handleSave}
                disabled={!isValid || isSaving}
                activeOpacity={0.85}
              >
                {isSaving
                  ? <ActivityIndicator color="#fff" size="small" />
                  : (
                    <>
                      <Feather name="check" size={18} color="#fff" />
                      <Text style={styles.btnSaveTxt}>{isEdit ? t('update') : t('create')}</Text>
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

/* ─── HELPER SUB-COMPONENTS ─── */
function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <View style={{ gap: 7 }}>
      <Text style={styles.fieldLabel}>
        {label}
        {required && <Text style={{ color: '#ef4444' }}> *</Text>}
      </Text>
      {children}
    </View>
  );
}

function InputRow({
  icon,
  focused,
  onFocus,
  onBlur,
  multiline,
  children,
}: {
  icon: keyof typeof Feather.glyphMap;
  focused: boolean;
  onFocus: () => void;
  onBlur: () => void;
  multiline?: boolean;
  children: React.ReactNode;
}) {
  return (
    <View
      style={[
        styles.inputRow,
        multiline && styles.inputRowMulti,
        focused && styles.inputRowFocused,
      ]}
    >
      <Feather
        name={icon}
        size={16}
        color={focused ? '#4255ff' : '#b0b8c8'}
        style={multiline ? { marginTop: 3 } : undefined}
      />
      {children}
    </View>
  );
}

/* ─── STYLES ─── */
const styles = StyleSheet.create({
  scroll: {
    padding: 16,
    paddingBottom: 36,
    gap: 14,
  },

  /* HERO */
  hero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
  },
  heroBadge: {
    width: 44,
    height: 44,
    borderRadius: 13,
    backgroundColor: '#eff1ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTitle: {
    fontSize: 21,
    fontWeight: '700',
    color: '#111827',
  },
  heroSub: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 2,
  },

  /* LOADING */
  loading: {
    minHeight: 200,
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* COVER */
  coverWrap: {
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: '#edeef6',
  },
  coverOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.04)',
  },
  coverClear: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  coverEmpty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  coverEmptyIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: '#e0e3f8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  coverEmptyTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8b96b0',
  },
  coverEmptyHint: {
    fontSize: 12,
    color: '#b0b8c8',
  },

  /* CARD */
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 18,
    gap: 16,
    shadowColor: '#4255ff',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 3,
  },

  /* FIELD */
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6b7280',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },

  /* INPUT ROW */
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#f7f8fb',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#e8eaee',
    paddingHorizontal: 13,
    paddingVertical: 11,
  },
  inputRowMulti: {
    alignItems: 'flex-start',
    paddingVertical: 12,
  },
  inputRowFocused: {
    borderColor: '#4255ff',
    backgroundColor: '#fff',
    shadowColor: '#4255ff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.14,
    shadowRadius: 8,
    elevation: 2,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: '#111827',
    paddingVertical: 0,
    // @ts-ignore — web-only: disable default browser focus outline
    outlineWidth: 0,
    outlineStyle: 'none',
  },
  inputMulti: {
    minHeight: 68,
    textAlignVertical: 'top',
  },

  /* TOGGLE */
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 13,
    borderRadius: 14,
    backgroundColor: '#f7f8fb',
    borderWidth: 1.5,
    borderColor: '#e8eaee',
  },
  toggleRowActive: {
    borderColor: 'rgba(66,85,255,0.25)',
    backgroundColor: '#f6f7ff',
  },
  toggleIcon: {
    width: 38,
    height: 38,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleIconOn: {
    backgroundColor: '#eff1ff',
  },
  toggleIconOff: {
    backgroundColor: '#f3f4f6',
  },
  toggleLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  toggleHint: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 1,
  },

  /* ERROR */
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fef2f2',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  errorTxt: {
    flex: 1,
    color: '#dc2626',
    fontSize: 13,
  },

  /* BUTTONS */
  buttons: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 2,
  },
  btnCancel: {
    flex: 1,
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#e2e4ec',
  },
  btnCancelTxt: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6b7280',
  },
  btnSave: {
    flex: 2,
    height: 52,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#4255ff',
    shadowColor: '#4255ff',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 5,
  },
  btnSaveOff: {
    opacity: 0.45,
    shadowOpacity: 0,
    elevation: 0,
  },
  btnSaveTxt: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
});
