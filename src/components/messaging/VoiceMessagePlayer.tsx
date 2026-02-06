import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import { ensurePlaybackAudioMode } from './audioMode';
import * as FileSystem from 'expo-file-system/legacy';
import { useTheme } from '../../theme/useTheme';

interface VoiceMessagePlayerProps {
  remoteUrl?: string | null;
  localUri?: string | null;
  duration?: number;
  waveform?: number[];
  isOwnMessage: boolean;
  uploadStatus?: 'uploading' | 'uploaded' | 'failed';
  uploadProgress?: number;
  sentTime?: string;
  statusIcon?: string;
  statusColor?: string;
  statusSize?: number;
  onRetry?: () => void;
  showDebug?: boolean;
}

const formatTime = (millis: number) => {
  const totalSeconds = Math.max(0, Math.floor(millis / 1000));
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const VoiceMessagePlayer: React.FC<VoiceMessagePlayerProps> = ({
  remoteUrl,
  localUri,
  duration,
  waveform,
  isOwnMessage,
  uploadStatus,
  uploadProgress,
  sentTime,
  statusIcon,
  statusColor,
  statusSize,
  onRetry,
  showDebug = false,
}) => {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const soundRef = useRef<Audio.Sound | null>(null);
  const cachedAudioUriRef = useRef<string | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [positionMillis, setPositionMillis] = useState(0);
  const [durationMillis, setDurationMillis] = useState(duration ? duration * 1000 : 0);
  const [lastError, setLastError] = useState<string | null>(null);
  const [lastStatus, setLastStatus] = useState<string | null>(null);

  const hasRemoteUrl = !!remoteUrl && remoteUrl.startsWith('http');
  const isFailed = uploadStatus === 'failed';
  const isUploading = !hasRemoteUrl && (
    uploadStatus === 'uploading'
    || (uploadProgress !== undefined && uploadProgress < 1)
    || (!!localUri)
  );
  const isPlayable = hasRemoteUrl && !isFailed;

  const bars = useMemo(() => {
    if (waveform && waveform.length > 0) {
      const slice = waveform.slice(0, 32);
      const max = Math.max(...slice.map(value => Math.abs(value)), 1);
      return slice.map(value => {
        const normalized = Math.abs(value) / max;
        return Math.min(Math.max(normalized, 0), 1);
      });
    }
    return Array.from({ length: 32 }, () => 0.4);
  }, [waveform]);

  const totalDuration = durationMillis || (duration ? duration * 1000 : 0);
  const progressRatio = totalDuration > 0 ? Math.min(positionMillis / totalDuration, 1) : 0;
  const uploadRatio = uploadProgress !== undefined ? Math.min(Math.max(uploadProgress, 0), 1) : 0;
  const debugRemote = remoteUrl ? `${remoteUrl.slice(0, 42)}...${remoteUrl.slice(-12)}` : 'none';
  const waveformWidth = useMemo(() => {
    const base = 70;
    const max = 110;
    if (!totalDuration) return base;
    const seconds = Math.round(totalDuration / 1000);
    const computed = base + seconds * 0.8;
    return Math.max(base, Math.min(max, computed));
  }, [totalDuration]);

  useEffect(() => {
    ensurePlaybackAudioMode();
  }, []);

  useEffect(() => {
    return () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync().catch(() => {});
        soundRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    // Reset sound when the source changes (e.g., local -> remote URL)
    if (soundRef.current) {
      soundRef.current.unloadAsync().catch(() => {});
      soundRef.current = null;
    }
    cachedAudioUriRef.current = null;
    setPositionMillis(0);
    setDurationMillis(duration ? duration * 1000 : 0);
  }, [remoteUrl, duration]);

  const onPlaybackStatusUpdate = useCallback((status: Audio.SoundStatus) => {
    if (!status.isLoaded) {
      if ('error' in status && status.error) {
        console.warn('[VoiceMessagePlayer] Playback error:', status.error);
        setLastError(status.error);
        setLastStatus('unloaded');
      }
      return;
    }
    setPositionMillis(status.positionMillis);
    if (status.durationMillis) setDurationMillis(status.durationMillis);
    setIsPlaying(status.isPlaying);
    setLastStatus(`loaded p=${Math.round(status.positionMillis / 1000)}s d=${Math.round((status.durationMillis || 0) / 1000)}s play=${String(status.isPlaying)} buf=${String(status.isBuffering)}`);
    if (status.didJustFinish) {
      setIsPlaying(false);
      setPositionMillis(0);
    }
  }, []);

  const resolveAudioUri = useCallback(async (sourceUrl: string): Promise<string> => {
    if (Platform.OS === 'web') return sourceUrl;
    if (!sourceUrl.startsWith('http')) return sourceUrl;
    if (cachedAudioUriRef.current) return cachedAudioUriRef.current;

    try {
      const safeName = encodeURIComponent(sourceUrl).replace(/%/g, '');
      const dir = `${FileSystem.cacheDirectory}voice/`;
      const fileUri = `${dir}${safeName}.m4a`;

      await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
      const info = await FileSystem.getInfoAsync(fileUri);
      if (info.exists) {
        cachedAudioUriRef.current = fileUri;
        return fileUri;
      }

      const downloaded = await FileSystem.downloadAsync(sourceUrl, fileUri);
      cachedAudioUriRef.current = downloaded.uri;
      return downloaded.uri;
    } catch (error) {
      console.warn('[VoiceMessagePlayer] Cache download failed, using remote URL:', error);
      return sourceUrl;
    }
  }, []);

  const loadSound = useCallback(async () => {
    if (!remoteUrl || isUploading) return null;
    if (soundRef.current) {
      const status = await soundRef.current.getStatusAsync();
      if (status.isLoaded) {
        return soundRef.current;
      }
      await soundRef.current.unloadAsync().catch(() => {});
      soundRef.current = null;
    }
    setIsLoading(true);
    setLastError(null);
    try {
      const safeUrl = remoteUrl && remoteUrl.startsWith('http') ? encodeURI(remoteUrl.trim()) : remoteUrl?.trim();
      if (!safeUrl) {
        console.warn('[VoiceMessagePlayer] Missing audio URL');
        return null;
      }
      await ensurePlaybackAudioMode();
      const resolvedUri = await resolveAudioUri(safeUrl);
      const createSound = async (downloadFirst: boolean) => {
        const { sound, status } = await Audio.Sound.createAsync(
          { uri: resolvedUri },
          { shouldPlay: false, progressUpdateIntervalMillis: 200 },
          onPlaybackStatusUpdate,
          downloadFirst
        );
        if (!status.isLoaded) {
          const err = (status as any).error || 'Audio not loaded';
          throw new Error(err);
        }
        sound.setOnPlaybackStatusUpdate(onPlaybackStatusUpdate);
        if (status.durationMillis) {
          setDurationMillis(status.durationMillis);
        }
        setLastStatus(`loaded p=${Math.round((status.positionMillis || 0) / 1000)}s d=${Math.round((status.durationMillis || 0) / 1000)}s play=${String(status.isPlaying)} buf=${String(status.isBuffering)}`);
        return sound;
      };

      const sound = await createSound(true);

      soundRef.current = sound;
      return sound;
    } catch (error) {
      console.warn('[VoiceMessagePlayer] Failed to load audio:', error);
      setLastError(error instanceof Error ? error.message : 'load failed');
      soundRef.current = null;
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [remoteUrl, isUploading, onPlaybackStatusUpdate, resolveAudioUri]);

  const togglePlayback = useCallback(async () => {
    try {
      if (!isPlayable) return;
      const sound = await loadSound();
      if (!sound) return;
      const status = await sound.getStatusAsync();
      if (!status.isLoaded) return;
      if (status.isPlaying) {
        await sound.pauseAsync();
        setIsPlaying(false);
        return;
      }
      setIsPlaying(true);
      const playStatus = await sound.replayAsync();
      if (playStatus.isLoaded) {
        setIsPlaying(playStatus.isPlaying);
        setLastStatus(`loaded p=${Math.round((playStatus.positionMillis || 0) / 1000)}s d=${Math.round((playStatus.durationMillis || 0) / 1000)}s play=${String(playStatus.isPlaying)} buf=${String(playStatus.isBuffering)}`);
      } else if ('error' in playStatus && playStatus.error) {
        setLastError(playStatus.error);
      }
    } catch (error) {
      console.warn('[VoiceMessagePlayer] Toggle playback failed:', error);
      setLastError(error instanceof Error ? error.message : 'play failed');
      setIsPlaying(false);
      setIsLoading(false);
    }
  }, [loadSound, isPlayable]);

  return (
    <View style={styles.container}>
      {/** Disable playback until remoteUrl is ready (or retry on failure). */}
      <TouchableOpacity
        style={[styles.playButton, isOwnMessage ? styles.playButtonOwn : styles.playButtonOther]}
        onPress={isFailed ? onRetry : togglePlayback}
        disabled={isLoading || (isFailed ? !onRetry : !isPlayable)}
      >
        <Ionicons
          name={isFailed ? 'refresh' : isPlaying ? 'pause' : 'play'}
          size={16}
          color={isOwnMessage ? theme.colors.onPrimary : theme.colors.onSurface}
        />
      </TouchableOpacity>

      <View style={styles.content}>
        {showDebug ? (
          <View style={styles.debugBox}>
            <Text style={styles.debugText}>
              remote: {debugRemote}
            </Text>
            <Text style={styles.debugText}>
              upload: {uploadStatus ?? 'none'} {Math.round(uploadRatio * 100)}%
            </Text>
            <Text style={styles.debugText}>
              playable: {String(isPlayable)} / loading: {String(isLoading)} / playing: {String(isPlaying)}
            </Text>
            {lastStatus ? (
              <Text style={styles.debugText}>
                status: {lastStatus}
              </Text>
            ) : null}
            {lastError ? (
              <Text style={styles.debugText}>
                error: {lastError}
              </Text>
            ) : null}
          </View>
        ) : null}

        <View style={[styles.waveform, { minWidth: waveformWidth }]}>
          {bars.map((value, index) => {
            const active = index / bars.length <= progressRatio;
            return (
              <View
                key={`${index}`}
                style={[
                  styles.waveformBar,
                  {
                  height: 10 + Math.round(value * 18),
                    backgroundColor: active
                      ? (isOwnMessage ? theme.colors.onPrimary : theme.colors.primary)
                      : (isOwnMessage ? theme.app.chatBubbleSentMeta : theme.app.chatBubbleReceivedMeta),
                  }
                ]}
              />
            );
          })}
        </View>

        {isUploading ? (
          <View style={styles.metaStack}>
            <Text style={[styles.duration, isOwnMessage ? styles.durationOwn : styles.durationOther]}>
              Uploading {Math.round(uploadRatio * 100)}%
            </Text>
            <View style={styles.uploadBar}>
              <View style={[styles.uploadProgress, { width: `${Math.round(uploadRatio * 100)}%` }]} />
            </View>
          </View>
        ) : isFailed ? (
          <TouchableOpacity style={styles.retryRow} onPress={onRetry}>
            <Text style={[styles.duration, styles.retryText]}>
              Failed - Tap to retry
            </Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.metaRow}>
            <View style={styles.durationRow}>
              <Text style={[styles.duration, isOwnMessage ? styles.durationOwn : styles.durationOther]}>
                {formatTime(isPlaying ? positionMillis : totalDuration)}
              </Text>
              {isPlaying ? (
                <Text style={[styles.playing, isOwnMessage ? styles.durationOwn : styles.durationOther]}>
                  Listening
                </Text>
              ) : null}
            </View>
            <View style={styles.timeRow}>
              {sentTime ? (
                <Text style={[styles.sentTime, isOwnMessage ? styles.durationOwn : styles.durationOther]}>
                  {sentTime}
                </Text>
              ) : null}
              {statusIcon ? (
                <Text
                  style={[
                    styles.statusIcon,
                    { color: statusColor, fontSize: statusSize }
                  ]}
                >
                  {statusIcon}
                </Text>
              ) : null}
            </View>
          </View>
        )}
      </View>
    </View>
  );
};

const createStyles = (theme: ReturnType<typeof useTheme>['theme']) => StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
    alignSelf: 'flex-start',
    minWidth: 180,
    width: '100%',
    maxWidth: '100%',
  },
  playButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 0,
    marginLeft: 8,
  },
  playButtonOwn: {
    backgroundColor: theme.colors.primary,
  },
  playButtonOther: {
    backgroundColor: theme.colors.surfaceVariant,
  },
  content: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
    paddingBottom: 16,
  },
  waveform: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2.5,
    minHeight: 30,
    flexShrink: 0,
    paddingLeft: 14,
    paddingTop: 16,
  },
  waveformBar: {
    width: 2.2,
    borderRadius: 2,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: -4,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaStack: {
    gap: 4,
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
  durationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 1,
  },
  duration: {
    fontSize: 12,
    lineHeight: 16,
  },
  playing: {
    fontSize: 10,
    lineHeight: 12,
    opacity: 0.8,
  },
  sentTime: {
    fontSize: 11,
    lineHeight: 14,
    opacity: 0.7,
  },
  statusIcon: {
    marginLeft: 2,
  },
  durationOwn: {
    color: theme.app.chatBubbleSentMeta,
  },
  durationOther: {
    color: theme.app.chatBubbleReceivedMeta,
  },
  uploadBar: {
    width: 70,
    height: 6,
    backgroundColor: theme.app.overlayLight,
    borderRadius: 2,
    marginTop: 2,
    overflow: 'hidden',
  },
  uploadProgress: {
    height: '100%',
    backgroundColor: theme.colors.primary,
  },
  retryRow: {
    position: 'absolute',
    right: 0,
    bottom: 0,
  },
  retryText: {
    color: theme.app.chatStatusError,
  },
  debugBox: {
    backgroundColor: theme.app.overlayLight,
    borderRadius: 6,
    paddingVertical: 4,
    paddingHorizontal: 6,
    marginBottom: 6,
  },
  debugText: {
    fontSize: 10,
    lineHeight: 12,
    color: theme.colors.onSurfaceVariant,
  },
});

export default VoiceMessagePlayer;
