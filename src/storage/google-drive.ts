import { randomUUID } from 'node:crypto';
import { Logger } from '@/utils/Logger';

interface UploadReportParams {
  content: string;
  filename: string;
  folder: string;
  metadata?: Record<string, unknown>;
}

interface UploadContentParams {
  content: string;
  folder: string;
  metadata?: Record<string, unknown>;
}

interface DriveUploadResult {
  id: string;
  webViewLink: string;
}

export class GoogleDriveStorage {
  private readonly logger = new Logger('GoogleDriveStorage');

  async uploadReport(params: UploadReportParams): Promise<DriveUploadResult> {
    this.logger.info(`Uploading report ${params.filename} to folder ${params.folder}`);

    return {
      id: randomUUID(),
      webViewLink: `https://drive.google.com/mock/${encodeURIComponent(params.folder)}/${encodeURIComponent(params.filename)}`,
    };
  }

  async uploadContent(params: UploadContentParams): Promise<DriveUploadResult> {
    this.logger.info(`Uploading content to folder ${params.folder}`);

    return {
      id: randomUUID(),
      webViewLink: `https://drive.google.com/mock/${encodeURIComponent(params.folder)}/${Date.now()}`,
    };
  }
}
