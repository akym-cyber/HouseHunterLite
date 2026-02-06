import { Alert } from 'react-native';

type ConfirmOptions = {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  destructive?: boolean;
  onConfirm: () => void;
};

export const confirmAction = ({
  title,
  message,
  confirmText = 'Delete',
  cancelText = 'Cancel',
  destructive = true,
  onConfirm,
}: ConfirmOptions) => {
  Alert.alert(
    title,
    message,
    [
      { text: cancelText, style: 'cancel' },
      { text: confirmText, style: destructive ? 'destructive' : 'default', onPress: onConfirm },
    ],
  );
};
