export type WebRecordingHandle = {
  platform: 'web';
  recorder: MediaRecorder;
  chunks: Blob[];
  stream: MediaStream;
  mimeType: string;
};

const validateBlobPlayable = (blob: Blob) => {
  return new Promise<void>((resolve, reject) => {
    const audio = new Audio();
    const url = URL.createObjectURL(blob);
    let settled = false;

    const cleanup = () => {
      if (settled) return;
      settled = true;
      audio.pause();
      audio.src = '';
      URL.revokeObjectURL(url);
    };

    const timer = window.setTimeout(() => {
      cleanup();
      reject(new Error('Audio file cannot be loaded.'));
    }, 3000);

    audio.addEventListener('loadedmetadata', () => {
      window.clearTimeout(timer);
      cleanup();
      resolve();
    }, { once: true });

    audio.addEventListener('error', () => {
      window.clearTimeout(timer);
      cleanup();
      reject(new Error('Audio file cannot be loaded.'));
    }, { once: true });

    audio.preload = 'metadata';
    audio.src = url;
  });
};

const pickMimeType = () => {
  const candidates = [
    'audio/webm;codecs=opus',
    'audio/webm',
  ];

  for (const candidate of candidates) {
    if (MediaRecorder.isTypeSupported(candidate)) {
      return candidate;
    }
  }

  return '';
};

export const startWebRecording = async (): Promise<WebRecordingHandle> => {
  if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
    throw new Error('MediaRecorder is not supported in this browser.');
  }

  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const mimeType = pickMimeType();
  const options: any = { audioBitsPerSecond: 64000 };
  if (mimeType) {
    options.mimeType = mimeType;
  }
  const recorder = new MediaRecorder(stream, options);
  const chunks: Blob[] = [];

  recorder.ondataavailable = (event: BlobEvent) => {
    if (event.data && event.data.size > 0) {
      chunks.push(event.data);
    }
  };

  recorder.start(200);

  return {
    platform: 'web',
    recorder,
    chunks,
    stream,
    mimeType: mimeType || 'audio/webm',
  };
};

export const stopWebRecording = (handle: WebRecordingHandle): Promise<{
  uri: string;
  blob: Blob;
  format: 'webm';
  mimeType: string;
}> => {
  return new Promise((resolve, reject) => {
    const { recorder, chunks, stream, mimeType } = handle;

    const cleanup = () => {
      stream.getTracks().forEach((track) => track.stop());
    };

    recorder.onstop = () => {
      try {
        const blob = new Blob(chunks, { type: mimeType });
        if (blob.size < 8 * 1024) {
          cleanup();
          reject(new Error('Audio file too small, may be corrupted.'));
          return;
        }
        validateBlobPlayable(blob)
          .then(() => {
            const uri = URL.createObjectURL(blob);
            cleanup();
            resolve({
              uri,
              blob,
              format: 'webm',
              mimeType,
            });
          })
          .catch((error) => {
            cleanup();
            reject(error);
          });
      } catch (error) {
        cleanup();
        reject(error);
      }
    };

    recorder.onerror = (event: MediaRecorderErrorEvent) => {
      cleanup();
      reject(event.error);
    };

    recorder.stop();
  });
};

export const cancelWebRecording = async (handle: WebRecordingHandle) => {
  handle.recorder.ondataavailable = null;
  handle.recorder.onerror = null;
  handle.recorder.onstop = null;
  if (handle.recorder.state !== 'inactive') {
    handle.recorder.stop();
  }
  handle.stream.getTracks().forEach((track) => track.stop());
};
