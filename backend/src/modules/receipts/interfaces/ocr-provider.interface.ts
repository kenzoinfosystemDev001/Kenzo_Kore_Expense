export interface ExtractedReceiptData {
  title: string;
  merchant: string;
  amount: number;
  currency: string;
  date: string;
  category: string;
  taxAmount: number;
  gstNumber: string;
  referenceNumber: string;
  businessPurpose: string;
  lineItems: Array<{
    id: string;
    description: string;
    amount: number;
    taxAmount: number;
  }>;
  confidence: {
    merchant: number;
    amount: number;
    date: number;
    taxAmount: number;
    overall: number;
  };
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
