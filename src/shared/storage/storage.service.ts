import { Storage } from '@google-cloud/storage';

import { Injectable } from '@nestjs/common';
import { ConfigurationService } from '../configuration/configuration.service';

@Injectable()
export class StorageService {
  private readonly storage: Storage;
  private readonly bucketName: string;

  constructor(
    private readonly configurationService: ConfigurationService,
  ) {
    this.bucketName = configurationService.get('GOOGLE_CLOUD_STORAGE_BUCKET');

    this.storage = new Storage({
      projectId: configurationService.get('GOOGLE_CLOUD_PROJECT_ID'),
      credentials: {
        client_email: configurationService.get('GOOGLE_CLOUD_STORAGE_CLIENT_EMAIL'),
        private_key: configurationService.get('GOOGLE_CLOUD_STORAGE_PRIVATE_KEY'),
      },
    });
  }

  async upload(content: Buffer, contentType: string, name: string): Promise<void> {
    const bucket = this.storage.bucket(this.bucketName);

    await bucket.file(name).save(content.buffer, {
      contentType,
    });
  }

  async delete(name: string): Promise<void> {
    const bucket = this.storage.bucket(this.bucketName);
    await bucket.file(name).delete();
  }

  getFileUrl(name: string): string {
    return `https://storage.googleapis.com/${this.bucketName}/${name}`;
  }
}
