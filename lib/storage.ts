/**
 * Abstraction de stockage fichier — compatible S3 et Cloudflare R2
 * Fallback: stockage local si les variables S3 ne sont pas configurees
 */

import { randomBytes } from "crypto";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";

const BUCKET = process.env.AWS_S3_BUCKET;
const REGION = process.env.AWS_REGION || "auto";
const ACCESS_KEY = process.env.AWS_ACCESS_KEY_ID;
const SECRET_KEY = process.env.AWS_SECRET_ACCESS_KEY;
const ENDPOINT = process.env.AWS_S3_ENDPOINT; // Pour R2: https://<account>.r2.cloudflarestorage.com
const CDN_URL = process.env.STORAGE_CDN_URL; // URL publique du CDN

const isCloudConfigured = !!(
  BUCKET && 
  ACCESS_KEY && !ACCESS_KEY.startsWith("your-") && 
  SECRET_KEY && !SECRET_KEY.startsWith("your-")
);

/**
 * Upload un fichier et retourne l'URL publique
 */
export async function uploadFile(
  buffer: Buffer,
  options: {
    folder: string;
    filename: string;
    contentType: string;
  }
): Promise<string> {
  const ext = options.filename.split(".").pop() || "bin";
  const uniqueName = `${randomBytes(8).toString("hex")}.${ext}`;
  const key = `${options.folder}/${uniqueName}`;

  if (isCloudConfigured) {
    return uploadToS3(buffer, key, options.contentType);
  }

  return uploadLocal(buffer, key);
}

async function uploadToS3(
  buffer: Buffer,
  key: string,
  contentType: string
): Promise<string> {
  // Import dynamique pour ne pas bloquer si le SDK n'est pas installe
  const { S3Client, PutObjectCommand } = await import("@aws-sdk/client-s3");

  const client = new S3Client({
    region: REGION,
    credentials: {
      accessKeyId: ACCESS_KEY!,
      secretAccessKey: SECRET_KEY!,
    },
    ...(ENDPOINT ? { endpoint: ENDPOINT, forcePathStyle: true } : {}),
  });

  await client.send(
    new PutObjectCommand({
      Bucket: BUCKET!,
      Key: key,
      Body: buffer,
      ContentType: contentType,
      CacheControl: "public, max-age=31536000",
    })
  );

  // Retourner l'URL publique
  if (CDN_URL) {
    return `${CDN_URL}/${key}`;
  }
  if (ENDPOINT) {
    return `${ENDPOINT}/${BUCKET}/${key}`;
  }
  return `https://${BUCKET}.s3.${REGION}.amazonaws.com/${key}`;
}

async function uploadLocal(buffer: Buffer, key: string): Promise<string> {
  const dir = join(process.cwd(), "public", "uploads", key.split("/").slice(0, -1).join("/"));
  await mkdir(dir, { recursive: true });
  const filePath = join(process.cwd(), "public", "uploads", key);
  await writeFile(filePath, buffer);
  return `/uploads/${key}`;
}

/**
 * Taille maximale par type de fichier
 */
export const FILE_LIMITS = {
  image: 10 * 1024 * 1024, // 10 Mo
  video: 50 * 1024 * 1024, // 50 Mo
} as const;

export const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
];

export const ALLOWED_VIDEO_TYPES = [
  "video/mp4",
  "video/webm",
  "video/quicktime",
];
