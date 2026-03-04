import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';

interface VoiceWaveformProps {
  audioUri: string;
  duration: number;
  isPlaying: boolean;
  progress: number;
  isSender: boolean;
  amplitudes?: number[];
}

const DEFAULT_BAR_COUNT = 60;
const SHORT_AUDIO_BAR_COUNT = 50;
const LONG_AUDIO_BAR_COUNT = 68;
const BAR_MIN_HEIGHT = 3;
const BAR_MAX_HEIGHT = 13;
const BAR_WIDTH = 1.6;
const BAR_GAP = 0.9;

const IG_PROFILE_TEMPLATE = [
  0.18, 0.24, 0.32, 0.44, 0.58, 0.7, 0.62, 0.5, 0.38, 0.3, 0.24, 0.2,
  0.24, 0.34, 0.46, 0.6, 0.72, 0.64, 0.52, 0.4, 0.32, 0.26, 0.2, 0.17,
];

const clampProgress = (value: number) => Math.min(1, Math.max(0, value));
const clampNumber = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const hashString = (input: string) => {
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
};

const smoothSeries = (input: number[], passes = 1) => {
  let values = input.slice();
  for (let pass = 0; pass < passes; pass += 1) {
    values = values.map((value, index) => {
      const previous = values[index - 1] ?? value;
      const next = values[index + 1] ?? value;
      return previous * 0.22 + value * 0.56 + next * 0.22;
    });
  }
  return values;
};

const buildInstagramReferenceProfile = (count: number, phaseOffset = 0) => {
  const shifted = Array.from({ length: IG_PROFILE_TEMPLATE.length }, (_, index) => {
    const sourceIndex = (index + phaseOffset) % IG_PROFILE_TEMPLATE.length;
    return IG_PROFILE_TEMPLATE[sourceIndex];
  });
  return resampleToCount(shifted, count).map((value, index) => {
    const micro = (((index * 7) % 5) - 2) * 0.01;
    return clampNumber(value + micro, 0.12, 1);
  });
};

const resampleToCount = (input: number[], count: number) => {
  if (input.length === count) {
    return input.slice();
  }

  if (input.length < count) {
    return Array.from({ length: count }, (_, index) => {
      const position = (index / Math.max(1, count - 1)) * Math.max(1, input.length - 1);
      const leftIndex = Math.floor(position);
      const rightIndex = Math.min(input.length - 1, Math.ceil(position));
      const factor = position - leftIndex;
      const leftValue = input[leftIndex] ?? 0;
      const rightValue = input[rightIndex] ?? leftValue;
      return leftValue * (1 - factor) + rightValue * factor;
    });
  }

  const bucketSize = input.length / count;
  return Array.from({ length: count }, (_, index) => {
    const start = Math.floor(index * bucketSize);
    const end = Math.max(start + 1, Math.floor((index + 1) * bucketSize));
    const segment = input.slice(start, end);
    if (segment.length === 0) {
      return input[Math.min(input.length - 1, start)] ?? 0;
    }
    const peak = segment.reduce((max, value) => Math.max(max, value), 0);
    const avg = segment.reduce((sum, value) => sum + value, 0) / segment.length;
    return avg * 0.52 + peak * 0.48;
  });
};

const createMockWaveform = (seedText: string, count: number) => {
  let seed = hashString(seedText || 'voice-waveform');
  const next = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967295;
  };

  const phaseOffset = Math.floor(next() * IG_PROFILE_TEMPLATE.length);
  const reference = buildInstagramReferenceProfile(count, phaseOffset);
  return reference.map((value, index) => {
    const drift = (next() - 0.5) * 0.06;
    const pulse = ((index + phaseOffset) % 9 === 0) ? 0.04 : 0;
    return clampNumber(value + drift + pulse, 0.12, 1);
  });
};

const normalizeAmplitudes = (input: number[], count: number) => {
  if (!input.length) return [];
  const absoluteValues = input.map((value) => Math.abs(value));
  const sampled = resampleToCount(absoluteValues, count);

  const max = Math.max(...sampled, 1);
  const reference = buildInstagramReferenceProfile(count);
  const normalized = sampled.map((value, index) => {
    const ratio = clampNumber(value / max, 0, 1);
    const shaped = Math.pow(ratio, 0.64);
    const blended = reference[index] * 0.62 + shaped * 0.38;
    const micro = (((index * 17) % 7) - 3) * 0.004;
    return clampNumber(blended + micro, 0.12, 1);
  });

  const smoothed = smoothSeries(normalized, 2);
  return smoothed.map((value) => clampNumber(value, 0.12, 1));
};

const VoiceWaveform: React.FC<VoiceWaveformProps> = ({
  audioUri,
  duration,
  isPlaying,
  progress,
  isSender,
  amplitudes,
}) => {
  const barCount = useMemo(() => {
    if (duration <= 4) return SHORT_AUDIO_BAR_COUNT;
    if (duration >= 35) return LONG_AUDIO_BAR_COUNT;
    return DEFAULT_BAR_COUNT;
  }, [duration]);

  const activeColor = isSender ? '#ffffff' : '#0A84FF';
  const inactiveColor = isSender ? 'rgba(255,255,255,0.24)' : 'rgba(10,132,255,0.26)';

  const animatedProgress = useRef(new Animated.Value(clampProgress(progress))).current;

  useEffect(() => {
    Animated.timing(animatedProgress, {
      toValue: clampProgress(progress),
      duration: isPlaying ? 100 : 140,
      easing: Easing.out(Easing.quad),
      useNativeDriver: false,
    }).start();
  }, [animatedProgress, isPlaying, progress]);

  const waveform = useMemo(() => {
    if (amplitudes && amplitudes.length > 0) {
      return normalizeAmplitudes(amplitudes, barCount);
    }
    return createMockWaveform(audioUri || 'voice-waveform-static', barCount);
  }, [amplitudes, audioUri, barCount]);

  return (
    <View style={styles.container}>
      {waveform.map((value, index) => {
        const barHeight = Math.round(BAR_MIN_HEIGHT + value * (BAR_MAX_HEIGHT - BAR_MIN_HEIGHT));
        const threshold = (index + 1) / waveform.length;
        const start = Math.max(0.0001, threshold - (1 / waveform.length));
        const backgroundColor = animatedProgress.interpolate({
          inputRange: [0, start, threshold, 1],
          outputRange: [inactiveColor, inactiveColor, activeColor, activeColor],
          extrapolate: 'clamp',
        });
        return (
          <View key={`${index}`} style={styles.barSlot}>
            <Animated.View
              style={[
                styles.bar,
                {
                  height: barHeight,
                  backgroundColor,
                  borderRadius: 2,
                  marginRight: index === waveform.length - 1 ? 0 : BAR_GAP,
                },
              ]}
            />
          </View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    minHeight: BAR_MAX_HEIGHT + 2,
  },
  barSlot: {
    height: BAR_MAX_HEIGHT,
    justifyContent: 'center',
  },
  bar: {
    width: BAR_WIDTH,
    borderRadius: 4,
  },
});

export default VoiceWaveform;
