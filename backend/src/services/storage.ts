/**
 * Storage Abstraction Layer
 * Handles file storage for both local development and production environments
 */

import fs from 'fs/promises';
import path from 'path';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { config, EnvironmentConfig } from '../config/environment';

export interface StorageService {
  upload(key: string, buffer: Buffer, contentType: string, metadata?: Record<string, string>): Promise<string>;
  generatePresignedUrl(key: string, contentType: string, expiresIn?: number): Promise<string>;
  delete(key: string): Promise<void>;
}

/**
 * S3 Storage Service (Production)
 */
class S3StorageService implements StorageService {
  private s3Client: S3Client;
  private bucket: string;

  constructor(bucket: string) {
    this.s3Client = new S3Client({
      region: process.env.AWS_REGION || 'eu-west-2'
    });
    this.bucket = bucket;
  }

  async upload(key: string, buffer: Buffer, contentType: string, metadata?: Record<string, string>): Promise<string> {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: buffer,
      ContentType: contentType,
      Metadata: metadata
    });

    await this.s3Client.send(command);
    return `s3://${this.bucket}/${key}`;
  }

  async generatePresignedUrl(key: string, contentType: string, expiresIn: number = 3600): Promise<string> {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ContentType: contentType
    });

    return await getSignedUrl(this.s3Client, command, { expiresIn });
  }

  async delete(key: string): Promise<void> {
    // Implementation for S3 deletion
    console.log(`Would delete S3 object: ${key}`);
  }
}

/**
 * Local Filesystem Storage Service (Development)
 */
class LocalStorageService implements StorageService {
  private basePath: string;

  constructor(basePath: string) {
    this.basePath = basePath;
    this.ensureDirectoryExists();
  }

  private async ensureDirectoryExists(): Promise<void> {
    try {
      await fs.mkdir(this.basePath, { recursive: true });
    } catch (error) {
      console.error('Failed to create local storage directory:', error);
    }
  }

  async upload(key: string, buffer: Buffer, contentType: string, metadata?: Record<string, string>): Promise<string> {
    const filePath = path.join(this.basePath, key);
    const directory = path.dirname(filePath);
    
    // Ensure directory exists
    await fs.mkdir(directory, { recursive: true });
    
    // Write file
    await fs.writeFile(filePath, buffer);
    
    // Write metadata file if provided
    if (metadata) {
      const metadataPath = filePath + '.meta.json';
      await fs.writeFile(metadataPath, JSON.stringify({
        contentType,
        metadata,
        uploadedAt: new Date().toISOString()
      }));
    }

    return `file://${filePath}`;
  }

  async generatePresignedUrl(key: string, contentType: string, expiresIn: number = 3600): Promise<string> {
    // For local development, return a direct upload endpoint
    const uploadUrl = `http://localhost:3001/api/upload/local/${encodeURIComponent(key)}?contentType=${encodeURIComponent(contentType)}`;
    return uploadUrl;
  }

  async delete(key: string): Promise<void> {
    const filePath = path.join(this.basePath, key);
    const metadataPath = filePath + '.meta.json';
    
    try {
      await fs.unlink(filePath);
      await fs.unlink(metadataPath).catch(() => {}); // Ignore if metadata doesn't exist
    } catch (error) {
      console.error(`Failed to delete local file ${key}:`, error);
    }
  }
}

/**
 * Create storage service based on environment configuration
 */
function createStorageService(): StorageService {
  if (config.storage.type === 's3') {
    return new S3StorageService(config.storage.s3Bucket!);
  } else {
    return new LocalStorageService(config.storage.localPath!);
  }
}

export const storageService = createStorageService();
export { S3StorageService, LocalStorageService };