import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { useAppColors } from '@/src/contexts/ThemeContext';

interface Props {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export function PaginationControls({ currentPage, totalPages, onPageChange }: Props) {
  const C = useAppColors();

  if (totalPages <= 1) return null;

  const getPageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 5;
    
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }
    return pages;
  };

  const pages = getPageNumbers();

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.btn, { borderColor: C.borderLight, backgroundColor: C.surface }]}
        disabled={currentPage === 1}
        onPress={() => onPageChange(currentPage - 1)}
      >
        <Feather name="chevron-left" size={20} color={currentPage === 1 ? C.textMuted : C.text} />
      </TouchableOpacity>
      
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {pages[0] > 1 && (
          <>
            <TouchableOpacity style={[styles.pageBtn, { backgroundColor: C.surface, borderColor: C.borderLight }]} onPress={() => onPageChange(1)}>
              <Text style={[styles.pageTxt, { color: C.text }]}>1</Text>
            </TouchableOpacity>
            {pages[0] > 2 && <Text style={[styles.ellipsis, { color: C.textMuted }]}>...</Text>}
          </>
        )}

        {pages.map((p) => {
          const isActive = p === currentPage;
          return (
            <TouchableOpacity
              key={p}
              style={[
                styles.pageBtn,
                isActive ? { backgroundColor: C.tint, borderColor: C.tint } : { backgroundColor: C.surface, borderColor: C.borderLight }
              ]}
              onPress={() => onPageChange(p)}
            >
              <Text style={[styles.pageTxt, isActive ? { color: '#fff' } : { color: C.text }]}>{p}</Text>
            </TouchableOpacity>
          );
        })}

        {pages[pages.length - 1] < totalPages && (
          <>
            {pages[pages.length - 1] < totalPages - 1 && <Text style={[styles.ellipsis, { color: C.textMuted }]}>...</Text>}
            <TouchableOpacity style={[styles.pageBtn, { backgroundColor: C.surface, borderColor: C.borderLight }]} onPress={() => onPageChange(totalPages)}>
              <Text style={[styles.pageTxt, { color: C.text }]}>{totalPages}</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>

      <TouchableOpacity
        style={[styles.btn, { borderColor: C.borderLight, backgroundColor: C.surface }]}
        disabled={currentPage === totalPages}
        onPress={() => onPageChange(currentPage + 1)}
      >
        <Feather name="chevron-right" size={20} color={currentPage === totalPages ? C.textMuted : C.text} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    marginBottom: 20,
    width: '100%',
    paddingHorizontal: 16,
  },
  scroll: {
    flexGrow: 0,
    flexShrink: 1,
  },
  scrollContent: {
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
  },
  btn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pageBtn: {
    minWidth: 36,
    height: 36,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  pageTxt: {
    fontSize: 15,
    fontWeight: '600',
  },
  ellipsis: {
    fontSize: 16,
    fontWeight: '600',
    marginHorizontal: 4,
  },
});
