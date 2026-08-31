import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { IOcrProvider, ExtractedReceiptData, OcrProviderHealth } from '../interfaces/ocr-provider.interface';
import { TesseractOcrProvider } from './providers/tesseract-ocr.provider';
import { GoogleDocumentAiProvider } from './providers/google-document-ai.provider';

@Injectable()
export class OcrService {
  private readonly logger = new Logger(OcrService.name);

  constructor(
    private readonly tesseractProvider: TesseractOcrProvider,
    private readonly googleDocAiProvider: GoogleDocumentAiProvider,
  ) {
    const activeProvider = this.getActiveProviderName();
    this.logger.log(`[OcrService] Active OCR Extraction Engine: ${activeProvider}`);
  }

  private getActiveProviderName(): string {
    const requested = (process.env.OCR_PROVIDER || '').toLowerCase();
    const hasGoogleDocAi = !!(
      (process.env.GOOGLE_PROJECT_ID || process.env.GCP_PROJECT_ID) &&
      process.env.GOOGLE_DOCUMENT_AI_PROCESSOR_ID
    );

    if (requested === 'google_document_ai' || hasGoogleDocAi) {
      return 'Google Cloud Document AI (Specialized Expense Processor)';
    }
    return 'Tesseract.js WASM Engine & High-Performance PDF Stream Parser';
  }

  private getActiveProvider(): IOcrProvider {
    const requested = (process.env.OCR_PROVIDER || '').toLowerCase();
    const hasGoogleDocAi = !!(
      (process.env.GOOGLE_PROJECT_ID || process.env.GCP_PROJECT_ID) &&
      process.env.GOOGLE_DOCUMENT_AI_PROCESSOR_ID
    );

    if (requested === 'google_document_ai' || hasGoogleDocAi) {
      return this.googleDocAiProvider;
    }
    return this.tesseractProvider;
  }

  /**
   * Validates document magic bytes, file size, and extension integrity
   */
  validateFile(file: Express.Multer.File): void {
    if (!file || !file.buffer) {
      throw new BadRequestException('No valid file document received for OCR processing');
    }

    const MAX_SIZE = 10 * 1024 * 1024; // 10MB limit
    if (file.size > MAX_SIZE) {
      throw new BadRequestException('File size exceeds the maximum enterprise limit of 10MB');
    }

    const buffer = file.buffer;
    if (buffer.length < 4) {
      throw new BadRequestException('File is corrupted or empty');
    }

    // Security Check: Magic Bytes Verification
    const isPng = buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47;
    const isJpeg = buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
    const isPdf = buffer.slice(0, 4).toString('ascii') === '%PDF';
    const isWebp =
      buffer.slice(0, 4).toString('ascii') === 'RIFF' &&
      buffer.length >= 12 &&
      buffer.slice(8, 12).toString('ascii') === 'WEBP';

    if (!isPng && !isJpeg && !isPdf && !isWebp) {
      throw new BadRequestException(
        'Invalid document file signature. Only authentic PDF, PNG, JPG, JPEG, and WEBP files are accepted'
      );
    }

    // Security Check: Block dangerous executable extensions
    const dangerousExtensions = ['.exe', '.sh', '.bat', '.cmd', '.js', '.vbs', '.php', '.py', '.pl', '.dll'];
    const lowerName = (file.originalname || '').toLowerCase();
    for (const ext of dangerousExtensions) {
      if (lowerName.endsWith(ext)) {
        throw new BadRequestException(`Security violation: Executable extension ${ext} is strictly prohibited`);
      }
    }
  }

  /**
   * Main entrypoint: Extracts text and parses entities from receipt image or PDF
   */
  async processDocument(file: Express.Multer.File): Promise<ExtractedReceiptData> {
    this.validateFile(file);
    const provider = this.getActiveProvider();

    try {
      return await provider.extractDocument(file);
    } catch (err: any) {
      // If specialized provider fails, fall back to Tesseract
      if (provider !== this.tesseractProvider) {
        this.logger.warn(`[OcrService] Primary provider failed: ${err.message}. Falling back to Tesseract engine...`);
        return await this.tesseractProvider.extractDocument(file);
      }
      throw err;
    }
  }

  /**
   * Health Check for OCR subsystem
   */
  async checkHealth(): Promise<{ activeProvider: string; providers: OcrProviderHealth[] }> {
    const tesseractHealth = await this.tesseractProvider.checkHealth();
    const docAiHealth = await this.googleDocAiProvider.checkHealth();

    return {
      activeProvider: this.getActiveProviderName(),
      providers: [tesseractHealth, docAiHealth],
    };
  }
}
