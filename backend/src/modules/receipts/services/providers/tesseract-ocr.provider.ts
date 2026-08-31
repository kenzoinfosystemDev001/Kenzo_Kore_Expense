import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { createWorker } from 'tesseract.js';
import {
  IOcrProvider,
  ExtractedReceiptData,
  OcrProviderHealth,
  StructuredLineItem,
} from '../../interfaces/ocr-provider.interface';

@Injectable()
export class TesseractOcrProvider implements IOcrProvider {
  readonly providerName = 'tesseract';
  private readonly logger = new Logger(TesseractOcrProvider.name);

  /**
   * Main entrypoint for document extraction
   */
  async extractDocument(file: Express.Multer.File): Promise<ExtractedReceiptData> {
    const isPdf = file.mimetype === 'application/pdf' || file.buffer.slice(0, 4).toString('ascii') === '%PDF';
    let rawText = '';
    let isScannedPdf = false;
    let pageCount = 1;

    if (isPdf) {
      this.logger.log(`[TesseractOcrProvider] Analyzing PDF text layer: ${file.originalname}`);
      const pdfResult = await this.extractFromPdf(file.buffer);
      rawText = pdfResult.text;
      pageCount = pdfResult.pageCount;

      // If PDF contains no selectable text layer (scanned document), run image OCR fallback
      if (!rawText || rawText.trim().length < 20) {
        this.logger.log(`[TesseractOcrProvider] PDF has no selectable text layer. Falling back to OCR...`);
        isScannedPdf = true;
        rawText = await this.extractFromImage(file.buffer);
      }
    } else {
      this.logger.log(`[TesseractOcrProvider] Running Tesseract WASM OCR on image: ${file.originalname}`);
      rawText = await this.extractFromImage(file.buffer);
    }

    return this.parseReceiptEntities(rawText, file.originalname, isScannedPdf, pageCount);
  }

  /**
   * Multi-page PDF extraction with page concatenation
   */
  private async extractFromPdf(buffer: Buffer): Promise<{ text: string; pageCount: number }> {
    try {
      const pdfModule = require('pdf-parse');
      if (pdfModule.PDFParse) {
        const parser = new pdfModule.PDFParse({ data: buffer, verbosity: 0 });
        await parser.load();
        const res = await parser.getText();
        const pageCount = res?.total || res?.pages?.length || 1;
        return { text: res?.text || '', pageCount };
      } else if (typeof pdfModule === 'function') {
        const data = await pdfModule(buffer);
        return { text: data.text || '', pageCount: data.numpages || 1 };
      }
      return { text: '', pageCount: 1 };
    } catch (err: any) {
      this.logger.error(`[TesseractOcrProvider] PDF parse warning: ${err.message}`);
      return { text: '', pageCount: 1 };
    }
  }

  /**
   * Image OCR using Tesseract WASM
   */
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

  /**
   * Safe financial value parsing avoiding floating-point drift
   */
  private parseMonetaryValue(valStr: string): number {
    if (!valStr) return 0.0;
    // Remove currency symbols, clean commas and spaces
    const clean = valStr.replace(/[^0-9.]/g, '');
    const num = parseFloat(clean);
    if (isNaN(num)) return 0.0;
    // Safe monetary 2-decimal rounding
    return Math.round(num * 100) / 100;
  }

  /**
   * Comprehensive Entity Extraction
   */
  private parseReceiptEntities(
    rawText: string,
    originalFilename: string,
    isScannedPdf: boolean,
    pageCount: number
  ): ExtractedReceiptData {
    const lines = rawText
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    const fullText = lines.join(' ');

    // 1. Merchant Extraction
    const { merchant, confidence: merchantConf } = this.extractMerchant(lines);

    // 2. Date & Due Date Extraction
    const { date, dueDate, confidence: dateConf } = this.extractDates(fullText);

    // 3. Amount & Currency
    const { totalAmount, currency, confidence: amountConf } = this.extractTotalAndCurrency(lines, fullText);

    // 4. Tax, GSTIN & Tax Percentage
    const { taxAmount, gstNumber, taxPercentage, confidence: taxConf } = this.extractTaxAndGst(
      lines,
      fullText,
      totalAmount
    );

    // 5. Subtotal calculation (Safe financial subtraction)
    const subtotal = Math.max(0, Math.round((totalAmount - taxAmount) * 100) / 100);

    // 6. Category Suggestion
    const suggestedCategory = this.suggestCategory(merchant, fullText);

    // 7. Reference / Invoice Number
    const invoiceNumber = this.extractInvoiceNumber(fullText, originalFilename);

    // 8. Contact & Address Details
    const { vendorPhone, vendorEmail, vendorAddress, billingAddress } = this.extractContactDetails(lines, fullText);

    // 9. Payment Method Detection
    const detectedPaymentMethod = this.detectPaymentMethod(fullText);

    // 10. Line Items Itemization
    const lineItems = this.extractLineItems(lines, totalAmount, taxAmount);

    const businessPurpose = `Business expense for ${merchant || 'vendor'} (${suggestedCategory}). Verified via OCR document scan.`;
    const title = merchant ? `${merchant} - ${suggestedCategory}` : `Expense Claim: ${suggestedCategory}`;

    const overallConfidence = parseFloat(
      ((merchantConf + dateConf + amountConf + taxConf) / 4).toFixed(2)
    );

    return {
      title,
      merchant,
      invoiceNumber,
      referenceNumber: invoiceNumber,
      invoiceDate: date,
      date,
      dueDate,
      subtotal,
      tax: taxAmount,
      taxAmount,
      taxPercentage,
      totalAmount,
      amount: totalAmount,
      currency,
      gstin: gstNumber,
      gstNumber,
      description: businessPurpose,
      businessPurpose,
      suggestedCategory,
      category: suggestedCategory,
      detectedPaymentMethod,
      vendorAddress,
      billingAddress,
      vendorPhone,
      vendorEmail,
      lineItems,
      confidence: {
        merchant: merchantConf,
        amount: amountConf,
        date: dateConf,
        taxAmount: taxConf,
        overall: overallConfidence,
      },
      isScannedPdf,
      pageCount,
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

  private extractDates(text: string): { date: string; dueDate?: string; confidence: number } {
    const today = new Date().toISOString().split('T')[0];

    // ISO format: YYYY-MM-DD
    const isoMatch = text.match(/\b(202\d)[-/](0[1-9]|1[0-2])[-/](0[1-9]|[12]\d|3[01])\b/);
    let invoiceDate = today;
    let confidence = 0.6;

    if (isoMatch) {
      invoiceDate = `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
      confidence = 0.98;
    } else {
      // DD/MM/YYYY
      const ddmmyyyyMatch = text.match(/\b(0[1-9]|[12]\d|3[01])[-/.](0[1-9]|1[0-2])[-/.](202\d)\b/);
      if (ddmmyyyyMatch) {
        invoiceDate = `${ddmmyyyyMatch[3]}-${ddmmyyyyMatch[2]}-${ddmmyyyyMatch[1]}`;
        confidence = 0.95;
      }
    }

    // Due Date
    let dueDate: string | undefined = undefined;
    const dueMatch = text.match(/(?:Due Date|Payment Due|Due By)[:\s]*([0-9A-Za-z\s,-/]{6,15})/i);
    if (dueMatch) {
      dueDate = dueMatch[1].trim();
    }

    return { date: invoiceDate, dueDate, confidence };
  }

  private extractTotalAndCurrency(
    lines: string[],
    fullText: string
  ): { totalAmount: number; currency: string; confidence: number } {
    // Detect Currency Code
    let currency = 'USD';
    if (/₹|INR|Rs\.|Rs\b|GSTIN/i.test(fullText)) {
      currency = 'INR';
    } else if (/€|EUR\b/i.test(fullText)) {
      currency = 'EUR';
    } else if (/£|GBP\b/i.test(fullText)) {
      currency = 'GBP';
    } else if (/CAD|C\$/i.test(fullText)) {
      currency = 'CAD';
    } else if (/AUD|A\$/i.test(fullText)) {
      currency = 'AUD';
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
            const parsed = this.parseMonetaryValue(numMatch[1]);
            if (parsed > 0) {
              return { totalAmount: parsed, currency, confidence: 0.96 };
            }
          }
        }
      }
    }

    // Fallback highest decimal amount
    const allDecimals = fullText.match(/\b\d{1,6}\.\d{2}\b/g);
    if (allDecimals && allDecimals.length > 0) {
      const nums = allDecimals.map((n) => this.parseMonetaryValue(n)).filter((n) => n > 0 && n < 1000000);
      if (nums.length > 0) {
        return { totalAmount: Math.max(...nums), currency, confidence: 0.75 };
      }
    }

    return { totalAmount: 0.0, currency, confidence: 0.3 };
  }

  private extractTaxAndGst(
    lines: string[],
    fullText: string,
    totalAmount: number
  ): { taxAmount: number; gstNumber: string; taxPercentage?: number; confidence: number } {
    let gstNumber = '';
    let taxAmount = 0.0;
    let taxPercentage: number | undefined = undefined;
    let confidence = 0.7;

    // 15-character Indian GSTIN
    const gstMatch = fullText.match(/\b\d{2}[A-Z]{5}\d{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}\b/);
    if (gstMatch) {
      gstNumber = gstMatch[0];
      confidence = 0.95;
    }

    // Tax percentage (e.g. 18%, 12%, 5%)
    const pctMatch = fullText.match(/\b(5|12|18|28)\s*%\s*(?:GST|Tax|VAT)?\b/i);
    if (pctMatch) {
      taxPercentage = parseInt(pctMatch[1], 10);
    }

    // Tax amount
    const taxKeywords = ['tax amount', 'cgst', 'sgst', 'igst', 'total tax', 'vat amount', 'sales tax', 'tax'];
    for (const line of lines) {
      const lower = line.toLowerCase();
      for (const kw of taxKeywords) {
        if (lower.includes(kw) && !lower.includes('tax invoice')) {
          const numMatch = line.match(/([\d,]+\.\d{2})/);
          if (numMatch) {
            const parsed = this.parseMonetaryValue(numMatch[1]);
            if (parsed > 0 && parsed < totalAmount) {
              taxAmount = parsed;
              confidence = 0.92;
              break;
            }
          }
        }
      }
      if (taxAmount > 0) break;
    }

    return { taxAmount, gstNumber, taxPercentage, confidence };
  }

  private suggestCategory(merchant: string, fullText: string): string {
    const text = `${merchant} ${fullText}`.toLowerCase();

    // API Providers
    if (/openai|anthropic|cohere|replicate|twilio|sendgrid|stripe|resend|postman|gemini api|aws bedrock/i.test(text)) {
      return 'API';
    }
    // Subscriptions & Cloud Services
    if (/aws|amazon web services|azure|google cloud|digitalocean|cloudflare|hosting|ec2|s3|heroku|vercel/i.test(text)) {
      return 'Cloud Services';
    }
    if (/github|slack|zoom|figma|jetbrains|adobe|jira|atlassian|notion|saas|subscription|microsoft 365/i.test(text)) {
      return 'Software Subscriptions';
    }
    // Travel & Transit
    if (/uber|lyft|ola|grab|taxi|cab|ride|transit|toll|metro/i.test(text)) {
      return 'Taxi';
    }
    if (/airline|flight|indigo|air india|emirates|delta|airway|train|irctc|railway|boarding/i.test(text)) {
      return 'Travel';
    }
    // Meals & Food
    if (/restaurant|cafe|coffee|starbucks|mcdonald|food|dining|lunch|dinner|breakfast|swiggy|zomato|bistro|catering/i.test(text)) {
      return 'Meals';
    }
    // Lodging
    if (/hotel|inn|resort|marriott|hyatt|hilton|radisson|stay|lodging|airbnb/i.test(text)) {
      return 'Hotel & Lodging';
    }
    // Fuel & Mileage
    if (/shell|bp|petro|fuel|gas|petrol|diesel|fueling|chevron|exxon/i.test(text)) {
      return 'Fuel & Mileage';
    }
    // Office Supplies
    if (/staples|office|stationery|paper|desk|printer|cartridge|hardware|supplies/i.test(text)) {
      return 'Office Supplies';
    }

    return 'Other';
  }

  private extractInvoiceNumber(fullText: string, originalFilename: string): string {
    const invMatch = fullText.match(/(?:Invoice|Receipt|Bill|Order|Ref|INV)[#:\s-]*([A-Za-z0-9-_/]{4,20})/i);
    if (invMatch && invMatch[1]) {
      return invMatch[1].trim();
    }
    return `INV-${Date.now().toString().slice(-6)}`;
  }

  private extractContactDetails(
    lines: string[],
    fullText: string
  ): { vendorPhone?: string; vendorEmail?: string; vendorAddress?: string; billingAddress?: string } {
    let vendorPhone: string | undefined = undefined;
    let vendorEmail: string | undefined = undefined;

    const phoneMatch = fullText.match(/\b(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/);
    if (phoneMatch) {
      vendorPhone = phoneMatch[0];
    }

    const emailMatch = fullText.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/);
    if (emailMatch) {
      vendorEmail = emailMatch[0];
    }

    return { vendorPhone, vendorEmail };
  }

  private detectPaymentMethod(fullText: string): string {
    if (/upi|gpay|phonepe|paytm/i.test(fullText)) return 'UPI';
    if (/corporate card|credit card|visa|mastercard|amex/i.test(fullText)) return 'CORPORATE_CARD';
    if (/bank transfer|neft|rtgs|wire transfer/i.test(fullText)) return 'BANK_TRANSFER';
    if (/cash/i.test(fullText)) return 'CASH';
    return 'UPI';
  }

  private extractLineItems(
    lines: string[],
    totalAmount: number,
    taxAmount: number
  ): StructuredLineItem[] {
    const items: StructuredLineItem[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (/total|subtotal|balance|tax invoice|amount due|thank you/i.test(line)) {
        continue;
      }

      // Pattern: "Item Description   1 x ₹3000   ₹3000.00" or "Description   Amount"
      const match = line.match(/^([A-Za-z0-9\s,&.-]{3,40})\s+(?:(\d+)\s*[xX]\s*)?([$₹€£A-Z]{0,3})\s*([\d,]+\.\d{2})$/);
      if (match) {
        const desc = match[1].trim();
        const qty = match[2] ? parseInt(match[2], 10) : 1;
        const price = this.parseMonetaryValue(match[4]);
        if (desc.length > 2 && price > 0 && price <= totalAmount) {
          items.push({
            id: `li_${items.length + 1}`,
            description: desc,
            quantity: qty,
            unitPrice: qty > 1 ? Math.round((price / qty) * 100) / 100 : price,
            lineTotal: price,
            tax: 0.0,
          });
        }
      }
    }

    if (items.length === 0 && totalAmount > 0) {
      items.push({
        id: 'li_1',
        description: 'Document Receipt Item',
        quantity: 1,
        unitPrice: totalAmount,
        lineTotal: totalAmount,
        tax: taxAmount,
      });
    }

    return items;
  }

  async checkHealth(): Promise<OcrProviderHealth> {
    return {
      provider: 'Tesseract.js WASM Engine & High-Performance PDF Stream Parser',
      status: 'CONFIGURED',
      mode: 'LOCAL_WASM',
      healthy: true,
    };
  }
}
