import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { IOcrProvider, ExtractedReceiptData, OcrProviderHealth } from '../../interfaces/ocr-provider.interface';

@Injectable()
export class GoogleDocumentAiProvider implements IOcrProvider {
  readonly providerName = 'google_document_ai';
  private readonly logger = new Logger(GoogleDocumentAiProvider.name);

  async extractDocument(file: Express.Multer.File): Promise<ExtractedReceiptData> {
    const projectId = process.env.GOOGLE_PROJECT_ID || process.env.GCP_PROJECT_ID;
    const location = process.env.GOOGLE_DOCUMENT_AI_LOCATION || 'us';
    const processorId = process.env.GOOGLE_DOCUMENT_AI_PROCESSOR_ID;

    if (!projectId || !processorId) {
      throw new BadRequestException(
        'Google Document AI processor is not fully configured (missing GOOGLE_PROJECT_ID or GOOGLE_DOCUMENT_AI_PROCESSOR_ID)'
      );
    }

    this.logger.log(`[GoogleDocumentAiProvider] Processing ${file.originalname} via Document AI (Processor: ${processorId})`);

    try {
      const endpoint = `https://${location}-documentai.googleapis.com/v1/projects/${projectId}/locations/${location}/processors/${processorId}:process`;
      const base64Content = file.buffer.toString('base64');
      const apiKey = process.env.GOOGLE_DOCUMENT_AI_API_KEY || process.env.GOOGLE_SCIM_API_KEY;

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (apiKey) {
        headers['X-Goog-Api-Key'] = apiKey;
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          rawDocument: {
            content: base64Content,
            mimeType: file.mimetype,
          },
        }),
      });

      if (!response.ok) {
        const errText = await response.text().catch(() => 'Document AI error');
        throw new Error(`Document AI HTTP ${response.status}: ${errText}`);
      }

      const data: any = await response.json();
      const document = data.document || {};
      const entities: any[] = document.entities || [];

      let merchant = 'General Merchant';
      let amount = 0;
      let date = new Date().toISOString().split('T')[0];
      let taxAmount = 0;
      let currency = 'USD';
      let merchantConf = 0.85;
      let amountConf = 0.9;
      let dateConf = 0.9;
      let taxConf = 0.85;

      for (const ent of entities) {
        const type = (ent.type || '').toLowerCase();
        const text = ent.mentionText || '';
        const conf = ent.confidence || 0.9;

        if (type.includes('supplier_name') || type.includes('vendor_name')) {
          merchant = text;
          merchantConf = conf;
        } else if (type.includes('total_amount') || type.includes('net_amount')) {
          const num = parseFloat(text.replace(/[^0-9.]/g, ''));
          if (!isNaN(num)) {
            amount = num;
            amountConf = conf;
          }
        } else if (type.includes('receipt_date') || type.includes('invoice_date')) {
          date = text;
          dateConf = conf;
        } else if (type.includes('vat_amount') || type.includes('tax_amount')) {
          const num = parseFloat(text.replace(/[^0-9.]/g, ''));
          if (!isNaN(num)) {
            taxAmount = num;
            taxConf = conf;
          }
        } else if (type.includes('currency')) {
          currency = text;
        }
      }

      const overall = parseFloat(((merchantConf + amountConf + dateConf + taxConf) / 4).toFixed(2));

      return {
        title: `${merchant} - Expense Claim`,
        merchant,
        amount,
        currency,
        date,
        category: 'Meals',
        taxAmount,
        gstNumber: '',
        referenceNumber: `DOCAI-${Date.now().toString().slice(-6)}`,
        businessPurpose: `Business expense verified via Google Document AI parser.`,
        lineItems: [
          {
            id: 'li_1',
            description: 'Item parsed by Document AI',
            amount,
            taxAmount,
          },
        ],
        confidence: {
          merchant: merchantConf,
          amount: amountConf,
          date: dateConf,
          taxAmount: taxConf,
          overall,
        },
        rawText: document.text?.slice(0, 1000) || '',
      };
    } catch (err: any) {
      this.logger.error(`[GoogleDocumentAiProvider] Failed: ${err.message}`);
      throw new BadRequestException(`Google Document AI processing failed: ${err.message}`);
    }
  }

  async checkHealth(): Promise<OcrProviderHealth> {
    const projectId = process.env.GOOGLE_PROJECT_ID || process.env.GCP_PROJECT_ID;
    const processorId = process.env.GOOGLE_DOCUMENT_AI_PROCESSOR_ID;
    const isConfigured = !!(projectId && processorId);

    return {
      provider: 'Google Cloud Document AI (Specialized Expense Parser)',
      status: isConfigured ? 'CONFIGURED' : 'NOT_CONFIGURED',
      mode: 'CLOUD_DOCUMENT_AI',
      healthy: isConfigured,
    };
  }
}
