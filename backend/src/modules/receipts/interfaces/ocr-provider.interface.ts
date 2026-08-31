export interface StructuredLineItem {
  id: string;
  description: string;
  quantity?: number;
  unitPrice?: number;
  tax?: number;
  lineTotal: number;
}

export interface ExtractedReceiptData {
  title: string;
  merchant: string;
  invoiceNumber: string;
  referenceNumber: string;
  invoiceDate: string;
  date: string;
  dueDate?: string;
  subtotal: number;
  tax: number;
  taxAmount: number;
  taxPercentage?: number;
  totalAmount: number;
  amount: number;
  currency: string;
  gstin: string;
  gstNumber: string;
  description: string;
  businessPurpose: string;
  suggestedCategory: string;
  category: string;
  detectedPaymentMethod?: string;
  vendorAddress?: string;
  billingAddress?: string;
  vendorPhone?: string;
  vendorEmail?: string;
  lineItems: StructuredLineItem[];
  confidence: {
    merchant: number;
    amount: number;
    date: number;
    taxAmount: number;
    overall: number;
  };
  isScannedPdf?: boolean;
  pageCount?: number;
  rawText: string;
}

export interface OcrProviderHealth {
  provider: string;
  status: 'CONFIGURED' | 'NOT_CONFIGURED';
  mode: string;
  healthy: boolean;
}

export interface IOcrProvider {
  readonly providerName: string;
  extractDocument(file: Express.Multer.File): Promise<ExtractedReceiptData>;
  checkHealth(): Promise<OcrProviderHealth>;
}
