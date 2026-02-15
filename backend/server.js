require('dotenv').config();
const express = require('express');
const multer = require('multer');
const crypto = require('crypto');
const {
  S3Client,
  PutObjectCommand,
} = require('@aws-sdk/client-s3');

const app = express();
const upload = multer({ storage: multer.memoryStorage() });
const PORT = process.env.PORT || 4000;

const bucket = process.env.S3_BUCKET;
const region = process.env.AWS_REGION;

if (!bucket || !region) {
  console.warn('Missing S3_BUCKET or AWS_REGION. Uploads will be rejected until both are set.');
}

const s3 = new S3Client({
  region,
  credentials: process.env.AWS_ACCESS_KEY_ID
    ? {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        sessionToken: process.env.AWS_SESSION_TOKEN,
      }
    : undefined,
});

app.post('/api/upload', upload.single('paper'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Please attach a PDF under the key "paper".' });
  }

  if (!bucket || !region) {
    return res
      .status(500)
      .json({ error: 'Server is missing required AWS configuration (S3_BUCKET/AWS_REGION).' });
  }

  const key = `${Date.now()}-${crypto.randomBytes(4).toString('hex')}-${req.file.originalname}`;

  try {
    await s3.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: req.file.buffer,
        ContentType: req.file.mimetype,
      }),
    );

    res.json({ key });
  } catch (error) {
    console.error('upload error', error);
    res.status(500).json({ error: 'Unable to write to S3.' });
  }
});

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', uploads: !!bucket && !!region });
});

app.listen(PORT, () => {
  console.log(`Backend listening on port ${PORT}`);
});
