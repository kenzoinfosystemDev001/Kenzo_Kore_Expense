import {
  Controller,
  Post,
  Get,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  UseGuards,
  Req,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { v2 as cloudinary } from 'cloudinary';
import * as streamifier from 'streamifier';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { OcrService } from './services/ocr.service';

@Controller('api/v1/receipts')
@UseGuards(JwtAuthGuard)
export class ReceiptsController {
  constructor(private readonly ocrService: OcrService) {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });
  }

  /**
   * Health Check for Document OCR Subsystem
   */
  @Get('ocr-health')
  async getOcrHealth() {
    return this.ocrService.checkHealth();
  }

  /**
   * Standard receipt image/PDF upload to Cloudinary
   */
  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadReceipt(@UploadedFile() file: any) {
    if (!file) {
      throw new BadRequestException('No file provided for upload');
    }

    // Security Check: File validation
    this.ocrService.validateFile(file);

    // Sanitize filename to prevent path traversal
    const safeFilename = (file.originalname || 'receipt')
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .slice(0, 100);

    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    if (cloudName && apiKey && apiSecret) {
      try {
        const result: any = await new Promise((resolve, reject) => {
          const uploadStream = cloudinary.uploader.upload_stream(
            {
              folder: 'kenzo_kore_receipts',
              public_id: `rec_${Date.now()}_${safeFilename.split('.')[0]}`,
              resource_type: 'auto',
            },
            (error, result) => {
              if (error) return reject(error);
              resolve(result);
            }
          );
          streamifier.createReadStream(file.buffer).pipe(uploadStream);
        });

        return {
          message: 'Receipt uploaded to Cloudinary successfully',
          fileUrl: result.secure_url,
          publicId: result.public_id,
        };
      } catch (err: any) {
        console.error('Cloudinary upload error:', err);
        const base64 = file.buffer.toString('base64');
        const dataUrl = `data:${file.mimetype};base64,${base64}`;
        return {
          message: 'Uploaded as Data URI fallback',
          fileUrl: dataUrl,
        };
      }
    }

    const base64 = file.buffer.toString('base64');
    const dataUrl = `data:${file.mimetype};base64,${base64}`;
    return {
      message: 'Uploaded as Data URI fallback (Cloudinary keys missing in local .env)',
      fileUrl: dataUrl,
    };
  }

  /**
   * Real Enterprise OCR Receipt / Invoice Processing
   * Concurrently uploads the receipt to Cloudinary and executes decoupled OCR entity extraction
   */
  @Post('process-ocr')
  @UseInterceptors(FileInterceptor('file'))
  async processOcr(@UploadedFile() file: any) {
    if (!file) {
      throw new BadRequestException('No document file provided for OCR extraction');
    }

    // 1. Run OCR and Entity Extraction with strict security validation
    const extractedData = await this.ocrService.processDocument(file);

    // 2. Concurrently Upload Receipt Document to Cloudinary
    let receiptUrl = '';
    const safeFilename = (file.originalname || 'receipt')
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .slice(0, 100);

    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    if (cloudName && apiKey && apiSecret) {
      try {
        const result: any = await new Promise((resolve, reject) => {
          const uploadStream = cloudinary.uploader.upload_stream(
            {
              folder: 'kenzo_kore_receipts',
              public_id: `ocr_${Date.now()}_${safeFilename.split('.')[0]}`,
              resource_type: 'auto',
            },
            (error, result) => {
              if (error) return reject(error);
              resolve(result);
            }
          );
          streamifier.createReadStream(file.buffer).pipe(uploadStream);
        });
        receiptUrl = result.secure_url;
      } catch (err: any) {
        console.warn('Cloudinary upload fallback to data URI:', err.message);
        const base64 = file.buffer.toString('base64');
        receiptUrl = `data:${file.mimetype};base64,${base64}`;
      }
    } else {
      const base64 = file.buffer.toString('base64');
      receiptUrl = `data:${file.mimetype};base64,${base64}`;
    }

    return {
      success: true,
      message: 'Receipt document successfully scanned and parsed',
      receiptUrl,
      fileName: safeFilename,
      fileSize: file.size,
      mimeType: file.mimetype,
      extractedData,
    };
  }
}
