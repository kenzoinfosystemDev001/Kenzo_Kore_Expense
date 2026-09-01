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
   * Main entrypoint for document extraction (PDF & Images)
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

      // If PDF contains no selectable text layer (scanned document), log and fallback
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
    const clean = valStr.replace(/[^0-9.]/g, '');
    const num = parseFloat(clean);
    if (isNaN(num)) return 0.0;
    return Math.round(num * 100) / 100;
  }

  /**
   * Comprehensive Entity Extraction for PDFs and Images
   */
  private parseReceiptEntities(
    rawText: string,
    originalFilename: string,
    isScannedPdf: boolean,
    pageCount: number
  ): ExtractedReceiptData {
    const rawLines = rawText
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    const fullText = rawLines.join('\n');

    // 1. Mobile Status Bar & Navigation Header Filtering
    const isIgnoredLine = (line: string): boolean => {
      const lower = line.toLowerCase().trim();
      if (/^\d{1,2}:\d{2}/.test(line)) return true;
      if (/^[«<]\s*(?:details|back|home|menu)/i.test(line) || /^details$/i.test(line)) return true;
      if (/^[\|\sO<@\[\]~+]+$/.test(line)) return true;

      const genericHeaderKeywords = [
        'need help?',
        "we're a tap away",
        'send invoice via email',
        'address details',
        'completed',
        'tax invoice',
        'invoice',
        'bill of supply',
        'tax invoice / bill of supply',
        'original for recipient',
        'duplicate for supplier',
        'triplicate for transporter',
        'cash memo',
        'cash receipt',
        'receipt',
        'statement',
        'e-ticket',
        'electronic ticket receipt',
        'guest folio',
        'hotel folio',
        'customer copy',
      ];

      return genericHeaderKeywords.some((kw) => lower === kw || lower.startsWith(kw));
    };

    const cleanLines = rawLines.filter((l) => !isIgnoredLine(l));

    // 2. Merchant / Vendor Extraction
    const { merchant, confidence: merchantConf } = this.extractMerchant(cleanLines, fullText);

    // 3. Date & Due Date Extraction
    const { date, dueDate, confidence: dateConf } = this.extractDates(fullText);

    // 4. Amount & Currency Extraction
    const { totalAmount, currency, confidence: amountConf } = this.extractTotalAndCurrency(rawLines, fullText);

    // 5. Tax, GSTIN & Tax Percentage
    const { taxAmount, gstNumber, taxPercentage, confidence: taxConf } = this.extractTaxAndGst(
      rawLines,
      fullText,
      totalAmount
    );

    // 6. Subtotal calculation
    const subtotal = Math.max(0, Math.round((totalAmount - taxAmount) * 100) / 100);

    // 7. Category Suggestion
    const suggestedCategory = this.suggestCategory(merchant, fullText);

    // 8. Reference / Invoice / Ride Number
    const invoiceNumber = this.extractInvoiceNumber(fullText, originalFilename);

    // 9. Contact & Address Details
    const { vendorPhone, vendorEmail, vendorAddress, billingAddress, location } = this.extractLocationAndContact(
      cleanLines,
      fullText
    );

    // 10. Payment Method Detection
    const detectedPaymentMethod = this.detectPaymentMethod(fullText);

    // 11. Structured Line Items Itemization
    const lineItems = this.extractLineItems(cleanLines, fullText, totalAmount, taxAmount);

    const businessPurpose = location
      ? `Corporate ${suggestedCategory.toLowerCase()} in ${location}. Verified via document.`
      : `Business expense for ${merchant || 'vendor'} (${suggestedCategory}). Verified via document scan.`;

    const title = merchant
      ? location
        ? `${merchant} - ${location.split(',')[0].trim()}`
        : `${merchant} - ${suggestedCategory}`
      : `Expense Claim: ${suggestedCategory}`;

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
      vendorAddress: location || vendorAddress,
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

  /**
   * High-Precision Merchant Extraction (PDF & Image Invoices)
   */
  private extractMerchant(cleanLines: string[], fullText: string): { merchant: string; confidence: number } {
    // Strategy 1: Explicit Vendor Labels in PDF invoices
    const labeledVendorMatch = fullText.match(
      /(?:Sold\s+By|Billed\s+By|Vendor|Supplier|Seller|Merchant|Company|Service\s+Provider)[:\s]+([^\n\r,]{3,60})/i
    );
    if (labeledVendorMatch) {
      const candidate = labeledVendorMatch[1].replace(/^[^\w]+|[^\w]+$/g, '').trim();
      if (
        candidate.length > 2 &&
        !/^(?:GSTIN|Address|Invoice|Date|Sector|Noida|Delhi|Block|Customer|Client|Bill\s+To)/i.test(candidate)
      ) {
        return { merchant: candidate, confidence: 0.98 };
      }
    }

    // Strategy 2: Clean header lines before metadata
    for (const line of cleanLines) {
      const lower = line.toLowerCase();
      if (
        line.length >= 3 &&
        line.length <= 60 &&
        !/^\d+$/.test(line) &&
        !line.includes('mins') &&
        !line.includes('kms') &&
        !lower.includes('total fare') &&
        !lower.includes('ride id') &&
        !lower.includes('bill to') &&
        !lower.includes('ship to') &&
        !lower.includes('customer') &&
        !lower.includes('page ')
      ) {
        const cleanName = line.replace(/^[«<+~©\s*]+|[«<+~©\s*]+$/g, '').trim();
        if (cleanName.length > 2) {
          return { merchant: cleanName, confidence: 0.95 };
        }
      }
    }

    return { merchant: 'General Merchant', confidence: 0.5 };
  }

  /**
   * Date Extraction (ISO, DD/MM/YYYY, Month Names)
   */
  private extractDates(text: string): { date: string; dueDate?: string; confidence: number } {
    const today = new Date().toISOString().split('T')[0];
    const monthNames: Record<string, string> = {
      jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
      jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12',
    };

    // Strategy 1: Explicit Labeled Invoice Date (e.g. "Invoice Date: 18/08/2026" or "Date: 30 Jul 2026")
    const labeledDateMatch = text.match(
      /(?:Invoice\s+Date|Date\s+of\s+Issue|Billing\s+Date|Transaction\s+Date|Date)[:\s]*(\d{1,2}[-/.](?:[0-9]{1,2}|[A-Za-z]{3})[-/.](?:202\d|\d{2}))/i
    );
    if (labeledDateMatch) {
      const rawDate = labeledDateMatch[1];
      const parts = rawDate.split(/[-/.]/);
      if (parts.length === 3) {
        const p1 = parts[0].padStart(2, '0');
        const p2 = isNaN(Number(parts[1]))
          ? monthNames[parts[1].toLowerCase().slice(0, 3)] || '01'
          : parts[1].padStart(2, '0');
        const p3 = parts[2].length === 2 ? `20${parts[2]}` : parts[2];
        if (parseInt(p3, 10) >= 2000) {
          return { date: `${p3}-${p2}-${p1}`, confidence: 0.98 };
        }
      }
    }

    // Strategy 2: Month Name Regex ("30 Jul 2026", "18-Aug-2026")
    const monthMatch = text.match(
      /\b(0?[1-9]|[12]\d|3[01])\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(202\d)\b/i
    );
    if (monthMatch) {
      const day = monthMatch[1].padStart(2, '0');
      const month = monthNames[monthMatch[2].toLowerCase().slice(0, 3)];
      const year = monthMatch[3];
      return { date: `${year}-${month}-${day}`, confidence: 0.98 };
    }

    // Strategy 3: ISO Format (YYYY-MM-DD)
    const isoMatch = text.match(/\b(202\d)[-/](0[1-9]|1[0-2])[-/](0[1-9]|[12]\d|3[01])\b/);
    if (isoMatch) {
      return { date: `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`, confidence: 0.98 };
    }

    // Strategy 4: Standard DD/MM/YYYY
    const ddmmyyyyMatch = text.match(/\b(0[1-9]|[12]\d|3[01])[-/.](0[1-9]|1[0-2])[-/.](202\d)\b/);
    if (ddmmyyyyMatch) {
      return { date: `${ddmmyyyyMatch[3]}-${ddmmyyyyMatch[2]}-${ddmmyyyyMatch[1]}`, confidence: 0.95 };
    }

    return { date: today, confidence: 0.6 };
  }

  /**
   * High-Precision Total Amount & Currency Extraction
   */
  private extractTotalAndCurrency(
    lines: string[],
    fullText: string
  ): { totalAmount: number; currency: string; confidence: number } {
    let currency = 'USD';
    if (/₹|INR|Rs\.|Rs\b|GSTIN|Noida|Bengaluru|Delhi|Mumbai|Pune|Gurgaon/i.test(fullText)) {
      currency = 'INR';
    } else if (/€|EUR\b/i.test(fullText)) {
      currency = 'EUR';
    } else if (/£|GBP\b/i.test(fullText)) {
      currency = 'GBP';
    }

    // Priority 1: Strict Grand Total / Invoice Total / Net Payable keywords in PDF & Invoices
    const strictTotalMatch = fullText.match(
      /(?:Grand\s+Total|Invoice\s+Total|Total\s+Amount|Total\s+Payable|Net\s+Payable|Net\s+Amount|Total\s+Fare|Total\s+INR|Total\s+USD|Total\s+EUR|Total\s+GBP)[:\s]*[%*₹$€£z3]?\s*([\d,]+\.?\d*)/i
    );
    if (strictTotalMatch) {
      const parsed = parseFloat(strictTotalMatch[1].replace(/,/g, ''));
      if (!isNaN(parsed) && parsed > 0) {
        return { totalAmount: Math.round(parsed * 100) / 100, currency, confidence: 0.98 };
      }
    }

    // Priority 2: Generic "Total" lines (excluding "Sub Total", "Tax", "Words", "Balance Due")
    for (const line of lines) {
      const lower = line.toLowerCase();
      if (
        (lower.includes('total') || lower.includes('amount')) &&
        !lower.includes('sub') &&
        !lower.includes('tax') &&
        !lower.includes('words') &&
        !lower.includes('balance due: 0')
      ) {
        const numMatch = line.match(/(?:[$₹€£A-Z%*z3]{0,3})\s*([\d,]+\.\d{2})/i);
        if (numMatch) {
          const parsed = this.parseMonetaryValue(numMatch[1]);
          if (parsed > 0) {
            return { totalAmount: parsed, currency, confidence: 0.96 };
          }
        }
      }
    }

    // Priority 3: Large Hero Number at top
    const heroMatch = fullText.match(/(?:Completed|Bike|Ride|Invoice)\s*\n+\s*[₹%*2]?\s*(\d{2,5})\b/i);
    if (heroMatch) {
      const parsed = parseFloat(heroMatch[1]);
      if (parsed > 0 && parsed < 100000) {
        return { totalAmount: parsed, currency, confidence: 0.90 };
      }
    }

    return { totalAmount: 0.0, currency, confidence: 0.3 };
  }

  /**
   * Tax Amount, GSTIN & Percentage Extraction
   */
  private extractTaxAndGst(
    lines: string[],
    fullText: string,
    totalAmount: number
  ): { taxAmount: number; gstNumber: string; taxPercentage?: number; confidence: number } {
    let gstNumber = '';
    let taxAmount = 0.0;
    let taxPercentage: number | undefined = undefined;
    let confidence = 0.7;

    // Prioritize Seller/Vendor GSTIN
    const sellerGstMatch =
      fullText.match(/(?:Seller\s+GSTIN|Vendor\s+GSTIN|Supplier\s+GSTIN|GSTIN)[:\s]*(\d{2}[A-Z]{5}\d{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1})/i) ||
      fullText.match(/\b\d{2}[A-Z]{5}\d{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}\b/);
    if (sellerGstMatch) {
      gstNumber = sellerGstMatch[1] || sellerGstMatch[0];
      confidence = 0.95;
    }

    // Tax percentage (e.g. 18%, 5%, 12%)
    const pctMatch = fullText.match(/\b(5|12|18|28)\s*%\s*(?:GST|Tax|VAT)?\b/i);
    if (pctMatch) {
      taxPercentage = parseInt(pctMatch[1], 10);
    }

    // Priority 1: Explicit Total GST / Total Tax
    const totalTaxMatch = fullText.match(
      /(?:Total\s+GST|Total\s+Tax|Tax\s+Amount|Total\s+VAT)[:\s]*[%*₹$€£z3]?\s*([\d,]+\.\d{2})/i
    );
    if (totalTaxMatch) {
      taxAmount = parseFloat(totalTaxMatch[1].replace(/,/g, ''));
      confidence = 0.95;
    } else {
      // Sum CGST + SGST if itemized
      const cgstMatch = fullText.match(/CGST[^\d]*?([\d,]+\.\d{2})/i);
      const sgstMatch = fullText.match(/SGST[^\d]*?([\d,]+\.\d{2})/i);
      if (cgstMatch && sgstMatch) {
        const sum = parseFloat(cgstMatch[1].replace(/,/g, '')) + parseFloat(sgstMatch[1].replace(/,/g, ''));
        taxAmount = Math.round(sum * 100) / 100;
        confidence = 0.92;
      }
    }

    return { taxAmount, gstNumber, taxPercentage, confidence };
  }

  /**
   * Suggest Category based on Vendor & Content
   */
  private suggestCategory(merchant: string, fullText: string): string {
    const text = `${merchant} ${fullText}`.toLowerCase();

    // 1. Travel & Airlines (Flights, Indigo, Delta, Air India, Emirates, Trains, IRCTC, MakeMyTrip)
    if (
      /airline|flight|indigo|air india|emirates|delta|airway|train|irctc|railway|boarding|makemytrip|cleartrip|goibibo|easemytrip|spicejet|vistara|akasa/i.test(
        text
      )
    ) {
      return 'Travel';
    }

    // 2. Meals & Dining (Swiggy, Zomato, Restaurants, Cafes, Food, Catering)
    if (
      /swiggy|zomato|bundl|restaurant|cafe|coffee|starbucks|mcdonald|food|dining|lunch|dinner|breakfast|bistro|catering|barbeque|domino|pizza/i.test(
        text
      )
    ) {
      return 'Meals';
    }

    // 3. Ride / Taxi (Bike Lite Ride, Auto, Cab, Uber, Rapido, Ola, Lyft)
    if (/bike|auto\s+ride|taxi|cab|uber|ola|rapido|transit|toll|metro|driver|fare/i.test(text)) {
      return 'Taxi';
    }

    // 4. Cloud & Subscriptions
    if (/aws|amazon web services|azure|google cloud|digitalocean|cloudflare|hosting|ec2|s3/i.test(text)) {
      return 'Cloud Services';
    }
    if (/github|slack|zoom|figma|jetbrains|adobe|jira|atlassian|notion|saas|subscription|openai/i.test(text)) {
      return 'Software Subscriptions';
    }
    if (/hotel|inn|resort|marriott|hyatt|hilton|radisson|stay|lodging|airbnb/i.test(text)) {
      return 'Hotel & Lodging';
    }

    return 'Other';
  }

  /**
   * Invoice / Reference Number Extraction
   */
  private extractInvoiceNumber(fullText: string, originalFilename: string): string {
    // 1. PNR / Airline / Hotel / Booking Reference
    const pnrMatch = fullText.match(
      /(?:Booking\s+Reference|PNR|Booking\s+ID|Ticket\s+No|Ticket\s+Number)[:\s/]*([A-Za-z0-9-_/]{4,25})/i
    );
    if (pnrMatch) {
      return pnrMatch[1].trim();
    }

    // 2. Specific match for Invoice / Bill / Ride ID
    const invNoMatch = fullText.match(
      /(?:Invoice\s+No(?:mber|\.|#)?|Bill\s+No(?:mber|\.|#)?|Order\s+No(?:mber|\.|#)?|Ride\s+ID|Ref\s+No(?:mber|\.|#)?|Transaction\s+ID)[:\s#]*([A-Za-z0-9-_/]{4,35})/i
    );
    if (invNoMatch) {
      return invNoMatch[1].trim();
    }

    // 3. Ride ID #RD17853975442578790
    const rideMatch = fullText.match(/#(RD\d{10,25})/i);
    if (rideMatch) {
      return rideMatch[1].trim();
    }

    return `INV-${Date.now().toString().slice(-6)}`;
  }

  /**
   * Location & Contact Details Extraction
   */
  private extractLocationAndContact(
    cleanLines: string[],
    fullText: string
  ): { vendorPhone?: string; vendorEmail?: string; vendorAddress?: string; billingAddress?: string; location?: string } {
    let vendorPhone: string | undefined = undefined;
    let vendorEmail: string | undefined = undefined;
    let location: string | undefined = undefined;

    // Detect Major Cities / Locations in addresses
    const locMatch = fullText.match(
      /(?:Noida|Bengaluru|Bangalore|Delhi|Mumbai|Gurugram|Gurgaon|Hyderabad|Chennai|Pune|Kolkata|Ahmedabad|Jaipur)(?:,\s*[A-Za-z\s]+)?(?:,\s*India)?/i
    );
    if (locMatch) {
      location = locMatch[0].replace(/\s+/g, ' ').trim();
    }

    const phoneMatch = fullText.match(/\b(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/);
    if (phoneMatch) {
      vendorPhone = phoneMatch[0];
    }

    const emailMatch = fullText.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/);
    if (emailMatch) {
      vendorEmail = emailMatch[0];
    }

    return { vendorPhone, vendorEmail, location };
  }

  /**
   * Payment Method Detection
   */
  private detectPaymentMethod(fullText: string): string {
    if (/upi|gpay|phonepe|paytm/i.test(fullText)) return 'UPI';
    if (/corporate card|credit card|visa|mastercard|amex/i.test(fullText)) return 'CORPORATE_CARD';
    if (/bank transfer|neft|rtgs|wire transfer/i.test(fullText)) return 'BANK_TRANSFER';
    if (/cash/i.test(fullText)) return 'CASH';
    return 'UPI';
  }

  /**
   * Structured Line Items Extraction (PDF Tables & Receipt Items)
   */
  private extractLineItems(
    cleanLines: string[],
    fullText: string,
    totalAmount: number,
    taxAmount: number
  ): StructuredLineItem[] {
    const items: StructuredLineItem[] = [];

    // Strategy 1: Ride Charge & Booking Fees (Mobile Receipts)
    const bookingFeeMatch = fullText.match(/(?:Booking Fees|Convenience Charges)[^\d]*?(\d+\.\d{2})/i);
    if (bookingFeeMatch) {
      const feeVal = parseFloat(bookingFeeMatch[1]);
      const mainVal = totalAmount > feeVal ? Math.round((totalAmount - feeVal) * 100) / 100 : 0;

      if (mainVal > 0) {
        items.push({
          id: 'li_1',
          description: 'Ride Charge',
          quantity: 1,
          unitPrice: mainVal,
          lineTotal: mainVal,
          tax: 0,
        });
      }

      items.push({
        id: `li_${items.length + 1}`,
        description: 'Booking Fees & Convenience Charges',
        quantity: 1,
        unitPrice: feeVal,
        lineTotal: feeVal,
        tax: 0,
      });

      return items;
    }

    // Strategy 2: PDF Table Rows (e.g. "Executive Lunch Meal Set 2 350.00 63.00 763.00")
    for (const line of cleanLines) {
      if (/total|subtotal|balance|tax invoice|amount due|thank you|description/i.test(line)) {
        continue;
      }

      const tableMatch = line.match(
        /^([A-Za-z0-9\s,&./()-]{3,50})\s+(\d+)\s+([\d,]+\.\d{2})\s+(?:([\d,]+\.\d{2})\s+)?([\d,]+\.\d{2})$/
      );
      if (tableMatch) {
        const desc = tableMatch[1].trim();
        const qty = parseInt(tableMatch[2], 10);
        const rate = parseFloat(tableMatch[3].replace(/,/g, ''));
        const lineTax = tableMatch[4] ? parseFloat(tableMatch[4].replace(/,/g, '')) : 0;
        const total = parseFloat(tableMatch[5].replace(/,/g, ''));

        if (desc.length > 2 && total > 0 && total <= totalAmount * 1.05) {
          items.push({
            id: `li_${items.length + 1}`,
            description: desc,
            quantity: qty,
            unitPrice: rate,
            tax: lineTax,
            lineTotal: total,
          });
        }
      }
    }

    if (items.length > 0) {
      return items;
    }

    // Strategy 3: Standard single item fallback
    if (totalAmount > 0) {
      items.push({
        id: 'li_1',
        description: 'Invoice Document Item',
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
