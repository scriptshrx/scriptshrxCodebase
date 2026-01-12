const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const fs = require('fs');

/**
 * Storage Service Interface
 * Defines the standard for cloud storage operations
 */
class StorageService {
    async uploadFile(file, folder) { throw new Error('Not implemented'); }
    async deleteFile(filePath) { throw new Error('Not implemented'); }
    async getSignedUrl(filePath) { throw new Error('Not implemented'); }
    async getPublicUrl(filePath) { throw new Error('Not implemented'); }
}

/**
 * Supabase Storage Provider
 * Implementation of StorageService for Supabase
 */
class SupabaseStorageProvider extends StorageService {
    constructor() {
        super();
        const url = process.env.SUPABASE_URL || process.env.PUBLIC_SUPABASE_URL;
        const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.PUBLIC_SUPABASE_ANON_KEY;
        this.bucketName = process.env.SUPABASE_STORAGE_BUCKET || 'uploads';

        if (!url || !key) {
            console.warn('⚠️ Supabase Storage not fully configured. Missing URL or Key.');
            this.client = null;
        } else {
            this.client = createClient(url, key);
            console.log(`[Storage] Initialized Supabase Storage. Bucket: '${this.bucketName}'`);
        }
    }

    async uploadFile(file, folder = 'avatars') {
        if (!this.client) return null;

        const fileName = `${folder}/${Date.now()}-${file.originalname.replace(/\s+/g, '_')}`;

        const { data, error } = await this.client.storage
            .from(this.bucketName)
            .upload(fileName, file.buffer, {
                contentType: file.mimetype,
                upsert: true
            });

        if (error) {
            console.error('[Storage] Supabase Upload Error:', error);
            throw error;
        }

        return this.getPublicUrl(fileName);
    }

    async deleteFile(filePath) {
        if (!this.client) return;

        // Extract relative path if full URL is provided
        const relativePath = filePath.includes(this.bucketName)
            ? filePath.split(`${this.bucketName}/`)[1]
            : filePath;

        const { error } = await this.client.storage
            .from(this.bucketName)
            .remove([relativePath]);

        if (error) {
            console.error('[Storage] Supabase Delete Error:', error);
        }
    }

    getPublicUrl(fileName) {
        if (!this.client) return null;

        const { data } = this.client.storage
            .from(this.bucketName)
            .getPublicUrl(fileName);

        return data.publicUrl;
    }

    async getSignedUrl(fileName, expiresInt = 3600) {
        if (!this.client) return null;

        const { data, error } = await this.client.storage
            .from(this.bucketName)
            .createSignedUrl(fileName, expiresInt);

        if (error) {
            console.error('[Storage] Supabase Signed URL Error:', error);
            return null;
        }

        return data.signedUrl;
    }
}

module.exports = new SupabaseStorageProvider();
