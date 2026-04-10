const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const crypto = require('crypto');

function cleanEnv(value) {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

function parsePublicBase(publicBase) {
  const normalized = cleanEnv(publicBase);
  if (!normalized) return {};

  try {
    const url = new URL(normalized);
    const host = url.hostname;
    const pathBucket = url.pathname.split('/').filter(Boolean)[0];

    const virtualHostedMatch = host.match(/^(.+)\.s3[.-]([a-z0-9-]+)\.amazonaws\.com$/i);
    const legacyHostedMatch = host.match(/^(.+)\.s3\.amazonaws\.com$/i);
    const pathStyleMatch = host.match(/^s3[.-]([a-z0-9-]+)\.amazonaws\.com$/i);

    if (virtualHostedMatch) {
      return { bucketName: virtualHostedMatch[1], region: virtualHostedMatch[2] };
    }

    if (legacyHostedMatch) {
      return { bucketName: legacyHostedMatch[1] };
    }

    if (pathStyleMatch && pathBucket) {
      return { bucketName: pathBucket, region: pathStyleMatch[1] };
    }
  } catch (_) {
    return {};
  }

  return {};
}

function buildConfig() {
  const publicBase = cleanEnv(process.env.S3_PUBLIC_BASE || process.env.AWS_S3_PUBLIC_BASE);
  const parsedFromPublicBase = parsePublicBase(publicBase);

  return {
    bucketName: cleanEnv(process.env.AWS_BUCKET_NAME || process.env.S3_BUCKET) || parsedFromPublicBase.bucketName,
    region: cleanEnv(process.env.AWS_REGION || process.env.S3_REGION) || parsedFromPublicBase.region,
    accessKeyId: cleanEnv(process.env.AWS_ACCESS_KEY_ID || process.env.S3_ACCESS_KEY_ID),
    secretAccessKey: cleanEnv(process.env.AWS_SECRET_ACCESS_KEY || process.env.S3_SECRET_ACCESS_KEY),
    publicBase,
  };
}

function createConfigError(missingKeys) {
  const error = new Error(
    `Configuracion S3 incompleta. Faltan: ${missingKeys.join(', ')}. ` +
      'Podes usar AWS_BUCKET_NAME o S3_BUCKET para el bucket.'
  );
  error.statusCode = 500;
  error.isOperational = true;
  return error;
}

function getUploadConfig() {
  const config = buildConfig();
  const missing = [];

  if (!config.bucketName) missing.push('AWS_BUCKET_NAME/S3_BUCKET');
  if (!config.region) missing.push('AWS_REGION/S3_REGION');
  if (!config.accessKeyId) missing.push('AWS_ACCESS_KEY_ID/S3_ACCESS_KEY_ID');
  if (!config.secretAccessKey) missing.push('AWS_SECRET_ACCESS_KEY/S3_SECRET_ACCESS_KEY');

  if (missing.length) {
    throw createConfigError(missing);
  }

  return config;
}

let cachedClient;
let cachedSignature;

function getS3Client(config) {
  const signature = `${config.region}:${config.accessKeyId}:${config.secretAccessKey}`;

  if (!cachedClient || cachedSignature !== signature) {
    cachedClient = new S3Client({
      region: config.region,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    });
    cachedSignature = signature;
  }

  return cachedClient;
}

async function uploadFile(fileBuffer, originalname, mimetype) {
  const config = getUploadConfig();
  const s3Client = getS3Client(config);
  const randomImageName = (bytes = 16) => crypto.randomBytes(bytes).toString('hex');
  const fileName = randomImageName() + '-' + originalname.replace(/\s/g, '_');

  const uploadParams = {
    Bucket: config.bucketName,
    Body: fileBuffer,
    Key: fileName,
    ContentType: mimetype,
  };

  await s3Client.send(new PutObjectCommand(uploadParams));
  return { key: fileName };
}

function getPublicUrl(key) {
  if (!key) return null;

  const config = buildConfig();

  if (config.publicBase) {
    return `${config.publicBase.replace(/\/+$/, '')}/${key}`;
  }

  if (!config.bucketName || !config.region) {
    throw createConfigError([
      !config.bucketName ? 'AWS_BUCKET_NAME/S3_BUCKET' : null,
      !config.region ? 'AWS_REGION/S3_REGION' : null,
    ].filter(Boolean));
  }

  return `https://${config.bucketName}.s3.${config.region}.amazonaws.com/${key}`;
}

module.exports = { uploadFile, getPublicUrl };
