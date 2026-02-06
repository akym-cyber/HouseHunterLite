import React from 'react';
import { Platform } from 'react-native';
import AudioPlayerNative from './native';
import AudioPlayerWeb from './web';
import { AudioPlayerProps } from './types';

const AudioPlayer: React.FC<AudioPlayerProps> = (props) => {
  if (Platform.OS === 'web') {
    return <AudioPlayerWeb {...props} />;
  }
  return <AudioPlayerNative {...props} />;
};

export type { AudioPlayerProps } from './types';
export default AudioPlayer;
