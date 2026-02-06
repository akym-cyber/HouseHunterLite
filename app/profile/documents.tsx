import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Card, Text, List, ActivityIndicator, Divider } from 'react-native-paper';
import { useTheme } from '../../src/theme/useTheme';
import { useDocuments } from '../../src/hooks/useDocuments';

const formatDate = (value: any) => {
  if (!value) return 'Unknown date';
  const date = value?.toDate ? value.toDate() : new Date(value);
  if (isNaN(date.getTime())) return 'Unknown date';
  return date.toLocaleDateString();
};

export default function DocumentsScreen() {
  const { theme } = useTheme();
  const { documents, loading } = useDocuments();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <View style={styles.container}>
      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.title}>Documents</Text>
          {loading ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator size="small" color={theme.colors.primary} />
              <Text style={styles.loadingText}>Loading documents...</Text>
            </View>
          ) : documents.length === 0 ? (
            <Text style={styles.emptyText}>No documents uploaded yet.</Text>
          ) : (
            documents.map((doc, index) => (
              <View key={doc.id}>
                <List.Item
                  title={doc.title}
                  description={`${doc.type.toUpperCase()} · ${formatDate(doc.createdAt)}`}
                  left={(props) => <List.Icon {...props} icon="file-document" />}
                />
                {index < documents.length - 1 && <Divider />}
              </View>
            ))
          )}
        </Card.Content>
      </Card>
    </View>
  );
}

const createStyles = (theme: ReturnType<typeof useTheme>['theme']) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.app.background,
    padding: 16,
  },
  card: {
    borderRadius: 12,
    backgroundColor: theme.colors.surface,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
    color: theme.colors.onSurface,
  },
  emptyText: {
    color: theme.colors.onSurfaceVariant,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  loadingText: {
    color: theme.colors.onSurfaceVariant,
  },
});
