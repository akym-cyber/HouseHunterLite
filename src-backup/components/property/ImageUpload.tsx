import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
  Image,
  TouchableOpacity,
} from 'react-native';
import {
  Text,
  Button,
  Card,
  IconButton,
  Portal,
  Modal,
  Chip,
} from 'react-native-paper';
import * as ImagePicker from 'expo-image-picker';
import { Video, ResizeMode } from 'expo-av';
import { defaultTheme } from '../../styles/theme';

interface MediaFile {
  id: string;
  uri: string;
  type: 'image' | 'video';
  name: string;
  size: number;
  isPrimary?: boolean;
  durationMs?: number;
}

interface ImageUploadProps {
  media: MediaFile[];
  onMediaChange: (media: MediaFile[]) => void;
  maxFiles?: number;
  allowVideos?: boolean;
}

export default function ImageUpload({ 
  media, 
  onMediaChange, 
  maxFiles = 10, 
  allowVideos = true 
}: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [previewModal, setPreviewModal] = useState<{ visible: boolean; media?: MediaFile }>({
    visible: false
  });

  const requestPermissions = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission Required',
        'Please grant camera roll permissions to upload images and videos.'
      );
      return false;
    }
    return true;
  };

  const pickMedia = async (type: 'image' | 'video') => {
    if (!(await requestPermissions())) return;

    const options: ImagePicker.ImagePickerOptions = {
      mediaTypes: type === 'video' ? ImagePicker.MediaTypeOptions.Videos : ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.8,
      aspect: [16, 9],
    };

    try {
      const result = await ImagePicker.launchImageLibraryAsync(options);
      
      if (!result.canceled && result.assets) {
        const newMedia: MediaFile[] = [];
        const skipped: string[] = [];
        for (let index = 0; index < result.assets.length; index++) {
          const asset = result.assets[index];
          const isImage = type === 'image';
          const filename = asset.fileName || `media_${Date.now()}_${index}`;
          const size = asset.fileSize || 0;

          // Duration helper: rely on picker-provided duration; otherwise fallback to 0 (no blocking)
          const getVideoDurationMs = (): number | undefined => {
            if (typeof asset.duration === 'number') {
              return Math.floor(asset.duration * 1000);
            }
            // If duration is missing, return undefined (we won't block on duration)
            return undefined;
          };

          const durationMs = !isImage ? getVideoDurationMs() : undefined;

          // Validation (non-blocking; we skip invalid but continue)
          if (isImage) {
            const valid = ['image/jpeg', 'image/jpg', 'image/png'];
            const mime = asset.mimeType || '';
            if (!valid.some(v => mime.includes(v.split('/')[1]))) {
              skipped.push(`${filename}: invalid type (JPG/PNG only)`);
              continue;
            }
            if (size > 5 * 1024 * 1024) {
              skipped.push(`${filename}: ${Math.round(size/1024/1024)}MB > 5MB`);
              continue;
            }
          } else {
            const validVideo = ['video/mp4', 'video/quicktime']; // mp4, mov
            const mime = asset.mimeType || '';
            if (!validVideo.some(v => mime.includes(v.split('/')[1]))) {
              skipped.push(`${filename}: invalid type (MP4/MOV only)`);
              continue;
            }
            if (size > 25 * 1024 * 1024) {
              skipped.push(`${filename}: ${Math.round(size/1024/1024)}MB > 25MB`);
              continue;
            }
            // Accept videos up to and including 30s; allow tiny tolerance for metadata drift
            const maxMs = 30_000;
            if (durationMs !== undefined) {
              const effectiveMs = durationMs;
              if (effectiveMs > maxMs + 50) {
                const seconds = (effectiveMs / 1000).toFixed(1);
                skipped.push(`${filename}: ${seconds}s > 30.0s max`);
                continue;
              }
            }
          }

          newMedia.push({
            id: Date.now().toString() + index,
            uri: asset.uri,
            type: type,
            name: filename,
            size,
            isPrimary: media.length === 0 && index === 0,
            durationMs,
          });
        }

        const updatedMedia = [...media, ...newMedia];
        if (updatedMedia.length > maxFiles) {
          Alert.alert('Limit Reached', `You can only upload up to ${maxFiles} files.`);
          return;
        }

        onMediaChange(updatedMedia);

        if (skipped.length > 0) {
          Alert.alert(
            'Some files were skipped',
            `${skipped.length} file(s) were not added:\n\n${skipped.join('\n')}`
          );
        }
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick media. Please try again.');
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission Required',
        'Please grant camera permissions to take photos.'
      );
      return;
    }

    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
        aspect: [16, 9],
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const asset = result.assets[0];
        const newMedia: MediaFile = {
          id: Date.now().toString(),
          uri: asset.uri,
          type: 'image',
          name: `photo_${Date.now()}`,
          size: asset.fileSize || 0,
          isPrimary: media.length === 0,
        };

        const updatedMedia = [...media, newMedia];
        if (updatedMedia.length > maxFiles) {
          Alert.alert('Limit Reached', `You can only upload up to ${maxFiles} files.`);
          return;
        }

        onMediaChange(updatedMedia);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to take photo. Please try again.');
    }
  };

  const removeMedia = (id: string) => {
    const updatedMedia = media.filter(item => item.id !== id);
    // If we removed the primary image, make the first remaining image primary
    if (media.find(item => item.id === id)?.isPrimary && updatedMedia.length > 0) {
      updatedMedia[0].isPrimary = true;
    }
    onMediaChange(updatedMedia);
  };

  const setPrimary = (id: string) => {
    const updatedMedia = media.map(item => ({
      ...item,
      isPrimary: item.id === id
    }));
    onMediaChange(updatedMedia);
  };

  const reorderMedia = (fromIndex: number, toIndex: number) => {
    const updatedMedia = [...media];
    const [movedItem] = updatedMedia.splice(fromIndex, 1);
    updatedMedia.splice(toIndex, 0, movedItem);
    onMediaChange(updatedMedia);
  };

  const showPreview = (mediaItem: MediaFile) => {
    setPreviewModal({ visible: true, media: mediaItem });
  };

  return (
    <View style={styles.container}>
      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.sectionTitle}>Property Photos & Videos</Text>
          <Text style={styles.subtitle}>
            Upload high-quality photos and videos to showcase your property
          </Text>

          {/* Upload Buttons */}
          <View style={styles.uploadButtons}>
            <Button
              mode="outlined"
              onPress={() => pickMedia('image')}
              icon="image"
              style={styles.uploadButton}
              disabled={media.length >= maxFiles}
            >
              Add Photos
            </Button>
            
            {allowVideos && (
              <Button
                mode="outlined"
                onPress={() => pickMedia('video')}
                icon="video"
                style={styles.uploadButton}
                disabled={media.length >= maxFiles}
              >
                Add Videos
              </Button>
            )}
            
            <Button
              mode="outlined"
              onPress={takePhoto}
              icon="camera"
              style={styles.uploadButton}
              disabled={media.length >= maxFiles}
            >
              Take Photo
            </Button>
          </View>

          {/* Media Count */}
          <Text style={styles.mediaCount}>{media.length} of {maxFiles} files selected</Text>

          {/* Media Grid */}
          {media.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.mediaScroll}>
              <View style={styles.mediaGrid}>
                {media.map((item, index) => (
                  <Card key={item.id} style={styles.mediaCard}>
                    <TouchableOpacity onPress={() => showPreview(item)}>
                      <Card.Cover
                        source={{ uri: item.uri }}
                        style={styles.mediaThumbnail}
                      />
                      {item.type === 'video' && (
                        <View style={styles.videoOverlay}>
                          <IconButton icon="play" size={24} iconColor="white" />
                        </View>
                      )}
                      {item.isPrimary && (
                        <Chip style={styles.primaryChip} textStyle={styles.primaryChipText}>
                          Primary
                        </Chip>
                      )}
                      {item.type === 'video' && item.durationMs !== undefined && (
                        <Chip style={[styles.primaryChip, { top: 32 }]} textStyle={styles.primaryChipText}>
                          {(Math.round(item.durationMs / 1000))}s
                        </Chip>
                      )}
                      {/* Size badge */}
                      <Chip style={[styles.primaryChip, { top: 60 }]} textStyle={styles.primaryChipText}>
                        {Math.max(1, Math.round(item.size / 1024 / 1024))}MB
                      </Chip>
                    </TouchableOpacity>
                    
                    <View style={styles.mediaActions}>
                      {!item.isPrimary && (
                        <IconButton
                          icon="star-outline"
                          size={20}
                          onPress={() => setPrimary(item.id)}
                          style={styles.actionButton}
                        />
                      )}
                      {/* Reorder arrows */}
                      <IconButton
                        icon="chevron-left"
                        size={20}
                        disabled={index === 0}
                        onPress={() => reorderMedia(index, index - 1)}
                        style={styles.actionButton}
                      />
                      <IconButton
                        icon="chevron-right"
                        size={20}
                        disabled={index === media.length - 1}
                        onPress={() => reorderMedia(index, index + 1)}
                        style={styles.actionButton}
                      />
                      <IconButton
                        icon="delete"
                        size={20}
                        onPress={() => removeMedia(item.id)}
                        style={styles.actionButton}
                        iconColor={defaultTheme.colors.error}
                      />
                    </View>
                  </Card>
                ))}
              </View>
            </ScrollView>
          )}

          {/* Tips */}
          <Card style={styles.tipsCard}>
            <Card.Content>
              <Text style={styles.tipsTitle}>💡 Tips for great photos:</Text>
              <Text style={styles.tipText}>• Take photos in good lighting</Text>
              <Text style={styles.tipText}>• Show all rooms and key features</Text>
              <Text style={styles.tipText}>• Include exterior shots and amenities</Text>
              <Text style={styles.tipText}>• Keep the first photo as your best shot</Text>
            </Card.Content>
          </Card>
        </Card.Content>
      </Card>

      {/* Preview Modal */}
      <Portal>
        <Modal
          visible={previewModal.visible}
          onDismiss={() => setPreviewModal({ visible: false })}
          contentContainerStyle={styles.modalContainer}
        >
          {previewModal.media && (
            <View style={styles.modalContent}>
              {previewModal.media.type === 'video' ? (
                <Video
                  source={{ uri: previewModal.media.uri }}
                  style={styles.modalImage}
                  useNativeControls
                  resizeMode={ResizeMode.CONTAIN}
                  shouldPlay
                />
              ) : (
                <Image
                  source={{ uri: previewModal.media.uri }}
                  style={styles.modalImage}
                  resizeMode="contain"
                />
              )}
              <View style={styles.modalActions}>
                <Button
                  mode="contained"
                  onPress={() => setPreviewModal({ visible: false })}
                >
                  Close
                </Button>
              </View>
            </View>
          )}
        </Modal>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  card: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    color: defaultTheme.colors.onSurfaceVariant,
    marginBottom: 16,
  },
  uploadButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  uploadButton: {
    flex: 1,
    minWidth: 100,
  },
  mediaCount: {
    textAlign: 'center',
    color: defaultTheme.colors.onSurfaceVariant,
    marginBottom: 16,
  },
  mediaScroll: {
    marginBottom: 16,
  },
  mediaGrid: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 4,
  },
  mediaCard: {
    width: 120,
    height: 120,
    position: 'relative',
  },
  mediaThumbnail: {
    width: 120,
    height: 120,
    borderRadius: 8,
  },
  videoOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  primaryChip: {
    position: 'absolute',
    top: 4,
    left: 4,
    backgroundColor: defaultTheme.colors.primary,
  },
  primaryChipText: {
    color: 'white',
    fontSize: 10,
  },
  mediaActions: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    flexDirection: 'row',
  },
  actionButton: {
    margin: 0,
    backgroundColor: 'rgba(255,255,255,0.9)',
  },
  tipsCard: {
    backgroundColor: defaultTheme.colors.surfaceVariant,
  },
  tipsTitle: {
    fontWeight: 'bold',
    marginBottom: 8,
  },
  tipText: {
    fontSize: 12,
    marginBottom: 4,
    color: defaultTheme.colors.onSurfaceVariant,
  },
  modalContainer: {
    backgroundColor: 'white',
    margin: 20,
    borderRadius: 8,
    overflow: 'hidden',
  },
  modalContent: {
    alignItems: 'center',
  },
  modalImage: {
    width: '100%',
    height: 400,
  },
  modalActions: {
    padding: 16,
    width: '100%',
  },
}); 