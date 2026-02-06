import { ActionSheetIOS, Alert, Platform } from 'react-native';

export type MessageAction = {
  label: string;
  onPress: () => void;
  destructive?: boolean;
  disabled?: boolean;
};

export const showMessageActions = (title: string, actions: MessageAction[]) => {
  const available = actions.filter(action => !action.disabled);

  if (Platform.OS === 'ios') {
    const options = [...available.map(action => action.label), 'Cancel'];
    const cancelButtonIndex = options.length - 1;
    const destructiveButtonIndex = available.findIndex(action => action.destructive);

    ActionSheetIOS.showActionSheetWithOptions(
      {
        title,
        options,
        cancelButtonIndex,
        destructiveButtonIndex: destructiveButtonIndex >= 0 ? destructiveButtonIndex : undefined,
      },
      (buttonIndex) => {
        if (buttonIndex < available.length) {
          available[buttonIndex].onPress();
        }
      }
    );
    return;
  }

  Alert.alert(
    title,
    '',
    [
      ...available.map(action => ({
        text: action.label,
        style: action.destructive ? 'destructive' : 'default',
        onPress: action.onPress,
      })),
      { text: 'Cancel', style: 'cancel' },
    ]
  );
};
