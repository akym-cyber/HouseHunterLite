import crypto from 'crypto';

const normalizePublicId = (value: string) => {
  const trimmed = value.trim().replace(/^\/+/, '');
  return trimmed.replace(/\.[a-z0-9]+$/i, '');
};

const isVersionToken = (value?: string) => !!value && /^v\d+$/.test(value);

const createSignature = (payload: string, secret: string) => {
  const digest = crypto
    .createHash('sha1')
    .update(payload + secret)
    .digest('base64');
  const urlSafe = digest.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return urlSafe.slice(0, 8);
};

export default function handler(req: any, res: any) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME || process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiSecret) {
    res.status(500).json({ error: 'Cloudinary signing not configured.' });
    return;
  }

  const rawPublicId = Array.isArray(req.query.publicId)
    ? req.query.publicId[0]
    : req.query.publicId;
  const rawVersion = Array.isArray(req.query.version)
    ? req.query.version[0]
    : req.query.version;

  if (!rawPublicId) {
    res.status(400).json({ error: 'Missing publicId' });
    return;
  }

  const publicId = normalizePublicId(String(rawPublicId));
  const version = isVersionToken(rawVersion ? String(rawVersion) : undefined) ? String(rawVersion) : '';
  const transformation = 'q_auto:audio,f_mp3';
  const format = 'mp3';

  const signaturePayload = [
    transformation,
    version,
    `${publicId}.${format}`,
  ].filter(Boolean).join('/');

  const signature = createSignature(signaturePayload, apiSecret);
  const versionSegment = version ? `${version}/` : '';

  const url = `https://res.cloudinary.com/${cloudName}/video/upload/s--${signature}--/${transformation}/${versionSegment}${publicId}.${format}`;

  res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=300');
  res.status(200).json({ url });
}
