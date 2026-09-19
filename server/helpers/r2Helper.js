const {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} = require("@aws-sdk/client-s3");
const { NodeHttpHandler } = require("@smithy/node-http-handler");
const { Agent: HttpsAgent } = require("https");
const { v4: uuidv4 } = require("uuid");
const path = require("path");
const {
  R2_ACCOUNT_ID,
  R2_ACCESS_KEY,
  R2_SECRET_KEY,
  R2_BUCKET,
  R2_PUBLIC_URL,
} = require("../config/config");

const httpsAgent = new HttpsAgent({
  keepAlive: true,
  maxSockets: 50,
  maxFreeSockets: 10,
  timeout: 60_000,
});

// Reuse TCP connections across parallel uploads (big win for multi-image news/gallery)
const s3Client = new S3Client({
  region: "auto",
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY,
    secretAccessKey: R2_SECRET_KEY,
  },
  requestHandler: new NodeHttpHandler({
    httpsAgent,
    connectionTimeout: 10_000,
    requestTimeout: 120_000,
  }),
  // Faster + R2-compatible: skip default flexible checksums on every PutObject
  requestChecksumCalculation: "WHEN_REQUIRED",
  responseChecksumValidation: "WHEN_REQUIRED",
  maxAttempts: 2,
});

/**
 * Upload file to Cloudflare R2
 * @param {Object} file - Multer file object (from memoryStorage)
 * @param {String} folder - Folder path in R2 (e.g., 'slider', 'gallery')
 * @returns {Promise<Object>} - { url, key, size, mimeType }
 */
const uploadToR2 = async (file, folder = "") => {
  try {
    if (!file || !file.buffer) {
      throw new Error("Invalid file object");
    }

    const fileExtension = path.extname(file.originalname || "");
    const fileName = `${uuidv4()}${fileExtension}`;
    const key = folder ? `${folder}/${fileName}` : fileName;

    const uploadParams = {
      Bucket: R2_BUCKET,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
      // Avoid unnecessary checksum work on put for faster uploads
      // ContentLength helps the SDK stream efficiently
      ContentLength: file.buffer.length,
    };

    const command = new PutObjectCommand(uploadParams);
    await s3Client.send(command);

    const url = R2_PUBLIC_URL
      ? `${R2_PUBLIC_URL}/${key}`
      : `https://pub-${R2_ACCOUNT_ID}.r2.dev/${R2_BUCKET}/${key}`;

    return {
      url,
      key,
      size: file.size || file.buffer.length,
      mimeType: file.mimetype,
    };
  } catch (error) {
    console.error("Error uploading to R2:", error);
    throw new Error(`Failed to upload file to R2: ${error.message}`);
  }
};

/**
 * Delete file from Cloudflare R2
 * @param {String} fileKey - The key/path of the file in R2
 * @returns {Promise<Boolean>} - True if successful
 */
const deleteFromR2 = async (fileKey) => {
  try {
    if (!fileKey) {
      throw new Error("File key is required");
    }

    const deleteParams = {
      Bucket: R2_BUCKET,
      Key: fileKey,
    };

    const command = new DeleteObjectCommand(deleteParams);
    await s3Client.send(command);

    return true;
  } catch (error) {
    console.error("Error deleting from R2:", error);
    throw new Error(`Failed to delete file from R2: ${error.message}`);
  }
};

module.exports = {
  uploadToR2,
  deleteFromR2,
};
