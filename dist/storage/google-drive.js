import { randomUUID } from 'node:crypto';
import { Logger } from '@/utils/Logger';
export class GoogleDriveStorage {
    constructor() {
        this.logger = new Logger('GoogleDriveStorage');
    }
    async uploadReport(params) {
        this.logger.info(`Uploading report ${params.filename} to folder ${params.folder}`);
        return {
            id: randomUUID(),
            webViewLink: `https://drive.google.com/mock/${encodeURIComponent(params.folder)}/${encodeURIComponent(params.filename)}`,
        };
    }
    async uploadContent(params) {
        this.logger.info(`Uploading content to folder ${params.folder}`);
        return {
            id: randomUUID(),
            webViewLink: `https://drive.google.com/mock/${encodeURIComponent(params.folder)}/${Date.now()}`,
        };
    }
}
//# sourceMappingURL=google-drive.js.map