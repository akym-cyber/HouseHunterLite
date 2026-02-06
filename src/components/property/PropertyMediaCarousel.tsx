import React, { useMemo, useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Image,
  Dimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Modal,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { Text } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { Audio, ResizeMode, Video } from 'expo-av';
import { PropertyMedia } from '../../types/database';
import { formatVideoDuration, MAX_VIDEO_DURATION_SECONDS } from '../../utils/videoValidator';
import { useTheme } from '../../theme/useTheme';

interface PropertyMediaCarouselProps {
  primaryImageUrl?: string;
  media?: PropertyMedia[];
  borderRadius?: number;
}

const PLACEHOLDER_IMAGE = 'https://via.placeholder.com/600x400?text=Property+Image';
const FALLBACK_WIDTH = Math.max(280, Dimensions.get('window').width - 40);
const IOS_INTERRUPTION_DO_NOT_MIX = 1;
const ANDROID_INTERRUPTION_DO_NOT_MIX = 1;

const PropertyMediaCarousel: React.FC<PropertyMediaCarouselProps> = ({
  primaryImageUrl,
  media,
  borderRadius = 8,
}) => {
  const { theme } = useTheme();
  const [containerWidth, setContainerWidth] = useState<number>(FALLBACK_WIDTH);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isVideoOpen, setIsVideoOpen] = useState(false);
  const [activeVideoUrl, setActiveVideoUrl] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const videoRef = useRef<any>(null);
  const styles = useMemo(() => createStyles(theme), [theme]);

  const slides = useMemo(() => {
    const items: Array<
      | { type: 'image'; uri: string }
      | { type: 'video'; uri: string; videoUrl: string; durationMs?: number }
    > = [];
    const pushImage = (url?: string) => {
      if (!url) return;
      if (!items.find(item => item.type === 'image' && item.uri === url)) {
        items.push({ type: 'image', uri: url });
      }
    };

    const getVideoThumbnail = (item: PropertyMedia): string | undefined => {
      return item.thumbnailUrl || (item as any).thumbnail_url;
    };

    if (primaryImageUrl) {
      pushImage(primaryImageUrl);
    }

    if (media && media.length > 0) {
      media.forEach(item => {
        if (item.type === 'image') {
          pushImage(item.url);
          return;
        }

        if (item.type === 'video') {
          const thumbnail = getVideoThumbnail(item) || PLACEHOLDER_IMAGE;
          items.push({ type: 'video', uri: thumbnail, videoUrl: item.url, durationMs: item.durationMs });
        }
      });
    }

    if (items.length === 0) {
      items.push({ type: 'image', uri: PLACEHOLDER_IMAGE });
    }

    return items;
  }, [primaryImageUrl, media]);

  const handleLayout = useCallback((event: any) => {
    const width = event?.nativeEvent?.layout?.width;
    if (width && width > 0) {
      setContainerWidth(width);
    }
  }, []);

  const handleMomentumScrollEnd = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (!containerWidth) return;
    const offsetX = event.nativeEvent.contentOffset.x;
    const nextIndex = Math.round(offsetX / containerWidth);
    setActiveIndex(nextIndex);
  }, [containerWidth]);

  const handleOpenVideo = useCallback((url: string) => {
    setActiveVideoUrl(url);
    setIsVideoOpen(true);
    setIsMuted(false);
  }, []);

  const handleCloseVideo = useCallback(() => {
    setIsVideoOpen(false);
    setActiveVideoUrl(null);
  }, []);

  useEffect(() => {
    Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      staysActiveInBackground: false,
      playsInSilentModeIOS: true,
      interruptionModeIOS: IOS_INTERRUPTION_DO_NOT_MIX,
      shouldDuckAndroid: true,
      interruptionModeAndroid: ANDROID_INTERRUPTION_DO_NOT_MIX,
      playThroughEarpieceAndroid: false,
    }).catch(() => {
      // Best-effort
    });
  }, []);

  useEffect(() => {
    if (!isVideoOpen || !activeVideoUrl) return;
    const run = async () => {
      try {
        await videoRef.current?.setStatusAsync({
          shouldPlay: true,
          isMuted,
          volume: isMuted ? 0 : 1,
        });
      } catch {
        // Best-effort
      }
    };
    run();
  }, [isVideoOpen, activeVideoUrl, isMuted]);

  useEffect(() => {
    if (!isVideoOpen) return;
    videoRef.current?.setStatusAsync({
      isMuted,
      volume: isMuted ? 0 : 1,
    }).catch(() => {});
  }, [isMuted, isVideoOpen]);

  const toggleMute = useCallback(() => {
    setIsMuted(prev => {
      const next = !prev;
      videoRef.current?.setStatusAsync({
        isMuted: next,
        volume: next ? 0 : 1,
      }).catch(() => {});
      return next;
    });
  }, []);

  return (
    <View
      style={[
        styles.mediaContainer,
        {
          borderTopLeftRadius: borderRadius,
          borderTopRightRadius: borderRadius,
        },
      ]}
      onLayout={handleLayout}
    >
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleMomentumScrollEnd}
        scrollEventThrottle={16}
        style={styles.scrollView}
      >
        {slides.map((item, index) => {
          const durationSeconds = item.type === 'video' && item.durationMs !== undefined
            ? Math.round(item.durationMs / 1000)
            : null;
          const videoLabel = durationSeconds !== null
            ? `${formatVideoDuration(durationSeconds)} / ${MAX_VIDEO_DURATION_SECONDS}s`
            : 'Video';

          const content = (
            <>
              <Image
                source={{ uri: item.uri }}
                style={styles.image}
                resizeMode="cover"
              />
              {item.type === 'video' && (
                <View style={styles.videoOverlay}>
                  <View style={styles.playBadge}>
                    <Ionicons name="play" size={14} color={theme.app.iconOnDark} />
                    <Text style={styles.playText}>{videoLabel}</Text>
                  </View>
                </View>
              )}
            </>
          );

          return (
            <View
              key={`${item.type}-${item.uri}-${index}`}
              style={[styles.slide, { width: containerWidth }]}
            >
              {item.type === 'video' ? (
                <TouchableOpacity
                  activeOpacity={0.9}
                  style={styles.slideTouchable}
                  onPress={() => handleOpenVideo(item.videoUrl)}
                >
                  {content}
                </TouchableOpacity>
              ) : (
                content
              )}
            </View>
          );
        })}
      </ScrollView>

      {slides.length > 1 && (
        <View style={styles.pagination}>
          {slides.map((_, index) => (
            <View
              key={`dot-${index}`}
              style={[
                styles.dot,
                index === activeIndex ? styles.dotActive : styles.dotInactive,
              ]}
            />
          ))}
        </View>
      )}

      {slides.length > 1 && (
        <View style={styles.counterBadge}>
          <Text style={styles.counterText}>
            {activeIndex + 1}/{slides.length}
          </Text>
        </View>
      )}

      <Modal
        visible={isVideoOpen}
        animationType="fade"
        transparent={false}
        onRequestClose={handleCloseVideo}
      >
        <View style={styles.videoModal}>
          <StatusBar hidden />
          <TouchableOpacity style={styles.closeButton} onPress={handleCloseVideo}>
            <Ionicons name="close" size={28} color={theme.app.iconOnDark} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.muteButton}
            onPress={toggleMute}
          >
            <Ionicons name={isMuted ? 'volume-mute' : 'volume-high'} size={22} color={theme.app.iconOnDark} />
          </TouchableOpacity>
          {activeVideoUrl ? (
           <Video
             ref={videoRef}
             source={{ uri: activeVideoUrl }}
             style={styles.videoPlayer}
             useNativeControls
             resizeMode={ResizeMode.CONTAIN}
              shouldPlay
              isMuted={isMuted}
              volume={isMuted ? 0 : 1}
              onLoad={() => {
                videoRef.current?.setStatusAsync({
                  shouldPlay: true,
                  isMuted,
                  volume: isMuted ? 0 : 1,
                }).catch(() => {});
              }}
             onError={(error) => console.log('Video error:', error)}
            />

          ) : null}
        </View>
      </Modal>
    </View>
  );
};

const createStyles = (theme: ReturnType<typeof useTheme>['theme']) => StyleSheet.create({
  mediaContainer: {
    width: '100%',
    aspectRatio: 3 / 4,
    overflow: 'hidden',
    backgroundColor: theme.app.mediaPlaceholder,
  },
  scrollView: {
    width: '100%',
    height: '100%',
  },
  slide: {
    height: '100%',
  },
  slideTouchable: {
    width: '100%',
    height: '100%',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  videoOverlay: {
    position: 'absolute',
    bottom: 10,
    right: 10,
  },
  playBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: theme.app.mediaBadgeBackground,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  playText: {
    color: theme.app.iconOnDark,
    fontSize: 12,
    fontWeight: '600',
  },
  videoModal: {
    flex: 1,
    backgroundColor: theme.app.mediaModalBackground,
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoPlayer: {
    width: '100%',
    height: '100%',
  },
  closeButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
    padding: 8,
  },
  muteButton: {
    position: 'absolute',
    top: 50,
    left: 20,
    zIndex: 10,
    padding: 8,
  },
  pagination: {
    position: 'absolute',
    bottom: 10,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  dotActive: {
    backgroundColor: theme.app.iconOnDark,
  },
  dotInactive: {
    backgroundColor: theme.app.mediaDotInactive,
  },
  counterBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: theme.app.mediaCounterBackground,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  counterText: {
    color: theme.app.iconOnDark,
    fontSize: 12,
    fontWeight: '600',
  },
});

export default PropertyMediaCarousel;
