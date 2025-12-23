declare module 'expo-av' {
  import { ComponentClass } from 'react';
  import { ViewProps, ImageProps } from 'react-native';

  export interface VideoProps extends ViewProps {
    source?: { uri: string } | number;
    style?: any;
    useNativeControls?: boolean;
    resizeMode?: 'contain' | 'cover' | 'stretch';
    shouldPlay?: boolean;
    isLooping?: boolean;
    isMuted?: boolean;
    volume?: number;
    rate?: number;
    positionMillis?: number;
    onPlaybackStatusUpdate?: (status: any) => void;
    onLoad?: (status: any) => void;
    onError?: (error: string) => void;
    posterSource?: ImageProps['source'];
    posterStyle?: ImageProps['style'];
  }

  export const Video: ComponentClass<VideoProps>;

  export const ResizeMode: {
    CONTAIN: 'contain';
    COVER: 'cover';
    STRETCH: 'stretch';
  };

  export const Audio: any;
}
