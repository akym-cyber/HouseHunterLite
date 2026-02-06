import React, { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Dialog, Portal, Text, TextInput } from 'react-native-paper';
import { useTheme } from '../../../../src/theme/useTheme';

type DecisionModalProps = {
  visible: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  initialNote?: string;
  onDismiss: () => void;
  onConfirm: (note: string) => void;
};

export default function DecisionModal({
  visible,
  title,
  description,
  confirmLabel,
  initialNote = '',
  onDismiss,
  onConfirm,
}: DecisionModalProps) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [note, setNote] = useState(initialNote);

  return (
    <Portal>
      <Dialog visible={visible} onDismiss={onDismiss} style={styles.dialog}>
        <Dialog.Title>{title}</Dialog.Title>
        <Dialog.Content>
          <Text style={styles.description}>{description}</Text>
          <TextInput
            mode="outlined"
            label="Note"
            placeholder="Add a note (optional)"
            value={note}
            onChangeText={setNote}
            multiline
            style={styles.input}
          />
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={onDismiss}>Cancel</Button>
          <Button onPress={() => onConfirm(note)}>{confirmLabel}</Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
}

const createStyles = (theme: ReturnType<typeof useTheme>['theme']) => StyleSheet.create({
  dialog: {
    backgroundColor: theme.colors.surface,
  },
  description: {
    color: theme.colors.onSurfaceVariant,
    marginBottom: 12,
  },
  input: {
    backgroundColor: theme.colors.surface,
  },
});
