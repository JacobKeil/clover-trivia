import {
  CopyObjectCommand,
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client
} from '@aws-sdk/client-s3';
import { env } from '$env/dynamic/private';

const s3 = new S3Client({
  region: env.AWS_REGION,
  credentials: {
    accessKeyId: env.AMS_ACCESS_KEY_ID as string,
    secretAccessKey: env.AWS_SECRET_ACCESS_KEY as string
  }
});

const SUPPORTED_IMAGE_TYPES = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp']);

export function is_uploaded_file(value: FormDataEntryValue | null): value is File {
  return (
    value !== null &&
    typeof value !== 'string' &&
    value.size > 0 &&
    SUPPORTED_IMAGE_TYPES.has(value.type) &&
    typeof value.arrayBuffer === 'function'
  );
}

export async function upload_to_s3(file: File, folder: string) {
  const file_extension = file.name.split('.').pop();
  const key = `${folder}/${crypto.randomUUID()}.${file_extension}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  await s3.send(
    new PutObjectCommand({
      Bucket: env.AWS_S3_BUCKET_NAME,
      Key: key,
      Body: buffer,
      ContentType: file.type
    })
  );

  const url = `https://${env.AWS_S3_BUCKET_NAME}.s3.${env.AWS_REGION}.amazonaws.com/${key}`;
  return { url, key };
}

export async function delete_from_s3(key: string) {
  await s3.send(
    new DeleteObjectCommand({
      Bucket: env.AWS_S3_BUCKET_NAME,
      Key: key
    })
  );
}

export async function copy_s3_object(source_url: string, folder: string) {
  const source_key = extract_key_from_url(source_url);
  if (!source_key) throw new Error('The question image URL is invalid.');
  const file_extension = source_key.split('.').pop();
  const key = `${folder}/${crypto.randomUUID()}.${file_extension}`;

  await s3.send(
    new CopyObjectCommand({
	    Bucket: env.AWS_S3_BUCKET_NAME,
      CopySource: `${env.AWS_S3_BUCKET_NAME}/${source_key}`,
      Key: key
    })
  );

  return {
    url: `https://${env.AWS_S3_BUCKET_NAME}.s3.${env.AWS_REGION}.amazonaws.com/${key}`,
    key
  };
}

export function extract_key_from_url(url: string | null): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    // Returns everything after the leading '/' (e.g. 'logos/abc-123.jpg')
    return parsed.pathname.substring(1);
  } catch {
    return null;
  }
}
