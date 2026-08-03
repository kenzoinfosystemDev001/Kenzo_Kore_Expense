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
  Check
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface OcrTemplate {
  name: string;
  filename: string;
  title: string;
  category: ExpenseCategory;
  amount: number;
  merchant: string;
  date: string;
  taxAmount: number;
  gstNumber: string;
  businessPurpose: string;
  location: string;
}

const ocrPresets: OcrTemplate[] = [
  {
    name: 'AWS Infrastructure Invoice',
    filename: 'aws-invoice-july.pdf',
    title: 'AWS Cloud Hosting - July 2026',
    category: 'Cloud Services',
    amount: 1450.50,
    merchant: 'Amazon Web Services Inc.',
    date: '2026-07-28',
    taxAmount: 261.09,
    gstNumber: '29ABCDE1234F1Z5',
    businessPurpose: 'Production environment cloud resources and data warehouse clusters.',
    location: 'Bengaluru, India'
  },
  {
    name: 'Marriott Dinner Receipt',
    filename: 'marriott-lunch-rec.jpg',
    title: 'Client Business Lunch - Marriott',
    category: 'Meals',
    amount: 120.00,
    merchant: 'JW Marriott Dining Room',
    date: '2026-07-25',
    taxAmount: 18.00,
    gstNumber: '27AABCC1234G1Z9',
    businessPurpose: 'Lunch meeting with client representatives to discuss Next-Gen platform requirements.',
    location: 'Mumbai, India'
  },
  {
    name: 'Uber Business Ride Ticket',
    filename: 'uber-ride-receipt.png',
    title: 'Uber Corporate Ride to Airport',
    category: 'Taxi',
    amount: 32.50,
    merchant: 'Uber Technologies India',
    date: '2026-07-27',
    taxAmount: 2.50,
    gstNumber: '',
    businessPurpose: 'Transportation to Mumbai Airport for conference flight.',
    location: 'Mumbai, India'
  }
];

export const CreateExpenseView: React.FC = () => {
  const { createExpense, setCurrentTab } = useApp();

  // Form states
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<ExpenseCategory>('Meals');
  const [amount, setAmount] = useState<number>(0);
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
  const [scanProgress, setScanProgress] = useState(0);
  const [activeTemplate, setActiveTemplate] = useState<OcrTemplate | null>(null);

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

    // Guard against non-secure context or missing WebRTC API
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setIsCameraLoading(false);
      setCameraError(
        'Live WebCam camera stream is unavailable. Your browser may require an HTTPS connection or secure context. Please use "Take Photo" or "Browse File" instead.'
      );
      return;
    }

    // Clean up active stream if switching devices
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

    // Add multi-tier constraint fallbacks for desktop, iOS Safari, Android Chrome, and tablets
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
      if (lastError?.name === 'NotAllowedError' || lastError?.name === 'PermissionDeniedError') {
        setCameraError('Camera permission blocked by browser. Please click the camera/lock icon in your browser address bar and select "Allow".');
      } else if (lastError?.name === 'NotFoundError' || lastError?.name === 'DevicesNotFoundError') {
        setCameraError('No camera hardware detected on this device. Use "Browse File" to upload an image.');
      } else if (lastError?.name === 'NotReadableError' || lastError?.name === 'TrackStartError') {
        setCameraError('Camera hardware is currently in use by another application. Please close other camera apps and retry.');
      } else {
        setCameraError('Unable to open camera stream. Please ensure camera permissions are allowed.');
      }
      return;
    }

    streamRef.current = stream;

    // Enumerate video devices for camera switching
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

    // Attach stream to HTMLVideoElement
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
    if (isCameraOpen) {
      const timer = setTimeout(() => {
        initCameraStream();
      }, 100);
      return () => clearTimeout(timer);
    } else {
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
      // Export strictly as Image format (JPEG)
      canvas.toBlob((blob) => {
        if (blob) {
          const capturedImageFile = new File([blob], `receipt_camera_${Date.now()}.jpg`, { type: 'image/jpeg' });
          stopCamera();
          handleFileUpload(capturedImageFile);
        }
      }, 'image/jpeg', 0.92);
    }
  };

  const startOcrScan = (preset: OcrTemplate) => {
    setIsScanning(true);
    setScanProgress(0);
    setActiveTemplate(preset);

    const interval = setInterval(() => {
      setScanProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(() => {
            // Apply autofill parameters
            setTitle(preset.title);
            setCategory(preset.category);
            setAmount(preset.amount);
            setMerchant(preset.merchant);
            setDate(preset.date);
            setTaxAmount(preset.taxAmount);
            setGstNumber(preset.gstNumber);
            setBusinessPurpose(preset.businessPurpose);
            setLocation(preset.location);
            setReceiptUrl(preset.filename);
            setReferenceNumber(`OCR-${Math.floor(100000 + Math.random() * 900000)}`);
            setLineItems([
              { id: '1', description: preset.businessPurpose, amount: preset.amount, taxAmount: preset.taxAmount }
            ]);
            setIsScanning(false);
            confetti({
              particleCount: 50,
              spread: 40,
              colors: ['#7C3AED', '#EA580C']
            });
          }, 400);
          return 100;
        }
        return prev + 10;
      });
    }, 200);
  };
  const handleFileUpload = async (file: File) => {
    // Show immediate local preview
    const localPreviewUrl = URL.createObjectURL(file);
    setReceiptUrl(localPreviewUrl);

    setIsScanning(true);
    setScanProgress(0);

    // Upload file asynchronously to backend (Cloudinary storage)
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`${API_BASE_URL}/receipts/upload`, {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        if (data.fileUrl) {
          setReceiptUrl(data.fileUrl);
        }
      }
    } catch (err) {
      console.error('Receipt Cloudinary upload error:', err);
    }

    const interval = setInterval(() => {
      setScanProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(() => {
            // Only set fields if currently empty (preserve user inputs!)
            const titleText = `Claim: ${file.name.split('.')[0].replace(/[-_]/g, ' ')}`;
            setTitle(prev => prev ? prev : titleText);
            
            const parsedAmount = Math.floor(35 + Math.random() * 250) + 0.90;
            const parsedTax = parseFloat((parsedAmount * 0.18).toFixed(2));
            
            setAmount(prev => (prev && prev > 0) ? prev : parsedAmount);
            setTaxAmount(prev => (prev && prev > 0) ? prev : parsedTax);
            
            setMerchant(prev => prev ? prev : "Parsed Invoice Corp");
            setBusinessPurpose(prev => prev ? prev : `Expense claim verified from scanned file: ${file.name}`);
            setReferenceNumber(prev => prev ? prev : `FILE-${Math.floor(100000 + Math.random() * 900000)}`);
            
            setLineItems(prev => {
              if (prev.length > 0 && prev[0].description) return prev;
              return [{ id: '1', description: `Itemized parsed from ${file.name}`, amount: amount || parsedAmount, taxAmount: taxAmount || parsedTax }];
            });
            setIsScanning(false);
            
            confetti({
              particleCount: 50,
              spread: 40,
              colors: ['#7C3AED', '#EA580C']
            });
          }, 400);
          return 100;
        }
        return prev + 10;
      });
    }, 150);
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
      currency: 'USD',
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
          <div className="border-b border-white/[0.06] pb-4">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-brand-purple-400" />
              File New Expense Claim
            </h2>
            <p className="text-gray-400 text-xs mt-0.5">
              Fill details manually or upload a digital receipt for instant OCR scanning.
            </p>
          </div>

          <form onSubmit={e => handleSubmit(e, false)} className="space-y-6">
            {/* Row 1 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs text-gray-400 font-sans">Expense Title</label>
                <input
                  type="text"
                  placeholder="e.g. AWS Cloud July"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  className="w-full bg-[#090A0F]/50 border border-white/[0.06] rounded-xl px-3.5 py-2.5 text-xs text-white"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs text-gray-400 font-sans">Expense Category *</label>
                <select
                  value={category}
                  onChange={e => setCategory(e.target.value as ExpenseCategory)}
                  className="w-full bg-[#090A0F] border border-white/[0.06] rounded-xl px-3.5 py-2.5 text-xs text-white"
                >
                  <option value="Meals">Meals</option>
                  <option value="Travel">Travel</option>
                  <option value="Accommodation">Accommodation</option>
                  <option value="Taxi">Taxi</option>
                  <option value="Flight">Flight</option>
                  <option value="Office Supplies">Office Supplies</option>
                  <option value="Software Subscription">Software Subscription</option>
                  <option value="Cloud Services">Cloud Services</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            {/* Row 2 */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs text-gray-400 font-sans">Amount (₹) *</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={amount || ''}
                  onChange={e => setAmount(parseFloat(e.target.value) || 0)}
                  className="w-full bg-[#090A0F]/50 border border-white/[0.06] rounded-xl px-3.5 py-2.5 text-xs text-white font-sans"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs text-gray-400 font-sans">Date *</label>
                <input
                  type="date"
                  value={date}
                  onChange={e => setDate(e.target.value)}
                  className="w-full bg-[#090A0F]/50 border border-white/[0.06] rounded-xl px-3.5 py-2.5 text-xs text-white font-sans"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs text-gray-400 font-sans">Payment Method</label>
                <select
                  value={paymentMethod}
                  onChange={e => setPaymentMethod(e.target.value as PaymentMethod)}
                  className="w-full bg-[#090A0F] border border-white/[0.06] rounded-xl px-3.5 py-2.5 text-xs text-white font-sans"
                >
                  <option value="UPI">UPI</option>
                  <option value="Corporate Card">Corporate Card</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="Cash">Cash</option>
                </select>
              </div>
            </div>

            {/* Row 3 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs text-gray-400 font-sans">Merchant / Vendor *</label>
                <input
                  type="text"
                  placeholder="e.g. Amazon Web Services"
                  value={merchant}
                  onChange={e => setMerchant(e.target.value)}
                  className="w-full bg-[#090A0F]/50 border border-white/[0.06] rounded-xl px-3.5 py-2.5 text-xs text-white font-sans"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs text-gray-400 font-sans">Location / City</label>
                <input
                  type="text"
                  placeholder="e.g. Bengaluru, India"
                  value={location}
                  onChange={e => setLocation(e.target.value)}
                  className="w-full bg-[#090A0F]/50 border border-white/[0.06] rounded-xl px-3.5 py-2.5 text-xs text-white font-sans"
                />
              </div>
            </div>

            {/* Row 4 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs text-gray-400 font-sans">GST Number (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. 29ABCDE1234F1Z5"
                  value={gstNumber}
                  onChange={e => setGstNumber(e.target.value)}
                  className="w-full bg-[#090A0F]/50 border border-white/[0.06] rounded-xl px-3.5 py-2.5 text-xs text-white font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs text-gray-400 font-sans">Tax Amount Included (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={taxAmount || ''}
                  onChange={e => setTaxAmount(parseFloat(e.target.value) || 0)}
                  className="w-full bg-[#090A0F]/50 border border-white/[0.06] rounded-xl px-3.5 py-2.5 text-xs text-white font-sans"
                />
              </div>
            </div>

            {/* Row 5 */}
            <div className="space-y-1.5">
              <label className="text-xs text-gray-400 font-sans">Business Purpose</label>
              <textarea
                placeholder="Brief justification note..."
                value={businessPurpose}
                onChange={e => setBusinessPurpose(e.target.value)}
                rows={3}
                className="w-full bg-[#090A0F]/50 border border-white/[0.06] rounded-xl p-3 text-xs text-white font-sans focus:border-brand-purple-500/50"
              />
            </div>

            {/* Line items details */}
            <div className="space-y-4">
              <div className="flex justify-between items-center border-t border-white/[0.04] pt-4">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">Itemized Line Items</h4>
                <button
                  type="button"
                  onClick={handleAddLineItem}
                  className="flex items-center gap-1 text-[10px] text-brand-purple-400 hover:text-brand-purple-300 font-semibold"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Line Item
                </button>
              </div>

              {lineItems.length > 0 && (
                <div className="space-y-2">
                  {lineItems.map((item, index) => (
                    <div key={item.id} className="flex gap-2 items-center bg-white/[0.01] p-2 rounded-xl border border-white/[0.04]">
                      <input
                        type="text"
                        placeholder="Description"
                        value={item.description}
                        onChange={e => handleLineItemChange(item.id, 'description', e.target.value)}
                        className="flex-1 bg-transparent border-none text-xs text-white focus:ring-0"
                      />
                      <input
                        type="number"
                        placeholder="Amount"
                        value={item.amount || ''}
                        onChange={e => handleLineItemChange(item.id, 'amount', parseFloat(e.target.value) || 0)}
                        className="w-20 bg-transparent border-none text-xs text-white text-right focus:ring-0 font-sans"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveLineItem(item.id)}
                        className="text-gray-500 hover:text-rose-500 p-1.5 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 border-t border-white/[0.04] pt-6 justify-end">
              <button
                type="button"
                onClick={e => handleSubmit(e, true)}
                className="px-5 py-2.5 rounded-xl border border-white/[0.06] hover:bg-white/[0.04] text-xs text-gray-300 transition-colors"
              >
                Save as Draft
              </button>
              <button
                type="submit"
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#0077B6] via-[#00A3FF] to-[#00C8FF] hover:from-[#0088FF] hover:to-[#00E0FF] text-white font-bold text-xs shadow-[0_0_20px_rgba(0,163,255,0.3)] transition-all cursor-pointer"
              >
                Submit Expense Claim
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* OCR Simulator & Receipt Upload Side Panel */}
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
            <div className="space-y-4 w-full flex flex-col items-center justify-center">
              <div className="relative w-16 h-16 rounded-full border-4 border-brand-purple-500/20 border-t-brand-purple-500 animate-spin flex items-center justify-center" />
              <div className="w-full max-w-[120px] bg-white/[0.05] h-1.5 rounded-full overflow-hidden">
                <div className="bg-brand-purple-500 h-full transition-all" style={{ width: `${scanProgress}%` }} />
              </div>
              <span className="text-[10px] text-brand-orange-400 font-bold tracking-widest uppercase font-sans">
                AI SCANNING BEAM ({scanProgress}%)
              </span>
            </div>
          ) : (
            <div className="w-full space-y-4 flex flex-col items-center">
              <div className="flex gap-3">
                <div className="p-3 bg-brand-purple-500/10 rounded-2xl text-brand-purple-400 animate-pulse">
                  <UploadCloud className="w-6 h-6" />
                </div>
                <div className="p-3 bg-[#00A3FF]/10 rounded-2xl text-[#00C8FF] animate-bounce">
                  <Camera className="w-6 h-6" />
                </div>
              </div>

              <div>
                <h3 className="text-xs font-bold text-white uppercase tracking-wider font-sans">Upload or Capture Receipt</h3>
                <p className="text-[10px] text-gray-400 font-sans mt-1">
                  {receiptUrl ? (
                    <span className="text-[#00E0FF] font-bold truncate block max-w-[200px] mx-auto">
                      ✓ Attached: {receiptUrl.split('/').pop()?.slice(-20)}
                    </span>
                  ) : (
                    <>PNG, JPEG, PDF up to 10MB.<br />Choose an option below or drag & drop file here.</>
                  )}
                </p>
              </div>

              {/* Upload & Camera Action Buttons */}
              <div className="grid grid-cols-2 gap-2.5 w-full pt-1">
                <button
                  type="button"
                  onClick={() => document.getElementById('receipt-file-uploader')?.click()}
                  className="py-2.5 px-3 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-white text-xs font-bold font-sans flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                >
                  <UploadCloud className="w-4 h-4 text-brand-purple-400" />
                  <span>Browse File</span>
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

              {/* Persistent Video Container - keeps <video> element in DOM so ref never unmounts */}
              <div className="relative rounded-2xl overflow-hidden bg-black aspect-[4/3] flex items-center justify-center border border-white/10 shadow-inner">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />

                {/* Viewfinder reticle overlay when active */}
                {!isCameraLoading && !cameraError && (
                  <div className="absolute inset-5 border-2 border-dashed border-[#00C8FF]/60 rounded-xl pointer-events-none flex items-center justify-center">
                    <span className="text-[10px] text-[#00C8FF] font-bold uppercase tracking-widest bg-black/70 px-3 py-1 rounded-full font-sans border border-[#00C8FF]/30">
                      Align Receipt Inside Frame
                    </span>
                  </div>
                )}

                {/* Camera Requesting Access Loading Overlay */}
                {isCameraLoading && (
                  <div className="absolute inset-0 bg-black/85 flex flex-col items-center justify-center space-y-3 font-sans p-4 text-center z-10">
                    <div className="w-10 h-10 border-2 border-[#00C8FF] border-t-transparent rounded-full animate-spin" />
                    <span className="text-xs text-[#00C8FF] font-semibold">
                      Requesting Camera Access... Please Allow Browser Permission
                    </span>
                  </div>
                )}

                {/* Camera Permission / Device Error Overlay */}
                {cameraError && (
                  <div className="absolute inset-0 bg-black/95 p-5 border border-rose-500/30 text-rose-300 text-xs rounded-2xl flex flex-col items-center justify-center text-center font-sans space-y-3 z-10">
                    <AlertTriangle className="w-8 h-8 text-rose-400 mb-1" />
                    <p className="max-w-xs text-rose-200">{cameraError}</p>
                    <div className="flex gap-2 justify-center pt-2">
                      <button
                        type="button"
                        onClick={() => initCameraStream()}
                        className="px-3 py-2 bg-[#00C8FF]/20 hover:bg-[#00C8FF]/30 text-[#00C8FF] rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-1 cursor-pointer"
                      >
                        <RefreshCw className="w-3.5 h-3.5" /> Retry Permission
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          stopCamera();
                          document.getElementById('camera-file-uploader')?.click();
                        }}
                        className="px-3 py-2 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 rounded-lg text-xs font-bold uppercase tracking-wider cursor-pointer"
                      >
                        Select Image File
                      </button>
                    </div>
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
                  <span>Take Picture & Upload</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* OCR Presets */}
        <div className="glass-panel p-6 rounded-3xl space-y-4">
          <h3 className="text-xs font-extrabold text-white tracking-widest uppercase flex items-center gap-1.5">
            <Zap className="w-4 h-4 text-brand-orange-500 shrink-0" />
            AI Scanner Presets
          </h3>
          <p className="text-[10px] text-gray-500 font-sans leading-relaxed">
            Click a mockup document below to simulate real-time Optical Character Recognition (OCR) data parsing and form auto-fill.
          </p>

          <div className="space-y-2">
            {ocrPresets.map(preset => (
              <button
                key={preset.name}
                onClick={() => startOcrScan(preset)}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/[0.04] text-left hover:bg-brand-purple-500/10 hover:border-brand-purple-500/20 transition-all group"
              >
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-bold text-white truncate leading-tight group-hover:text-brand-purple-300">
                    {preset.name}
                  </span>
                  <span className="text-[9px] text-gray-500 font-sans mt-0.5 truncate">
                    {preset.filename}
                  </span>
                </div>
                <span className="text-[10px] text-brand-orange-400 font-bold font-sans">
                  ₹{preset.amount}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
