import { Module } from '@nestjs/common';
import { ReceiptsController } from './receipts.controller';
import { OcrService } from './services/ocr.service';
import { TesseractOcrProvider } from './services/providers/tesseract-ocr.provider';
import { GoogleDocumentAiProvider } from './services/providers/google-document-ai.provider';

@Module({
  controllers: [ReceiptsController],
  providers: [OcrService, TesseractOcrProvider, GoogleDocumentAiProvider],
  exports: [OcrService, TesseractOcrProvider, GoogleDocumentAiProvider],
})
export class ReceiptsModule {}
