/**
 * Storage Service & Client
 * Object storage abstraction wrapping mbkbucket (Local Disk / S3 / Cloudflare R2 / Google Drive).
 */
import {
    downloadFile,
    uploadFile,
    deleteFile,
    deleteFiles,
    deleteFolder,
    getFileMetadata,
    fileExists,
    listfiles,
    createFolder,
    getStorageProvider,
    ensureKeyHasAppPrefix,
} from 'mbkbucket';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

function resolveDefaultBucket() {
    if (process.env.DEFAULT_BUCKET) return process.env.DEFAULT_BUCKET;
    try {
        const raw = process.env.BucketConnection;
        const parsed = raw ? (typeof raw === 'string' ? JSON.parse(raw) : raw) : {};
        if (process.env.mbkautheVar) {
            const authVar = typeof process.env.mbkautheVar === 'string'
                ? JSON.parse(process.env.mbkautheVar)
                : process.env.mbkautheVar;
            if (authVar?.bucket && (!raw || parsed[authVar.bucket])) {
                return authVar.bucket;
            }
        }
        const keys = Object.keys(parsed);
        if (keys.length > 0) return keys[0];
    } catch {}
    return 'E2_Bucket';
}

export class StorageService {
    constructor(defaultBucket = resolveDefaultBucket()) {
        this.defaultBucket = defaultBucket;
    }

    async getMetadata(key, bucketName = this.defaultBucket) {
        return getFileMetadata(key, bucketName);
    }

    async download(key, options = {}) {
        const bucketName = options.bucketName || this.defaultBucket;
        return downloadFile(key, { ...options, bucketName });
    }

    async upload(key, fileBuffer, contentType = 'application/octet-stream', options = {}) {
        const bucketName = options.bucketName || this.defaultBucket;
        return uploadFile(key, fileBuffer, contentType, { ...options, bucketName });
    }

    supportsDirectUploads() {
        return getStorageProvider(this.defaultBucket).type === 's3';
    }

    async createPresignedUploadUrl(key, contentType = 'application/octet-stream') {
        const provider = getStorageProvider(this.defaultBucket);
        if (provider.type !== 's3' || !provider.client || !provider.bucket) {
            throw new Error('Direct uploads require an S3-compatible storage provider.');
        }

        const headers = {
            'Content-Type': contentType,
            'Cache-Control': 'public, max-age=31536000',
            'x-amz-server-side-encryption': 'AES256',
        };
        const command = new PutObjectCommand({
            Bucket: provider.bucket,
            Key: ensureKeyHasAppPrefix(key),
            ContentType: contentType,
            ServerSideEncryption: 'AES256',
            CacheControl: 'public, max-age=31536000',
        });

        return {
            url: await getSignedUrl(provider.client, command, { expiresIn: 300 }),
            headers,
        };
    }

    async delete(key, bucketName = this.defaultBucket) {
        return deleteFile(key, bucketName);
    }

    async deleteMany(keys, bucketName = this.defaultBucket) {
        return deleteFiles(keys, bucketName);
    }

    async list(prefix = '', options = {}) {
        const bucketName = options.bucketName || this.defaultBucket;
        return listfiles(prefix, { ...options, bucketName });
    }

    async exists(key, bucketName = this.defaultBucket) {
        return fileExists(key, bucketName);
    }

    async createDirectory(folderPath, bucketName = this.defaultBucket) {
        return createFolder(folderPath, bucketName);
    }
}

export const storageService = new StorageService();

export {
    downloadFile,
    uploadFile,
    deleteFile,
    deleteFiles,
    deleteFolder,
    getFileMetadata,
    fileExists,
    listfiles,
    createFolder
};

export default storageService;
