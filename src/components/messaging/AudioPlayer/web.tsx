import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../theme/useTheme';
import { AudioPlayerProps } from './types';

const resolveFormat = (
  format?: 'm4a' | 'webm',
  mimeType?: string,
  remoteUrl?: string | null,
) => {
  if (format) return format;
  const normalizedMime = mimeType?.toLowerCase() ?? '';
  if (normalizedMime.includes('webm')) return 'webm';
  if (normalizedMime.includes('m4a') || normalizedMime.includes('mp4')) return 'm4a';
  const normalizedUrl = remoteUrl?.toLowerCase() ?? '';
  if (normalizedUrl.includes('.webm')) return 'webm';
  if (normalizedUrl.includes('.m4a') || normalizedUrl.includes('.mp4')) return 'm4a';
  return undefined;
};

const canPlayType = (format?: string, mimeType?: string) => {
  if (typeof document === 'undefined') return false;
  const tester = document.createElement('audio');
  const normalizedMime = mimeType?.split(';')[0]?.toLowerCase();
  const probe = normalizedMime
    || (format === 'webm'
      ? 'audio/webm;codecs=opus'
      : format === 'mp3'
        ? 'audio/mpeg'
        : 'audio/mp4');
  if (!probe) return true;
  const result = tester.canPlayType(probe);
  return result === 'probably' || result === 'maybe';
};

const toCloudinaryMp3Url = (url: string) => {
  if (!url.includes('/upload/')) return url;
  if (url.includes('/upload/q_auto:audio,f_mp3/')) return url;
  return url.replace('/upload/', '/upload/q_auto:audio,f_mp3/');
};

const extractCloudinaryParts = (url: string) => {
  const uploadIndex = url.indexOf('/upload/');
  if (uploadIndex === -1) return null;
  const afterUpload = url.slice(uploadIndex + '/upload/'.length);
  const withoutQuery = afterUpload.split('?')[0] || '';
  const segments = withoutQuery.split('/').filter(Boolean);
  let version = '';
  if (segments[0] && /^v\d+$/.test(segments[0])) {
    version = segments.shift() || '';
  }
  const publicPath = segments.join('/');
  if (!publicPath) return null;
  const publicId = publicPath.replace(/\.[a-z0-9]+$/i, '');
  return { publicId, version };
};

const formatTime = (millis: number) => {
  const totalSeconds = Math.max(0, Math.floor(millis / 1000));
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const AudioPlayerWeb: React.FC<AudioPlayerProps> = ({
  remoteUrl,
  duration,
  waveform,
  isOwnMessage,
  uploadStatus,
  uploadProgress,
  sentTime,
  statusIcon,
  statusColor,
  statusSize,
  format,
  mimeType,
  onRetry,
  showDebug = false,
}) => {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [positionMillis, setPositionMillis] = useState(0);
  const [durationMillis, setDurationMillis] = useState(duration ? duration * 1000 : 0);
  const [lastError, setLastError] = useState<string | null>(null);
  const [lastStatus, setLastStatus] = useState<string | null>(null);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [isSigning, setIsSigning] = useState(false);
  const [signingError, setSigningError] = useState(false);
  const [signingRetryKey, setSigningRetryKey] = useState(0);

  const hasRemoteUrl = !!remoteUrl && remoteUrl.startsWith('http');
  const resolvedFormat = useMemo(
    () => resolveFormat(format, mimeType, remoteUrl),
    [format, mimeType, remoteUrl]
  );
  const shouldTranscodeM4A = useMemo(() => {
    if (!remoteUrl) return false;
    if (resolvedFormat !== 'm4a') return false;
    return remoteUrl.includes('res.cloudinary.com') && remoteUrl.includes('/upload/');
  }, [remoteUrl, resolvedFormat]);
  const playbackUrl = useMemo(
    () => (signedUrl || (shouldTranscodeM4A && remoteUrl ? toCloudinaryMp3Url(remoteUrl) : remoteUrl)),
    [remoteUrl, shouldTranscodeM4A, signedUrl]
  );
  const playbackFormat = shouldTranscodeM4A ? 'mp3' : resolvedFormat;
  const playbackMimeType = shouldTranscodeM4A ? 'audio/mpeg' : mimeType;
  const isSupportedFormat = useMemo(
    () => canPlayType(playbackFormat, playbackMimeType),
    [playbackFormat, playbackMimeType]
  );
  const isFailed = uploadStatus === 'failed';
  const isUploading = !hasRemoteUrl && (
    uploadStatus === 'uploading'
    || (uploadProgress !== undefined && uploadProgress < 1)
  );
  const isPlayable = hasRemoteUrl && !isFailed && isSupportedFormat;
  const showUnsupported = hasRemoteUrl && !isFailed && !isUploading && !isSupportedFormat;

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
  const debugRemote = playbackUrl
    ? `${playbackUrl.slice(0, 42)}...${playbackUrl.slice(-12)}`
    : 'none';

  const waveformWidth = useMemo(() => {
    const base = 70;
    const max = 110;
    if (!totalDuration) return base;
    const seconds = Math.round(totalDuration / 1000);
    const computed = base + seconds * 0.8;
    return Math.max(base, Math.min(max, computed));
  }, [totalDuration]);

  useEffect(() => {
    let isActive = true;
    if (!shouldTranscodeM4A || !remoteUrl) {
      setSignedUrl(null);
      setIsSigning(false);
      setSigningError(false);
      return () => {
        isActive = false;
      };
    }

    const parts = extractCloudinaryParts(remoteUrl);
    if (!parts?.publicId) {
      setSignedUrl(null);
      setIsSigning(false);
      setSigningError(true);
      return () => {
        isActive = false;
      };
    }

    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const endpoint = origin ? `${origin}/api/cloudinary/sign-audio` : '';
    if (!endpoint) {
      setSignedUrl(null);
      setIsSigning(false);
      setSigningError(true);
      return () => {
        isActive = false;
      };
    }

    setIsSigning(true);
    setSigningError(false);
    const params = new URLSearchParams({ publicId: parts.publicId });
    if (parts.version) {
      params.set('version', parts.version);
    }

    fetch(`${endpoint}?${params.toString()}`)
      .then(async (response) => {
        if (!response.ok) throw new Error('Signing failed');
        const data = await response.json();
        if (isActive && data?.url) {
          setSignedUrl(data.url);
          setSigningError(false);
        } else if (isActive) {
          setSignedUrl(null);
          setSigningError(true);
        }
      })
      .catch(() => {
        if (isActive) {
          setSignedUrl(null);
          setSigningError(true);
        }
      })
      .finally(() => {
        if (isActive) setIsSigning(false);
      });

    return () => {
      isActive = false;
    };
  }, [remoteUrl, shouldTranscodeM4A, signingRetryKey]);

  useEffect(() => {
    setPositionMillis(0);
    setDurationMillis(duration ? duration * 1000 : 0);
  }, [playbackUrl, duration]);

  useEffect(() => {
    if (!hasRemoteUrl || !playbackUrl || !isSupportedFormat) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      setIsLoading(false);
      setIsPlaying(false);
      return;
    }

    setIsLoading(true);
    setLastError(null);
    const safeUrl = encodeURI(playbackUrl);
    const audio = new Audio(safeUrl);
    audio.crossOrigin = 'anonymous';
    audio.preload = 'metadata';
    audioRef.current = audio;

    const handleLoaded = () => {
      setIsLoading(false);
      const fallbackDuration = duration ? duration * 1000 : 0;
      setDurationMillis(Number.isFinite(audio.duration) ? audio.duration * 1000 : fallbackDuration);
      setLastStatus(`loaded d=${Math.round(audio.duration)}s`);
    };

    const handleTimeUpdate = () => {
      setPositionMillis(audio.currentTime * 1000);
    };

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleEnded = () => {
      setIsPlaying(false);
      setPositionMillis(0);
    };
    const handleError = () => {
      setIsLoading(false);
      setIsPlaying(false);
      setLastError('Playback error');
      setLastStatus('error');
    };

    audio.addEventListener('loadedmetadata', handleLoaded);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);

    return () => {
      audio.pause();
      audio.removeEventListener('loadedmetadata', handleLoaded);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
      audio.src = '';
      audio.load();
      audioRef.current = null;
    };
  }, [playbackUrl, hasRemoteUrl, isSupportedFormat, duration]);

  const togglePlayback = useCallback(async () => {
    if (!isPlayable) return;
    const audio = audioRef.current;
    if (!audio) return;

    if (!audio.paused) {
      audio.pause();
      return;
    }

    setIsLoading(true);
    try {
      await audio.play();
      setLastStatus(`playing d=${Math.round(audio.duration)}s`);
    } catch (error) {
      setLastError(error instanceof Error ? error.message : 'Playback failed');
      setIsPlaying(false);
    } finally {
      setIsLoading(false);
    }
  }, [isPlayable]);

  const handleRetrySigning = useCallback(() => {
    setSignedUrl(null);
    setSigningError(false);
    setSigningRetryKey((prev) => prev + 1);
  }, []);

  if (signingError && shouldTranscodeM4A) {
    return (
      <View style={styles.container}>
        <View style={styles.fallbackBox}>
          <Text style={styles.fallbackTitle}>🎤 Playback restricted</Text>
          <Text style={styles.fallbackText}>
            For best experience, open in mobile app or try again later.
          </Text>
          <TouchableOpacity style={styles.fallbackButton} onPress={handleRetrySigning}>
            <Text style={styles.fallbackButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
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
            <Text style={styles.debugText}>
              format: {resolvedFormat ?? 'unknown'} → {playbackFormat ?? 'unknown'}
            </Text>
            {shouldTranscodeM4A ? (
              <Text style={styles.debugText}>
                transcode: cloudinary mp3 {isSigning ? '(signing...)' : signedUrl ? '(signed)' : '(unsigned)'}
              </Text>
            ) : null}
            {signingError ? (
              <Text style={styles.debugText}>
                signing: failed
              </Text>
            ) : null}
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
        ) : showUnsupported ? (
          <View style={styles.metaRow}>
            <View style={styles.durationRow}>
              <Text style={[styles.duration, styles.unsupportedText, isOwnMessage ? styles.durationOwn : styles.durationOther]}>
                Can't play this format
              </Text>
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
  unsupportedText: {
    fontSize: 12,
    opacity: 0.8,
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
  fallbackBox: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: theme.app.overlayLight,
  },
  fallbackTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.onSurface,
    marginBottom: 4,
  },
  fallbackText: {
    fontSize: 12,
    lineHeight: 16,
    color: theme.colors.onSurfaceVariant,
  },
  fallbackButton: {
    alignSelf: 'flex-start',
    marginTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: theme.colors.surfaceVariant,
  },
  fallbackButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.onSurface,
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

export default AudioPlayerWeb;
