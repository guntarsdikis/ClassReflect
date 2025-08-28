import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import dotenv from 'dotenv';

dotenv.config();

// Initialize AWS clients
export const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'eu-west-2'
});

export const sqsClient = new SQSClient({
  region: process.env.AWS_REGION || 'eu-west-2'
});

// S3 bucket name from environment
export const S3_BUCKET = process.env.S3_BUCKET_NAME || 'classreflect-audio-files-573524060586';
export const SQS_QUEUE_URL = process.env.SQS_QUEUE_URL || 'https://sqs.eu-west-2.amazonaws.com/573524060586/classreflect-processing-queue';

// Upload file to S3
export async function uploadToS3(
  key: string,
  body: Buffer,
  contentType: string,
  metadata?: Record<string, string>
): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: S3_BUCKET,
    Key: key,
    Body: body,
    ContentType: contentType,
    Metadata: metadata
  });

  await s3Client.send(command);
  return `s3://${S3_BUCKET}/${key}`;
}

// Generate pre-signed URL for direct upload
export async function generatePresignedUploadUrl(
  key: string,
  contentType: string,
  expiresIn: number = 3600
): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: S3_BUCKET,
    Key: key,
    ContentType: contentType
  });

  return await getSignedUrl(s3Client, command, { expiresIn });
}

// Generate pre-signed URL for download
export async function generatePresignedDownloadUrl(
  key: string,
  expiresIn: number = 3600
): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: S3_BUCKET,
    Key: key
  });

  return await getSignedUrl(s3Client, command, { expiresIn });
}

// Get file content from S3 as Buffer
export async function getObject(key: string): Promise<Buffer> {
  const command = new GetObjectCommand({
    Bucket: S3_BUCKET,
    Key: key
  });

  const response = await s3Client.send(command);
  
  if (!response.Body) {
    throw new Error(`File not found in S3: ${key}`);
  }

  // Convert stream to buffer
  const chunks: Buffer[] = [];
  const stream = response.Body as NodeJS.ReadableStream;
  
  return new Promise((resolve, reject) => {
    stream.on('data', (chunk: Buffer) => chunks.push(chunk));
    stream.on('end', () => resolve(Buffer.concat(chunks)));
    stream.on('error', reject);
  });
}

// Send message to SQS queue
export async function sendToProcessingQueue(jobData: {
  jobId: string;
  s3Key: string;
  teacherId: number;
  schoolId: number;
}): Promise<string | undefined> {
  const command = new SendMessageCommand({
    QueueUrl: SQS_QUEUE_URL,
    MessageBody: JSON.stringify(jobData),
    MessageAttributes: {
      jobId: {
        DataType: 'String',
        StringValue: jobData.jobId
      },
      schoolId: {
        DataType: 'Number',
        StringValue: jobData.schoolId.toString()
      }
    }
  });

  const response = await sqsClient.send(command);
  return response.MessageId;
}