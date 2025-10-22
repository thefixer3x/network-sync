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
export declare class GoogleDriveStorage {
    private readonly logger;
    uploadReport(params: UploadReportParams): Promise<DriveUploadResult>;
    uploadContent(params: UploadContentParams): Promise<DriveUploadResult>;
}
export {};
//# sourceMappingURL=google-drive.d.ts.map