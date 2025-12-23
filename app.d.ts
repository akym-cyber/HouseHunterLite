// app.d.ts
declare module 'react-native-video' {
  import { Component } from 'react';

  export interface VideoProps {
    source: any;
    paused?: boolean;
    muted?: boolean;
    volume?: number;
    rate?: number;
    resizeMode?: 'cover' | 'contain' | 'stretch';
    repeat?: boolean;
    controls?: boolean;
    onLoad?: (data: any) => void;
    onError?: (error: any) => void;
    onProgress?: (data: any) => void;
    onEnd?: () => void;
    style?: any;
    [key: string]: any;
  }

  export default class Video extends Component<VideoProps> {
    seek: (time: number) => void;
  }
}
