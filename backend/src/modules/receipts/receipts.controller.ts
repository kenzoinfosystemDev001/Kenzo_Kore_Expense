import { Controller, Post, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { v2 as cloudinary } from 'cloudinary';
import * as streamifier from 'streamifier';

@Controller('api/v1/receipts')
export class ReceiptsController {
  constructor() {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });
  }

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadReceipt(@UploadedFile() file: any) {
    if (!file) {
      throw new BadRequestException('No file provided for upload');
    }

    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    // Check if Cloudinary credentials are fully configured
    if (cloudName && apiKey && apiSecret) {
      try {
        const result: any = await new Promise((resolve, reject) => {
          const uploadStream = cloudinary.uploader.upload_stream(
            {
              folder: 'kenzo_kore_receipts',
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
        // Fallback to data URI if Cloudinary upload service returns an API error
        const base64 = file.buffer.toString('base64');
        const dataUrl = `data:${file.mimetype};base64,${base64}`;
        return {
          message: 'Uploaded as Data URI fallback',
          fileUrl: dataUrl,
        };
      }
    }

    // Fallback if environment variables are not set locally
    const base64 = file.buffer.toString('base64');
    const dataUrl = `data:${file.mimetype};base64,${base64}`;
    return {
      message: 'Uploaded as Data URI fallback (Cloudinary keys missing in local .env)',
      fileUrl: dataUrl,
    };
  }
}

