import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { createWorker } from 'tesseract.js';
import { IOcrProvider, ExtractedReceiptData, OcrProviderHealth } from '../../interfaces/ocr-provider.interface';

@Injectable()
export class TesseractOcrProvider implements IOcrProvider {
  readonly providerName = 'tesseract';
  private readonly logger = new Logger(TesseractOcrProvider.name);

  async extractDocument(file: Express.Multer.File): Promise<ExtractedReceiptData> {
    const isPdf = file.mimetype === 'application/pdf' || file.buffer.slice(0, 4).toString('ascii') === '%PDF';
    let rawText = '';

    if (isPdf) {
      this.logger.log(`[TesseractOcrProvider] Extracting text from PDF: ${file.originalname}`);
      rawText = await this.extractFromPdf(file.buffer);
    } else {
      this.logger.log(`[TesseractOcrProvider] Executing Tesseract WASM OCR on image: ${file.originalname}`);
      rawText = await this.extractFromImage(file.buffer);
    }

    return this.parseReceiptEntities(rawText, file.originalname);
  }

  private async extractFromPdf(buffer: Buffer): Promise<string> {
    try {
      const pdfModule = require('pdf-parse');
      if (pdfModule.PDFParse) {
        const parser = new pdfModule.PDFParse({ data: buffer, verbosity: 0 });
        await parser.load();
        const res = await parser.getText();
        return res?.text || '';
      } else if (typeof pdfModule === 'function') {
        const data = await pdfModule(buffer);
        return data.text || '';
      }
      return '';
    } catch (err: any) {
      this.logger.error(`[TesseractOcrProvider] PDF parse error: ${err.message}`);
      throw new BadRequestException(`Failed to parse PDF document: ${err.message}`);
    }
  }

  private async extractFromImage(buffer: Buffer): Promise<string> {
    let worker: any = null;
    try {
      worker = await createWorker('eng');
      const ret = await worker.recognize(buffer);
      await worker.terminate();
      return ret.data.text || '';
    } catch (err: any) {
      if (worker) await worker.terminate().catch(() => null);
      this.logger.error(`[TesseractOcrProvider] OCR recognition error: ${err.message}`);
      throw new BadRequestException(`OCR engine failed to recognize document: ${err.message}`);
    }
  }

  private parseReceiptEntities(rawText: string, originalFilename: string): ExtractedReceiptData {
    const lines = rawText
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    const fullText = lines.join(' ');

    const { merchant, confidence: merchantConf } = this.extractMerchant(lines);
    const { date, confidence: dateConf } = this.extractDate(fullText);
    const { amount, currency, confidence: amountConf } = this.extractTotalAmount(lines, fullText);
    const { taxAmount, gstNumber, confidence: taxConf } = this.extractTaxAndGst(lines, fullText, amount);
    const category = this.inferCategory(merchant, fullText);
    const referenceNumber = this.extractReferenceNumber(fullText, originalFilename);
    const lineItems = this.extractLineItems(lines, amount, taxAmount);
    const businessPurpose = `Business expense for ${merchant || 'vendor'} (${category}). Verified via OCR document scan.`;
    const title = merchant ? `${merchant} - ${category}` : `Expense Claim: ${category}`;

    const overallConfidence = parseFloat(
      ((merchantConf + dateConf + amountConf + taxConf) / 4).toFixed(2)
    );

    return {
      title,
      merchant,
      amount,
      currency,
      date,
      category,
      taxAmount,
      gstNumber,
      referenceNumber,
      businessPurpose,
      lineItems,
      confidence: {
        merchant: merchantConf,
        amount: amountConf,
        date: dateConf,
        taxAmount: taxConf,
        overall: overallConfidence,
      },
      rawText: rawText.slice(0, 1000),
    };
  }

  private extractMerchant(lines: string[]): { merchant: string; confidence: number } {
    const ignoreKeywords = [
      'tax invoice',
      'invoice',
      'receipt',
      'bill',
      'payment receipt',
      'customer copy',
      'original',
      'cash memo',
      'welcome',
      'gstin',
      'tel:',
      'phone:',
      'date:',
      'time:',
      'order #',
      'table #',
    ];

    for (let i = 0; i < Math.min(lines.length, 6); i++) {
      const line = lines[i];
      const lower = line.toLowerCase();
      const isIgnored = ignoreKeywords.some((kw) => lower.startsWith(kw) || lower === kw);
      if (!isIgnored && line.length >= 3 && line.length <= 50 && !/^\d+$/.test(line)) {
        const cleanName = line.replace(/^[^\w]+|[^\w]+$/g, '').trim();
        if (cleanName.length > 2) {
          return { merchant: cleanName, confidence: 0.92 };
        }
      }
    }
    return { merchant: 'General Merchant', confidence: 0.5 };
  }

  private extractDate(text: string): { date: string; confidence: number } {
    const today = new Date().toISOString().split('T')[0];

    const isoMatch = text.match(/\b(202\d)[-/](0[1-9]|1[0-2])[-/](0[1-9]|[12]\d|3[01])\b/);
    if (isoMatch) {
      return { date: `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`, confidence: 0.98 };
    }

    const ddmmyyyyMatch = text.match(/\b(0[1-9]|[12]\d|3[01])[-/.](0[1-9]|1[0-2])[-/.](202\d)\b/);
    if (ddmmyyyyMatch) {
      return { date: `${ddmmyyyyMatch[3]}-${ddmmyyyyMatch[2]}-${ddmmyyyyMatch[1]}`, confidence: 0.95 };
    }

    const monthNames: Record<string, string> = {
      jan: '01',
      feb: '02',
      mar: '03',
      apr: '04',
      may: '05',
      jun: '06',
      jul: '07',
      aug: '08',
      sep: '09',
      oct: '10',
      nov: '11',
      dec: '12',
    };

    const monthMatch = text.match(
      /\b(0?[1-9]|[12]\d|3[01])[- ]?(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*[- ,]?(202\d)\b/i
    );
    if (monthMatch) {
      const day = monthMatch[1].padStart(2, '0');
      const month = monthNames[monthMatch[2].toLowerCase().slice(0, 3)];
      const year = monthMatch[3];
      return { date: `${year}-${month}-${day}`, confidence: 0.95 };
    }

    return { date: today, confidence: 0.6 };
  }

  private extractTotalAmount(
    lines: string[],
    fullText: string
  ): { amount: number; currency: string; confidence: number } {
    let detectedCurrency = 'USD';
    if (fullText.includes('₹') || fullText.includes('INR') || fullText.includes('Rs.') || fullText.includes('GSTIN')) {
      detectedCurrency = 'INR';
    } else if (fullText.includes('€') || fullText.includes('EUR')) {
      detectedCurrency = 'EUR';
    } else if (fullText.includes('£') || fullText.includes('GBP')) {
      detectedCurrency = 'GBP';
    }

    const totalKeywords = [
      'grand total',
      'total amount',
      'net amount',
      'amount due',
      'total paid',
      'amount payable',
      'total',
      'balance due',
    ];

    for (const line of lines) {
      const lower = line.toLowerCase();
      for (const kw of totalKeywords) {
        if (lower.includes(kw)) {
          const numMatch = line.match(/(?:[$₹€£A-Z]{0,3})\s*([\d,]+\.\d{2})/i) || line.match(/([\d,]+\.\d{2})/);
          if (numMatch) {
            const rawNum = numMatch[1].replace(/,/g, '');
            const parsed = parseFloat(rawNum);
            if (!isNaN(parsed) && parsed > 0) {
              return { amount: parsed, currency: detectedCurrency, confidence: 0.96 };
            }
          }
        }
      }
    }

    const allDecimals = fullText.match(/\b\d{1,6}\.\d{2}\b/g);
    if (allDecimals && allDecimals.length > 0) {
      const nums = allDecimals.map((n) => parseFloat(n)).filter((n) => !isNaN(n) && n > 0 && n < 1000000);
      if (nums.length > 0) {
        const maxAmount = Math.max(...nums);
        return { amount: maxAmount, currency: detectedCurrency, confidence: 0.75 };
      }
    }

    return { amount: 0.0, currency: detectedCurrency, confidence: 0.3 };
  }

  private extractTaxAndGst(
    lines: string[],
    fullText: string,
    totalAmount: number
  ): { taxAmount: number; gstNumber: string; confidence: number } {
    let gstNumber = '';
    let taxAmount = 0.0;
    let confidence = 0.7;

    const gstMatch = fullText.match(/\b\d{2}[A-Z]{5}\d{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}\b/);
    if (gstMatch) {
      gstNumber = gstMatch[0];
      confidence = 0.95;
    }

    const taxKeywords = ['tax amount', 'cgst', 'sgst', 'igst', 'total tax', 'vat amount', 'sales tax', 'tax'];
    for (const line of lines) {
      const lower = line.toLowerCase();
      for (const kw of taxKeywords) {
        if (lower.includes(kw) && !lower.includes('tax invoice')) {
          const numMatch = line.match(/([\d,]+\.\d{2})/);
          if (numMatch) {
            const parsed = parseFloat(numMatch[1].replace(/,/g, ''));
            if (!isNaN(parsed) && parsed > 0 && parsed < totalAmount) {
              taxAmount = parsed;
              confidence = 0.92;
              break;
            }
          }
        }
      }
      if (taxAmount > 0) break;
    }

    return { taxAmount, gstNumber, confidence };
  }

  private inferCategory(merchant: string, fullText: string): string {
    const text = `${merchant} ${fullText}`.toLowerCase();

    if (/aws|amazon web services|azure|google cloud|digitalocean|cloudflare|hosting|cloud|server|ec2|s3/i.test(text)) {
      return 'Cloud Services';
    }
    if (/github|slack|zoom|figma|jetbrains|adobe|jira|atlassian|notion|saas|subscription|software|openai/i.test(text)) {
      return 'Software Subscriptions';
    }
    if (/uber|lyft|ola|grab|taxi|cab|ride|auto|transit|toll/i.test(text)) {
      return 'Taxi';
    }
    if (/airline|flight|indigo|air india|emirates|delta|airway|train|irctc|railway|boarding/i.test(text)) {
      return 'Travel';
    }
    if (/hotel|inn|resort|marriott|hyatt|hilton|radisson|stay|lodging|room/i.test(text)) {
      return 'Hotel & Lodging';
    }
    if (/restaurant|cafe|coffee|starbucks|mcdonald|food|dining|lunch|dinner|breakfast|swiggy|zomato|bistro|bar/i.test(text)) {
      return 'Meals';
    }
    if (/shell|bp|petro|fuel|gas|petrol|diesel|fueling|chevron|exxon/i.test(text)) {
      return 'Fuel & Mileage';
    }
    if (/staples|office|stationery|paper|desk|printer|cartridge|hardware|supplies/i.test(text)) {
      return 'Office Supplies';
    }
    if (/client|entertainment|movie|cinema|tickets|event/i.test(text)) {
      return 'Client Entertainment';
    }

    return 'Other';
  }

  private extractReferenceNumber(fullText: string, originalFilename: string): string {
    const invMatch = fullText.match(/(?:Invoice|Receipt|Bill|Order|Ref|INV)[#:\s-]*([A-Za-z0-9-_/]{4,20})/i);
    if (invMatch && invMatch[1]) {
      return invMatch[1].trim();
    }
    return `OCR-${Date.now().toString().slice(-6)}`;
  }

  private extractLineItems(
    lines: string[],
    totalAmount: number,
    taxAmount: number
  ): Array<{ id: string; description: string; amount: number; taxAmount: number }> {
    const items: Array<{ id: string; description: string; amount: number; taxAmount: number }> = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (/total|subtotal|balance|tax invoice|amount due|thank you/i.test(line)) {
        continue;
      }

      const match = line.match(/^([A-Za-z0-9\s,&.-]{3,40})\s+([$₹€£A-Z]{0,3})\s*([\d,]+\.\d{2})$/);
      if (match) {
        const desc = match[1].trim();
        const price = parseFloat(match[3].replace(/,/g, ''));
        if (desc.length > 2 && !isNaN(price) && price > 0 && price <= totalAmount) {
          items.push({
            id: `li_${items.length + 1}`,
            description: desc,
            amount: price,
            taxAmount: 0.0,
          });
        }
      }
    }

    if (items.length === 0) {
      items.push({
        id: 'li_1',
        description: 'Document Receipt Item',
        amount: totalAmount,
        taxAmount: taxAmount,
      });
    }

    return items;
  }

  async checkHealth(): Promise<OcrProviderHealth> {
    return {
      provider: 'Tesseract.js WASM Engine & PDF Stream Parser',
      status: 'CONFIGURED',
      mode: 'LOCAL_WASM',
      healthy: true,
    };
  }
}
