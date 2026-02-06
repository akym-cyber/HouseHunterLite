export interface AudioPlayerProps {
  remoteUrl?: string | null;
  duration?: number;
  waveform?: number[];
  isOwnMessage: boolean;
  uploadStatus?: 'uploading' | 'uploaded' | 'failed';
  uploadProgress?: number;
  sentTime?: string;
  statusIcon?: string;
  statusColor?: string;
  statusSize?: number;
  format?: 'm4a' | 'webm';
  mimeType?: string;
  onRetry?: () => void;
  showDebug?: boolean;
}
