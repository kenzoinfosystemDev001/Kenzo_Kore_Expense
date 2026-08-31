import React, { useState } from 'react';
import { useApp, API_BASE_URL } from '../AppContext';
import { ExpenseCategory, PaymentMethod } from '../types';
import {
  UploadCloud,
  FileCheck,
  Zap,
  Plus,
  Trash2,
  AlertTriangle,
  ArrowRight,
  TrendingDown,
  Sparkles,
  Camera,
  Video,
  X,
  RefreshCw,
  Check,
  Eye,
  FileText,
  ShieldCheck,
  ZoomIn
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface ExtractedOcrState {
  merchant: string;
  amount: number;
  currency: string;
  date: string;
  category: string;
  taxAmount: number;
  gstNumber: string;
  referenceNumber: string;
  businessPurpose: string;
  confidence: {
    merchant: number;
    amount: number;
    date: number;
    taxAmount: number;
    overall: number;
  };
  fileName: string;
}

export const CreateExpenseView: React.FC = () => {
  const { createExpense, setCurrentTab } = useApp();

  // Form states
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<ExpenseCategory>('Meals');
  const [amount, setAmount] = useState<number>(0);
  const [currency, setCurrency] = useState<string>('USD');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('UPI');
  const [merchant, setMerchant] = useState('');
  const [businessPurpose, setBusinessPurpose] = useState('');
  const [billable, setBillable] = useState(false);
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [receiptUrl, setReceiptUrl] = useState<string | undefined>(undefined);
  const [taxAmount, setTaxAmount] = useState<number>(0);
  const [gstNumber, setGstNumber] = useState('');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [lineItems, setLineItems] = useState<{ id: string; description: string; amount: number; taxAmount: number }[]>([]);

  // OCR scanning state
  const [isScanning, setIsScanning] = useState(false);
  const [scanStep, setScanStep] = useState<string>('');
  const [scanProgress, setScanProgress] = useState(0);
  const [ocrMetadata, setOcrMetadata] = useState<ExtractedOcrState | null>(null);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);

  // Camera & WebCam Scanner States
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [isCameraLoading, setIsCameraLoading] = useState(false);
  const [availableCameras, setAvailableCameras] = useState<MediaDeviceInfo[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const streamRef = React.useRef<MediaStream | null>(null);

  const initCameraStream = async (targetDeviceId?: string) => {
    setCameraError('');
    setIsCameraLoading(true);

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setIsCameraLoading(false);
      setCameraError(
        'Live WebCam camera stream is unavailable. Your browser may require an HTTPS connection or secure context. Please use "Take Photo" or "Browse File" instead.'
      );
      return;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    let stream: MediaStream | null = null;
    const constraintsToTry: MediaStreamConstraints[] = [];

    const desiredDeviceId = targetDeviceId || selectedCameraId;
    if (desiredDeviceId) {
      constraintsToTry.push({ video: { deviceId: { exact: desiredDeviceId } }, audio: false });
    }

    constraintsToTry.push(
      { video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } }, audio: false },
      { video: { facingMode: 'environment' }, audio: false },
      { video: { facingMode: 'user' }, audio: false },
      { video: true, audio: false }
    );

    let lastError: any = null;
    for (const constraints of constraintsToTry) {
      try {
        stream = await navigator.mediaDevices.getUserMedia(constraints);
        if (stream) break;
      } catch (err: any) {
        lastError = err;
      }
    }

    if (!stream) {
      console.error('Camera permissions / device error:', lastError);
      setIsCameraLoading(false);
      const isMobileDevice = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
      if (lastError?.name === 'NotAllowedError' || lastError?.name === 'PermissionDeniedError') {
        setCameraError(
          isMobileDevice
            ? 'Camera permission is blocked or denied. Tap "Open Native Camera App" below to take a photo directly, or check app permissions in phone Settings.'
            : 'Camera permission blocked by browser. Please click the camera/lock icon in your browser address bar and select "Allow".'
        );
      } else if (lastError?.name === 'NotFoundError' || lastError?.name === 'DevicesNotFoundError') {
        setCameraError('No camera hardware detected on this device. Use "Browse File" to upload an image.');
      } else if (lastError?.name === 'NotReadableError' || lastError?.name === 'TrackStartError') {
        setCameraError('Camera hardware is currently in use by another application. Please close other camera apps and retry.');
      } else {
        setCameraError('Unable to open live stream. Tap "Open Native Camera App" below to capture a receipt photo.');
      }
      return;
    }

    streamRef.current = stream;

    try {
      if (navigator.mediaDevices.enumerateDevices) {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(d => d.kind === 'videoinput');
        setAvailableCameras(videoDevices);
        if (!desiredDeviceId && videoDevices.length > 0) {
          setSelectedCameraId(videoDevices[0].deviceId);
        }
      }
    } catch (e) {
      console.warn('Unable to enumerate devices:', e);
    }

    if (videoRef.current) {
      videoRef.current.srcObject = stream;
      videoRef.current.muted = true;
      videoRef.current.playsInline = true;
      try {
        await videoRef.current.play();
      } catch (playErr) {
        console.warn('Video play error:', playErr);
      }
    }

    setIsCameraLoading(false);
  };

  const startCamera = () => {
    setIsCameraOpen(true);
    initCameraStream();
  };

  const cycleCamera = () => {
    if (availableCameras.length < 2) return;
    const currentIndex = availableCameras.findIndex(c => c.deviceId === selectedCameraId);
    const nextIndex = (currentIndex + 1) % availableCameras.length;
    const nextDevice = availableCameras[nextIndex];
    setSelectedCameraId(nextDevice.deviceId);
    initCameraStream(nextDevice.deviceId);
  };

  React.useEffect(() => {
    if (!isCameraOpen) {
      stopCamera();
    }
  }, [isCameraOpen]);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraOpen(false);
    setIsCameraLoading(false);
    setCameraError('');
  };

  const capturePhotoFromCamera = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    const width = video.videoWidth || 1280;
    const height = video.videoHeight || 720;

    if (width === 0 || height === 0) {
      setCameraError('Camera stream is not ready yet. Please wait a moment and try again.');
      return;
    }

    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, width, height);
      canvas.toBlob((blob) => {
        if (blob) {
          const capturedImageFile = new File([blob], `receipt_camera_${Date.now()}.jpg`, { type: 'image/jpeg' });
          stopCamera();
          handleFileUpload(capturedImageFile);
        }
      }, 'image/jpeg', 0.92);
    }
  };

  /**
   * Real Production OCR Document Upload & Extraction
   */
  const handleFileUpload = async (file: File) => {
    // 1. Show immediate local preview
    const localPreviewUrl = URL.createObjectURL(file);
    setReceiptUrl(localPreviewUrl);

    setIsScanning(true);
    setScanProgress(15);
    setScanStep('1. Validating document & uploading to secure storage...');

    try {
      const formData = new FormData();
      formData.append('file', file);

      const token = localStorage.getItem('kenzo_kore_jwt');

      // Progress animation update
      const progressTimer = setInterval(() => {
        setScanProgress(prev => {
          if (prev < 80) return prev + 10;
          return prev;
        });
      }, 300);

      setScanStep('2. Running OCR & neural text extraction...');

      const response = await fetch(`${API_BASE_URL}/receipts/process-ocr`, {
        method: 'POST',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: formData,
      });

      clearInterval(progressTimer);
      setScanProgress(90);
      setScanStep('3. Parsing merchant, amounts, tax & itemization...');

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.message || 'OCR extraction failed');
      }

      const result = await response.json();
      const extracted = result.extractedData;

      if (result.receiptUrl) {
        setReceiptUrl(result.receiptUrl);
      }

      // Auto-fill form fields from OCR extraction results
      if (extracted) {
        if (extracted.title) setTitle(extracted.title);
        if (extracted.merchant) setMerchant(extracted.merchant);
        if (extracted.amount !== undefined && extracted.amount > 0) setAmount(extracted.amount);
        if (extracted.currency) setCurrency(extracted.currency);
        if (extracted.date) setDate(extracted.date);
        if (extracted.category) setCategory(extracted.category as ExpenseCategory);
        if (extracted.taxAmount !== undefined) setTaxAmount(extracted.taxAmount);
        if (extracted.gstNumber) setGstNumber(extracted.gstNumber);
        if (extracted.referenceNumber) setReferenceNumber(extracted.referenceNumber);
        if (extracted.businessPurpose) setBusinessPurpose(extracted.businessPurpose);

        if (extracted.lineItems && extracted.lineItems.length > 0) {
          setLineItems(extracted.lineItems);
        } else if (extracted.amount > 0) {
          setLineItems([
            {
              id: 'li_1',
              description: extracted.businessPurpose || `${extracted.merchant} item`,
              amount: extracted.amount,
              taxAmount: extracted.taxAmount || 0
            }
          ]);
        }

        setOcrMetadata({
          merchant: extracted.merchant,
          amount: extracted.amount,
          currency: extracted.currency,
          date: extracted.date,
          category: extracted.category,
          taxAmount: extracted.taxAmount,
          gstNumber: extracted.gstNumber,
          referenceNumber: extracted.referenceNumber,
          businessPurpose: extracted.businessPurpose,
          confidence: extracted.confidence || { merchant: 0.9, amount: 0.9, date: 0.9, taxAmount: 0.8, overall: 0.88 },
          fileName: file.name
        });
      }

      setScanProgress(100);
      setScanStep('4. Form pre-filled! Please review and verify all fields below.');

      setTimeout(() => {
        setIsScanning(false);
        confetti({
          particleCount: 75,
          spread: 60,
          origin: { y: 0.6 }
        });
      }, 500);

    } catch (err: any) {
      console.error('OCR Processing error:', err);
      setIsScanning(false);
      alert(`OCR Document Scan Notice: ${err.message || 'Could not automatically extract all fields. Please enter the details manually.'}`);
    }
  };

  const handleAddLineItem = () => {
    const newItem = {
      id: `li_${Date.now()}`,
      description: '',
      amount: 0,
      taxAmount: 0
    };
    setLineItems([...lineItems, newItem]);
  };

  const handleRemoveLineItem = (id: string) => {
    setLineItems(lineItems.filter(item => item.id !== id));
  };

  const handleLineItemChange = (id: string, field: string, value: string | number) => {
    setLineItems(
      lineItems.map(item => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  const handleSubmit = (e: React.FormEvent, isDraft = false) => {
    e.preventDefault();

    if (!merchant || amount <= 0) {
      alert('Please provide a valid Merchant and Amount.');
      return;
    }

    createExpense({
      title: title || `${category} - ${merchant}`,
      category,
      amount,
      currency: currency || 'USD',
      date,
      paymentMethod,
      merchant,
      businessPurpose,
      billable,
      location,
      description,
      receiptUrl,
      taxAmount,
      referenceNumber,
      tags: tagsInput ? tagsInput.split(',').map(t => t.trim()) : [],
      items: lineItems.map(item => ({
        id: item.id,
        description: item.description,
        amount: item.amount,
        taxAmount: item.taxAmount,
        category: category
      })),
      isDraft
    });

    confetti({
      particleCount: 150,
      spread: 80,
      origin: { y: 0.5 }
    });

    setCurrentTab('expenses');
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fadeIn">
      {/* Form Area */}
      <div className="lg:col-span-2 space-y-6">
        <div className="glass-panel p-6 rounded-3xl space-y-6">
          <div className="border-b border-white/[0.06] pb-4 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-[#00C8FF]" />
                File New Expense Claim
              </h2>
              <p className="text-xs text-gray-400 font-sans mt-0.5">
                Upload your receipt or invoice on the right for automated OCR parsing, then review and submit below.
              </p>
            </div>
            {ocrMetadata && (
              <span className="text-[10px] px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full font-bold uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5" />
                OCR Auto-Populated ({(ocrMetadata.confidence.overall * 100).toFixed(0)}% Confidence)
              </span>
            )}
          </div>

          {/* Verification Notice Banner */}
          {ocrMetadata && (
            <div className="p-3.5 bg-[#00A3FF]/10 border border-[#00C8FF]/30 rounded-2xl flex items-center gap-3 text-xs text-[#00E0FF]">
              <FileCheck className="w-5 h-5 shrink-0" />
              <div className="space-y-0.5">
                <span className="font-bold block">Human-in-the-Loop Verification</span>
                <span className="text-gray-300 text-[11px] block">
                  Fields have been extracted from <strong>{ocrMetadata.fileName}</strong>. Please review all amounts, dates, and merchant info before submitting.
                </span>
              </div>
            </div>
          )}

          <form onSubmit={e => handleSubmit(e, false)} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Claim Title */}
              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-xs text-gray-400 flex items-center justify-between">
                  <span>Expense Claim Title *</span>
                  {ocrMetadata && <span className="text-[10px] text-[#00C8FF] font-bold">⚡ OCR Extracted</span>}
                </label>
                <input
                  type="text"
                  placeholder="e.g. AWS Cloud Hosting - July 2026"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  className="w-full bg-[#090A0F]/50 border border-white/[0.06] rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-[#00C8FF]/50"
                  required
                />
              </div>

              {/* Merchant */}
              <div className="space-y-1.5">
                <label className="text-xs text-gray-400 flex items-center justify-between">
                  <span>Merchant / Vendor *</span>
                  {ocrMetadata && <span className="text-[10px] text-[#00C8FF] font-bold">⚡ {Math.round(ocrMetadata.confidence.merchant * 100)}% Conf.</span>}
                </label>
                <input
                  type="text"
                  placeholder="e.g. Amazon Web Services Inc."
                  value={merchant}
                  onChange={e => setMerchant(e.target.value)}
                  className="w-full bg-[#090A0F]/50 border border-white/[0.06] rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-[#00C8FF]/50"
                  required
                />
              </div>

              {/* Category */}
              <div className="space-y-1.5">
                <label className="text-xs text-gray-400">Expense Category *</label>
                <select
                  value={category}
                  onChange={e => setCategory(e.target.value as ExpenseCategory)}
                  className="w-full bg-[#090A0F] border border-white/[0.06] rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#00C8FF]/50"
                >
                  <option value="Meals">Meals & Dining</option>
                  <option value="Travel">Travel & Flights</option>
                  <option value="Taxi">Taxi & Local Transit</option>
                  <option value="Hotel & Lodging">Hotel & Lodging</option>
                  <option value="Cloud Services">Cloud Services & Hosting</option>
                  <option value="Software Subscriptions">Software & SaaS Subscriptions</option>
                  <option value="Office Supplies">Office Supplies & Stationery</option>
                  <option value="Fuel & Mileage">Fuel & Mileage</option>
                  <option value="Client Entertainment">Client Entertainment</option>
                  <option value="Other">Other Miscellaneous</option>
                </select>
              </div>

              {/* Currency & Amount */}
              <div className="space-y-1.5">
                <label className="text-xs text-gray-400 flex items-center justify-between">
                  <span>Total Amount *</span>
                  {ocrMetadata && <span className="text-[10px] text-[#00C8FF] font-bold">⚡ {Math.round(ocrMetadata.confidence.amount * 100)}% Conf.</span>}
                </label>
                <div className="flex gap-2">
                  <select
                    value={currency}
                    onChange={e => setCurrency(e.target.value)}
                    className="w-28 bg-[#090A0F] border border-white/[0.06] rounded-xl px-2 py-2.5 text-xs text-[#00E0FF] font-bold focus:outline-none focus:border-[#00C8FF]/50"
                  >
                    <option value="INR">INR (₹)</option>
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="GBP">GBP (£)</option>
                    <option value="CAD">CAD (C$)</option>
                    <option value="AUD">AUD (A$)</option>
                    <option value="JPY">JPY (¥)</option>
                  </select>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    placeholder="0.00"
                    value={amount || ''}
                    onChange={e => setAmount(parseFloat(e.target.value) || 0)}
                    className="flex-1 bg-[#090A0F]/50 border border-white/[0.06] rounded-xl px-3.5 py-2.5 text-xs text-white font-mono font-bold focus:outline-none focus:border-[#00C8FF]/50"
                    required
                  />
                </div>
              </div>

              {/* Date */}
              <div className="space-y-1.5">
                <label className="text-xs text-gray-400 flex items-center justify-between">
                  <span>Transaction Date *</span>
                  {ocrMetadata && <span className="text-[10px] text-[#00C8FF] font-bold">⚡ Normalized</span>}
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  className="w-full bg-[#090A0F]/50 border border-white/[0.06] rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#00C8FF]/50"
                  required
                />
              </div>

              {/* Tax Amount */}
              <div className="space-y-1.5">
                <label className="text-xs text-gray-400">Tax / GST Amount</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={taxAmount || ''}
                  onChange={e => setTaxAmount(parseFloat(e.target.value) || 0)}
                  className="w-full bg-[#090A0F]/50 border border-white/[0.06] rounded-xl px-3.5 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-[#00C8FF]/50"
                />
              </div>

              {/* GST / Tax Number */}
              <div className="space-y-1.5">
                <label className="text-xs text-gray-400">GSTIN / Vendor Tax ID</label>
                <input
                  type="text"
                  placeholder="e.g. 29ABCDE1234F1Z5"
                  value={gstNumber}
                  onChange={e => setGstNumber(e.target.value)}
                  className="w-full bg-[#090A0F]/50 border border-white/[0.06] rounded-xl px-3.5 py-2.5 text-xs text-white uppercase focus:outline-none focus:border-[#00C8FF]/50"
                />
              </div>

              {/* Reference / Invoice Number */}
              <div className="space-y-1.5">
                <label className="text-xs text-gray-400">Invoice / Reference #</label>
                <input
                  type="text"
                  placeholder="e.g. INV-2026-9812"
                  value={referenceNumber}
                  onChange={e => setReferenceNumber(e.target.value)}
                  className="w-full bg-[#090A0F]/50 border border-white/[0.06] rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#00C8FF]/50"
                />
              </div>

              {/* Payment Method */}
              <div className="space-y-1.5">
                <label className="text-xs text-gray-400">Payment Method</label>
                <select
                  value={paymentMethod}
                  onChange={e => setPaymentMethod(e.target.value as PaymentMethod)}
                  className="w-full bg-[#090A0F] border border-white/[0.06] rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#00C8FF]/50"
                >
                  <option value="UPI">UPI / Instant Transfer</option>
                  <option value="CORPORATE_CARD">Corporate Credit Card</option>
                  <option value="BANK_TRANSFER">Bank Wire Transfer</option>
                  <option value="CASH">Cash</option>
                  <option value="CHEQUE">Cheque</option>
                </select>
              </div>

              {/* Location */}
              <div className="space-y-1.5">
                <label className="text-xs text-gray-400">City / Location</label>
                <input
                  type="text"
                  placeholder="e.g. Bengaluru, India"
                  value={location}
                  onChange={e => setLocation(e.target.value)}
                  className="w-full bg-[#090A0F]/50 border border-white/[0.06] rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-[#00C8FF]/50"
                />
              </div>

              {/* Business Purpose */}
              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-xs text-gray-400">Business Purpose & Justification *</label>
                <textarea
                  rows={2}
                  placeholder="Briefly explain the business necessity for this expenditure..."
                  value={businessPurpose}
                  onChange={e => setBusinessPurpose(e.target.value)}
                  className="w-full bg-[#090A0F]/50 border border-white/[0.06] rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-[#00C8FF]/50"
                  required
                />
              </div>
            </div>

            {/* Line Items Itemization */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between border-b border-white/[0.06] pb-2">
                <span className="text-xs font-bold text-white uppercase tracking-wider">Itemized Line Breakdown</span>
                <button
                  type="button"
                  onClick={handleAddLineItem}
                  className="flex items-center gap-1 text-[11px] text-[#00C8FF] hover:text-[#00E0FF] font-bold cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Line Item
                </button>
              </div>

              {lineItems.map((item, idx) => (
                <div key={item.id} className="grid grid-cols-12 gap-2 items-center p-2.5 bg-white/[0.01] border border-white/[0.04] rounded-xl text-xs">
                  <div className="col-span-6">
                    <input
                      type="text"
                      placeholder="Item Description"
                      value={item.description}
                      onChange={e => handleLineItemChange(item.id, 'description', e.target.value)}
                      className="w-full bg-transparent border-none p-1 text-xs text-white focus:ring-0"
                    />
                  </div>
                  <div className="col-span-3">
                    <input
                      type="number"
                      step="0.01"
                      placeholder="Amount"
                      value={item.amount || ''}
                      onChange={e => handleLineItemChange(item.id, 'amount', parseFloat(e.target.value) || 0)}
                      className="w-full bg-transparent border-none p-1 text-xs text-right text-white font-mono focus:ring-0"
                    />
                  </div>
                  <div className="col-span-2">
                    <input
                      type="number"
                      step="0.01"
                      placeholder="Tax"
                      value={item.taxAmount || ''}
                      onChange={e => handleLineItemChange(item.id, 'taxAmount', parseFloat(e.target.value) || 0)}
                      className="w-full bg-transparent border-none p-1 text-xs text-right text-gray-400 font-mono focus:ring-0"
                    />
                  </div>
                  <div className="col-span-1 text-right">
                    <button
                      type="button"
                      onClick={() => handleRemoveLineItem(item.id)}
                      className="text-gray-500 hover:text-rose-400 p-1 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/[0.06]">
              <button
                type="button"
                onClick={e => handleSubmit(e, true)}
                className="px-4 py-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-gray-300 font-bold text-xs transition-colors cursor-pointer"
              >
                Save as Draft
              </button>
              <button
                type="submit"
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#0077B6] via-[#00A3FF] to-[#00C8FF] hover:from-[#0088FF] hover:to-[#00E0FF] text-white font-bold text-xs shadow-[0_0_20px_rgba(0,163,255,0.3)] transition-all cursor-pointer flex items-center gap-2"
              >
                <Check className="w-4 h-4" />
                <span>Confirm & Submit Claim</span>
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* OCR Document Scanner & Side-by-Side Review Panel */}
      <div className="space-y-6">
        {/* Hidden inputs for File & Camera Capture */}
        <input
          type="file"
          id="receipt-file-uploader"
          accept="image/*,application/pdf"
          className="hidden"
          onChange={e => {
            if (e.target.files && e.target.files[0]) {
              handleFileUpload(e.target.files[0]);
            }
          }}
        />

        <input
          type="file"
          id="camera-file-uploader"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={e => {
            if (e.target.files && e.target.files[0]) {
              handleFileUpload(e.target.files[0]);
            }
          }}
        />

        {/* Receipt Drag & Drop Box */}
        <div
          className="glass-panel p-6 rounded-3xl flex flex-col items-center justify-center border-dashed border-2 border-[#ffffff0a] text-center min-h-[220px] relative transition-all duration-200"
          onDragOver={e => e.preventDefault()}
          onDrop={e => {
            e.preventDefault();
            if (e.dataTransfer.files && e.dataTransfer.files[0]) {
              handleFileUpload(e.dataTransfer.files[0]);
            }
          }}
        >
          {isScanning ? (
            <div className="space-y-4 w-full flex flex-col items-center justify-center p-2">
              <div className="relative w-16 h-16 rounded-full border-4 border-[#00C8FF]/20 border-t-[#00C8FF] animate-spin flex items-center justify-center" />
              <div className="w-full max-w-[180px] bg-white/[0.05] h-1.5 rounded-full overflow-hidden">
                <div className="bg-[#00C8FF] h-full transition-all duration-300" style={{ width: `${scanProgress}%` }} />
              </div>
              <div className="space-y-1 text-center">
                <span className="text-[11px] text-[#00E0FF] font-bold tracking-wider uppercase block font-sans">
                  REAL OCR SCANNING ({scanProgress}%)
                </span>
                <p className="text-[10px] text-gray-400 max-w-xs">{scanStep}</p>
              </div>
            </div>
          ) : (
            <div className="w-full space-y-4 flex flex-col items-center">
              <div className="flex gap-3">
                <div className="p-3 bg-[#00A3FF]/10 rounded-2xl text-[#00C8FF] animate-pulse">
                  <UploadCloud className="w-6 h-6" />
                </div>
                <div className="p-3 bg-[#0077B6]/10 rounded-2xl text-[#00E0FF] animate-bounce">
                  <Camera className="w-6 h-6" />
                </div>
              </div>

              <div>
                <h3 className="text-xs font-bold text-white uppercase tracking-wider font-sans">Real OCR Receipt Scanner</h3>
                <p className="text-[10px] text-gray-400 font-sans mt-1">
                  Supports <strong>JPG, PNG, WEBP & PDF</strong> invoices up to 10MB.<br />
                  Drag & drop your bill or select an option below:
                </p>
              </div>

              {/* Upload & Camera Action Buttons */}
              <div className="grid grid-cols-2 gap-2.5 w-full pt-1">
                <button
                  type="button"
                  onClick={() => document.getElementById('receipt-file-uploader')?.click()}
                  className="py-2.5 px-3 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-white text-xs font-bold font-sans flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                >
                  <UploadCloud className="w-4 h-4 text-[#00C8FF]" />
                  <span>Browse Document</span>
                </button>

                <button
                  type="button"
                  onClick={() => document.getElementById('camera-file-uploader')?.click()}
                  className="py-2.5 px-3 rounded-xl bg-gradient-to-r from-[#00A3FF]/20 to-[#00C8FF]/20 border border-[#00C8FF]/40 text-[#00C8FF] text-xs font-bold font-sans flex items-center justify-center gap-1.5 transition-all cursor-pointer hover:bg-[#00C8FF]/30"
                >
                  <Camera className="w-4 h-4" />
                  <span>Take Photo</span>
                </button>
              </div>

              <button
                type="button"
                onClick={startCamera}
                className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-[#0077B6] via-[#00A3FF] to-[#00C8FF] hover:from-[#0088FF] hover:to-[#00E0FF] text-white text-xs font-extrabold uppercase tracking-wider font-sans flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(0,163,255,0.3)] transition-all cursor-pointer"
              >
                <Video className="w-4 h-4" />
                <span>Live WebCam Scanner</span>
              </button>
            </div>
          )}
        </div>

        {/* Attached Receipt Document Preview Card */}
        {receiptUrl && (
          <div className="glass-panel p-5 rounded-3xl space-y-3 border border-[#00C8FF]/20 bg-gradient-to-b from-[#00A3FF]/5 to-transparent">
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-2">
              <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-[#00C8FF]" />
                Attached Receipt Document
              </span>
              <button
                type="button"
                onClick={() => setPreviewModalOpen(true)}
                className="text-[10px] text-[#00C8FF] hover:text-[#00E0FF] font-bold flex items-center gap-1 cursor-pointer"
              >
                <ZoomIn className="w-3.5 h-3.5" />
                Expand View
              </button>
            </div>

            <div className="relative rounded-2xl overflow-hidden bg-black/40 border border-white/10 max-h-52 flex items-center justify-center group">
              {receiptUrl.includes('application/pdf') || receiptUrl.endsWith('.pdf') ? (
                <div className="p-8 text-center space-y-2">
                  <FileText className="w-12 h-12 text-[#00C8FF] mx-auto animate-pulse" />
                  <span className="text-xs text-white font-bold block">PDF Invoice Attached</span>
                  <span className="text-[10px] text-gray-400 block truncate max-w-xs">{receiptUrl.split('/').pop()}</span>
                </div>
              ) : (
                <img
                  src={receiptUrl}
                  alt="Receipt Scan"
                  className="w-full h-auto max-h-48 object-contain transition-transform group-hover:scale-105"
                />
              )}
            </div>

            {ocrMetadata && (
              <div className="grid grid-cols-2 gap-2 pt-1 text-[10px]">
                <div className="p-2 bg-white/[0.02] border border-white/[0.04] rounded-xl">
                  <span className="text-gray-400 block">Extracted Merchant</span>
                  <span className="font-bold text-white truncate block">{ocrMetadata.merchant}</span>
                </div>
                <div className="p-2 bg-white/[0.02] border border-white/[0.04] rounded-xl">
                  <span className="text-gray-400 block">Parsed Amount</span>
                  <span className="font-bold text-[#00E0FF] block">${ocrMetadata.amount}</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Live WebCam Camera Modal */}
        {isCameraOpen && (
          <div className="fixed inset-0 z-[9999] bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-4 animate-fadeIn">
            <div className="w-full max-w-lg glass-panel rounded-3xl p-5 sm:p-6 border border-[#00C8FF]/30 space-y-4 relative shadow-[0_0_50px_rgba(0,163,255,0.3)] animate-scaleUp my-auto">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <h3 className="text-sm font-bold text-white flex items-center gap-2 font-sans">
                  <Camera className="w-4 h-4 text-[#00C8FF]" />
                  Live Receipt Camera Scanner
                </h3>
                <div className="flex items-center gap-2">
                  {availableCameras.length > 1 && !cameraError && (
                    <button
                      type="button"
                      onClick={cycleCamera}
                      title="Switch Camera"
                      className="px-2.5 py-1 bg-[#00C8FF]/10 hover:bg-[#00C8FF]/20 text-[#00C8FF] rounded-lg text-xs font-semibold flex items-center gap-1 border border-[#00C8FF]/30 transition-colors cursor-pointer"
                    >
                      <RefreshCw className="w-3 h-3" />
                      Switch Camera ({availableCameras.length})
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={stopCamera}
                    className="text-gray-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="relative rounded-2xl overflow-hidden bg-black aspect-[4/3] flex items-center justify-center border border-white/10 shadow-inner">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />

                {!isCameraLoading && !cameraError && (
                  <div className="absolute inset-5 border-2 border-dashed border-[#00C8FF]/60 rounded-xl pointer-events-none flex items-center justify-center">
                    <span className="text-[10px] text-[#00C8FF] font-bold uppercase tracking-widest bg-black/70 px-3 py-1 rounded-full font-sans border border-[#00C8FF]/30">
                      Align Receipt Inside Frame
                    </span>
                  </div>
                )}

                {isCameraLoading && (
                  <div className="absolute inset-0 bg-black/85 flex flex-col items-center justify-center space-y-3 font-sans p-4 text-center z-10">
                    <div className="w-10 h-10 border-2 border-[#00C8FF] border-t-transparent rounded-full animate-spin" />
                    <span className="text-xs text-[#00C8FF] font-semibold">
                      Requesting Camera Access...
                    </span>
                  </div>
                )}

                {cameraError && (
                  <div className="absolute inset-0 bg-black/95 p-5 border border-rose-500/30 text-rose-300 text-xs rounded-2xl flex flex-col items-center justify-center text-center font-sans space-y-3 z-10">
                    <AlertTriangle className="w-8 h-8 text-rose-400 mb-1" />
                    <p className="max-w-xs text-rose-200 leading-relaxed">{cameraError}</p>
                  </div>
                )}
              </div>

              <canvas ref={canvasRef} className="hidden" />

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={stopCamera}
                  className="flex-1 py-3 rounded-xl border border-white/10 text-xs text-gray-300 font-bold uppercase tracking-wider font-sans hover:bg-white/5 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={capturePhotoFromCamera}
                  disabled={!!cameraError || isCameraLoading}
                  className="flex-1 py-3 rounded-xl bg-gradient-to-r from-[#0077B6] via-[#00A3FF] to-[#00C8FF] hover:from-[#0088FF] hover:to-[#00E0FF] text-white text-xs font-extrabold uppercase tracking-wider font-sans flex items-center justify-center gap-2 shadow-[0_0_25px_rgba(0,163,255,0.4)] transition-all cursor-pointer disabled:opacity-50"
                >
                  <Camera className="w-4 h-4" />
                  <span>Capture & Run OCR</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Lightbox / Expanded Receipt Preview Modal */}
        {previewModalOpen && receiptUrl && (
          <div className="fixed inset-0 z-[9999] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
            <div className="w-full max-w-3xl glass-panel rounded-3xl p-5 border border-[#00C8FF]/30 space-y-4 relative my-auto max-h-[90vh] flex flex-col">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[#00C8FF]" />
                  Original Receipt Inspection View
                </h3>
                <button
                  type="button"
                  onClick={() => setPreviewModalOpen(false)}
                  className="text-gray-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-auto rounded-2xl bg-black/50 p-2 flex items-center justify-center">
                {receiptUrl.includes('application/pdf') || receiptUrl.endsWith('.pdf') ? (
                  <iframe src={receiptUrl} title="PDF Preview" className="w-full h-[600px] rounded-xl border border-white/10" />
                ) : (
                  <img src={receiptUrl} alt="Expanded Receipt" className="max-w-full max-h-[600px] object-contain rounded-xl" />
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
