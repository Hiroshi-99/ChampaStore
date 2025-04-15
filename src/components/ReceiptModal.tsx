import React, { useRef, useCallback, memo, useState, useEffect, useMemo, lazy, Suspense } from 'react';
import { X, Check, User, CreditCard, ImageIcon, ZoomIn, Eye, Shield, Printer } from 'lucide-react';
import { useReactToPrint } from 'react-to-print';
import toast from 'react-hot-toast';
import { Dialog, DialogContent, DialogTitle } from "../ui/dialog";
import * as VisuallyHidden from '@radix-ui/react-visually-hidden';
import { Button } from "../ui/button";
import { sanitizeInput } from '../utils/sanitize';
import { formatDate } from '../utils/date-helpers';

// Lazy loaded image viewer component to reduce initial bundle size
const ImageViewer = lazy(() => import('./ImageViewer'));

// Fallback image viewer in case the main component fails to load
const FallbackImageViewer = ({ onClose, imageUrl }: { onClose: () => void; imageUrl: string }) => (
  <div className="fixed inset-0 bg-black/90 z-[999] flex items-center justify-center p-4 animate-fadeIn">
    <button onClick={onClose} className="absolute right-4 top-4 bg-gray-800/70 p-2 rounded-full text-white hover:bg-gray-700 transition-colors">
      <X size={20} />
    </button>
    <img 
      src={imageUrl} 
      alt="Preview" 
      className="max-w-full max-h-[90vh] object-contain rounded"
      onError={(e) => {
        (e.target as HTMLImageElement).onerror = null;
        (e.target as HTMLImageElement).src = 'https://i.imgur.com/JzDJS2A.png'; // Placeholder for failed image
      }}
    />
  </div>
);

interface ReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderData: {
    username: string;
    platform: string;
    rank: string;
    price: number;
    created_at: string;
    payment_proof?: string;
    orderId?: string;
  };
  theme?: {
    colorScheme?: 'default' | 'dark' | 'light',
    primaryColor?: string,
    animations?: boolean
  };
  showPaymentProof?: boolean;
  printEnabled?: boolean;
  storeName?: string;
  receiptBackgroundUrl?: string;
  receiptLogoUrl?: string;
  logoUrl?: string;
}

// Memoized receipt detail row component
const ReceiptDetailRow = memo(({
  label,
  value,
  icon,
  isHighlighted = false,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  isHighlighted?: boolean;
}) => (
  <div className={`flex items-center ${isHighlighted ? 'mt-4 pt-4 border-t border-gray-700' : 'my-3'}`}>
    <div className="text-gray-400 mr-3">{icon}</div>
    <div>
      <div className="text-xs text-gray-500">{label}</div>
      <div className={`${isHighlighted ? 'text-white font-semibold' : 'text-gray-300'}`}>
        {value}
      </div>
    </div>
  </div>
));

// Improved image loading with retry mechanism
const useImageWithRetry = (src: string, maxRetries = 3) => {
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [retries, setRetries] = useState(0);

  useEffect(() => {
    if (!src) return;
    
    const img = new Image();
    let mounted = true;

    const loadImage = () => {
      setLoading(true);
      setError(false);
      
      img.onload = () => {
        if (mounted) {
          setLoading(false);
          setError(false);
        }
      };
      
      img.onerror = () => {
        if (mounted && retries < maxRetries) {
          setRetries(prev => prev + 1);
          setTimeout(loadImage, 1000 * (retries + 1)); // Exponential backoff
        } else if (mounted) {
          setLoading(false);
          setError(true);
        }
      };

      img.src = src;
    };

    loadImage();
    return () => {
      mounted = false;
      img.onload = null;
      img.onerror = null;
    };
  }, [src, retries, maxRetries]);

  return { loading, error };
};

// Improved payment proof preview component
const PaymentProofPreview = memo(({ 
  imageUrl, 
  onToggleZoom,
  altText = "Payment Proof",
  maxHeight = 200
}: { 
  imageUrl: string; 
  onToggleZoom: () => void;
  altText?: string;
  maxHeight?: number;
}) => {
  const { loading, error } = useImageWithRetry(imageUrl);

  if (!imageUrl) return null;

  return (
    <div className="mt-4 pt-4 border-t border-gray-700">
      <div className="flex items-center justify-between">
        <div className="text-xs text-gray-500 mb-2">Payment Proof</div>
        {!error && !loading && (
          <button 
            onClick={onToggleZoom} 
            className="text-xs text-emerald-500 hover:text-emerald-400 flex items-center gap-1"
            title="View larger image"
          >
            <ZoomIn size={14} />
            Enlarge
          </button>
        )}
      </div>
      <div 
        className={`relative bg-gray-900/50 rounded-lg overflow-hidden ${!error && !loading ? 'cursor-zoom-in' : ''}`} 
        onClick={!error && !loading ? onToggleZoom : undefined}
      >
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-800/50">
            <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}
        {error ? (
          <div className="p-4 text-sm text-gray-400 text-center">
            <ImageIcon className="mx-auto mb-2 opacity-50" size={24} />
            Could not load payment proof image
            <button 
              onClick={() => window.open(imageUrl, '_blank')}
              className="mt-2 text-xs text-emerald-500 hover:text-emerald-400 flex items-center gap-1 mx-auto"
            >
              <Eye size={12} />
              View Original
            </button>
          </div>
        ) : (
          <img 
            src={imageUrl} 
            alt={altText} 
            className={`w-full h-auto object-contain transition-all duration-300`}
            style={{ maxHeight: `${maxHeight}px` }}
            loading="lazy"
            crossOrigin="anonymous" 
          />
        )}
      </div>
    </div>
  );
});

// Optimized print functionality
const usePrint = (ref: React.RefObject<HTMLDivElement>) => {
  const [isPrinting, setIsPrinting] = useState(false);

  const handlePrint = useReactToPrint({
    contentRef: ref,
    onPrintError: () => {
      setIsPrinting(false);
      toast.error('Failed to print receipt');
    },
    onAfterPrint: () => {
      setIsPrinting(false);
      toast.success('Receipt printed successfully');
    },
    pageStyle: `
      @media print {
        @page {
          size: 80mm 297mm;
          margin: 0;
        }
        body {
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
      }
    `,
  });

  const printWithLoading = () => {
    setIsPrinting(true);
    setTimeout(() => {
      handlePrint();
    }, 100);
  };

  return { handlePrint: printWithLoading, isPrinting };
};

// Optimized Receipt Modal component with enhanced configurability
export const ReceiptModal = memo(function ReceiptModal({ 
  isOpen, 
  onClose, 
  orderData,
  theme = { 
    colorScheme: 'default',
    primaryColor: 'emerald',
    animations: true
  },
  showPaymentProof = true,
  printEnabled = true,
  storeName = 'Champa Store',
  receiptBackgroundUrl = 'https://i.imgur.com/JNJ6mDD.png',
  receiptLogoUrl,
  logoUrl = 'https://i.imgur.com/ArKEQz1.png'
}: ReceiptModalProps) {
  const receiptRef = useRef<HTMLDivElement>(null);
  const { handlePrint, isPrinting } = usePrint(receiptRef);
  const [isImageViewerOpen, setIsImageViewerOpen] = useState(false);
  const [imageViewerUrl, setImageViewerUrl] = useState<string | null>(null);
  
  // Preload images
  useEffect(() => {
    if (isOpen) {
      const imagesToPreload = [
        receiptBackgroundUrl,
        receiptLogoUrl,
        logoUrl,
        orderData.payment_proof
      ].filter(Boolean);

      imagesToPreload.forEach(url => {
        if (url) {
          const img = new Image();
          img.src = url;
        }
      });
    }
  }, [isOpen, receiptBackgroundUrl, receiptLogoUrl, logoUrl, orderData.payment_proof]);

  const handleImageView = useCallback((url: string) => {
    setImageViewerUrl(url);
    setIsImageViewerOpen(true);
  }, []);

  const handleImageViewerClose = useCallback(() => {
    setIsImageViewerOpen(false);
    setImageViewerUrl(null);
  }, []);

  // Color scheme based on theme
  const colors = useMemo(() => {
    const primaryColor = theme.primaryColor || 'emerald';
    return {
      primary: {
        light: 'from-emerald-400 to-emerald-600',
        main: 'from-emerald-500 to-emerald-600',
        dark: 'from-emerald-600 to-emerald-700',
        solid: 'emerald-500',
        text: 'emerald-400',
        border: 'emerald-500',
        hover: 'emerald-600',
      },
      headerBg: `bg-gradient-to-br from-emerald-400 to-emerald-600`,
      confirmBg: `bg-${primaryColor}-100`,
      confirmText: `text-${primaryColor}-700`,
      accent: `text-${primaryColor}-500`,
      accentHover: `hover:text-${primaryColor}-400`,
    };
  }, [theme.primaryColor]);
  
  // Destructure orderData with default empty object for null/undefined cases
  const { 
    username = '', 
    platform = '', 
    rank = '', 
    price = 0, 
    orderId: order_id = '', 
    created_at: time = '', 
    payment_proof = '' 
  } = useMemo(() => orderData || {}, [orderData]);

  // Format date once when component renders
  const formattedTime = useMemo(() => {
    if (!time) return '';
    try {
      const date = new Date(time);
      return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        hour12: true
      });
    } catch (error) {
      console.error('Date formatting error:', error);
      return time; // Fallback to original string
    }
  }, [time]);

  // Generate receipt number only once
  const receiptNumber = useMemo(() => {
    return orderData.orderId || `CS-${Date.now().toString().slice(-8)}`;
  }, [orderData.orderId]);
  
  // Get payment proof URL if available, with error handling and caching
  const paymentProofUrl = useMemo(() => {
    if (!payment_proof || !showPaymentProof) return '';
    
    try {
      // If it's already a full URL, validate and use it directly
      if (payment_proof.startsWith('http')) {
        // Validate URL to prevent XSS via javascript: protocol
        const url = new URL(payment_proof);
        if (url.protocol !== 'http:' && url.protocol !== 'https:') {
          console.error('Invalid URL protocol:', url.protocol);
          return ''; // Return empty string to prevent loading malicious URLs
        }
        
        // Return the URL directly instead of using a proxy
        // This avoids CORS issues in most cases
        return payment_proof;
      }
      
      // Otherwise, construct the URL using the Supabase pattern with URL encoding
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://ymzksxrmsocggozepqsu.supabase.co';
      const encodedPath = encodeURIComponent(payment_proof);
      
      // Return the direct Supabase URL
      return `${supabaseUrl}/storage/v1/object/public/payment-proofs/${encodedPath}`;
    } catch (error) {
      console.error('Error constructing payment proof URL:', error);
      return ''; // Return empty string to prevent loading invalid URLs
    }
  }, [payment_proof, showPaymentProof]);
  
  // Enhanced animations with configurability
  useEffect(() => {
    if (!isOpen) {
      setIsImageViewerOpen(false);
      return;
    }
    
    if (!theme.animations) {
      // Skip animations if disabled
      setIsImageViewerOpen(true);
      return;
    }
  }, [isOpen, theme.animations]);

  // If modal is closed, don't render anything (performance optimization)
  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md mx-auto bg-gray-800 text-white border-gray-700 p-0">
        <div ref={receiptRef} className="relative bg-gray-800 min-h-[200px]">
          {/* Custom Receipt Background */}
          <div className="absolute inset-0 z-0 opacity-10">
            <img 
              src={receiptBackgroundUrl || "https://i.imgur.com/JNJ6mDD.png"} 
              alt="" 
              className="w-full h-full object-cover" 
              aria-hidden="true"
            />
          </div>
          
          {/* Semi-transparent overlay to ensure readability */}
          <div className="absolute inset-0 z-0 bg-white/90"></div>
          
          {/* Receipt Header with Logo */}
          <div className="text-center mb-6 border-b border-gray-200 pb-6 receipt-header relative z-10">
            <div className="absolute top-0 right-0 text-xs text-gray-500 bg-gray-100 py-1 px-2 rounded-md">
              #{receiptNumber}
            </div>
            <div className={`w-20 h-20 rounded-full mx-auto mb-3 shadow-lg overflow-hidden p-0.5 bg-white relative`}>
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-400 to-emerald-600 opacity-50"></div>
              <img 
                src={receiptLogoUrl || logoUrl || "https://i.imgur.com/ArKEQz1.png"} 
                alt="Store Logo" 
                className="w-full h-full rounded-full border-2 border-white relative z-10"
                width={64}
                height={64}
                loading="eager"
              />
            </div>
            <h2 id="receipt-title" className={`text-2xl font-bold text-${theme.primaryColor || 'emerald'}-600`}>
              {storeName}
            </h2>
            <div className="flex items-center justify-center gap-2 mt-1">
              <div className={`w-2 h-2 rounded-full bg-${theme.primaryColor || 'emerald'}-500`}></div>
              <p className="text-sm text-gray-600 font-medium tracking-wide uppercase">Official Receipt</p>
              <div className={`w-2 h-2 rounded-full bg-${theme.primaryColor || 'emerald'}-500`}></div>
            </div>
          </div>
          
          {/* Date and Transaction Details */}
          <div className="mb-5 bg-gray-50 p-4 rounded-lg border border-gray-100">
            <div className="flex justify-between items-center mb-2">
              <span className={`text-xs font-medium text-${theme.primaryColor || 'emerald'}-600 uppercase tracking-wider`}>Date</span>
              <span className="text-sm text-gray-700">{formattedTime}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className={`text-xs font-medium text-${theme.primaryColor || 'emerald'}-600 uppercase tracking-wider`}>Transaction ID</span>
              <span className="text-sm text-gray-700 font-mono">{receiptNumber}</span>
            </div>
          </div>
          
          {/* Customer Information */}
          <div className="mb-5">
            <h3 className={`text-sm font-semibold text-${theme.primaryColor || 'emerald'}-600 mb-3 pb-1 border-b border-gray-200`}>Customer Details</h3>
            <div className="flex flex-col gap-2">
              <div className="flex justify-between">
                <span className="text-xs text-gray-500">Username</span>
                <span className="text-sm font-medium text-gray-700">{username}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs text-gray-500">Platform</span>
                <span className="text-sm font-medium text-gray-700">
                  {platform === 'java' ? 'Java Edition' : 'Bedrock Edition'}
                </span>
              </div>
            </div>
          </div>
          
          {/* Purchase Information */}
          <div className="mb-6">
            <h3 className={`text-sm font-semibold text-${theme.primaryColor || 'emerald'}-600 mb-3 pb-1 border-b border-gray-200`}>Purchase Summary</h3>
            <div className="flex flex-col gap-2">
              <div className="flex justify-between">
                <span className="text-xs text-gray-500">Item</span>
                <span className="text-sm font-medium text-gray-700">{rank} Rank</span>
              </div>
              <div className="h-px bg-gray-100 my-2"></div>
              <div className="flex justify-between">
                <span className="text-sm font-semibold text-gray-700">Total Amount</span>
                <span className={`text-base font-bold text-${theme.primaryColor || 'emerald'}-600`}>${price.toFixed(2)}</span>
              </div>
            </div>
          </div>
          
          {/* Payment Confirmation */}
          <div className="text-center my-6 bg-gradient-to-r from-gray-50/80 to-white/80 py-4 px-3 rounded-lg border border-gray-100">
            <div className={`inline-flex items-center justify-center bg-${theme.primaryColor || 'emerald'}-100 text-${theme.primaryColor || 'emerald'}-700 py-1.5 px-4 rounded-full mb-3 shadow-sm`}>
              <Check size={16} className="mr-1.5" />
              <span className="text-sm font-medium">Payment Confirmed</span>
            </div>
            <p className="text-sm text-gray-600 mt-2">Thank you for your purchase!</p>
            <p className="text-xs text-gray-500 mt-1">Login to the server to claim your rank</p>
          </div>
          
          {/* Payment Proof Section - Only shown if available and enabled */}
          {showPaymentProof && payment_proof && paymentProofUrl && (
            <div className="mt-6 pt-5 border-t border-gray-200">
              <div className="flex items-center justify-between mb-3">
                <h4 className={`text-sm font-semibold text-${theme.primaryColor || 'emerald'}-600`}>Payment Proof</h4>
                <button 
                  onClick={() => handleImageView(paymentProofUrl)}
                  className={`text-xs bg-${theme.primaryColor || 'emerald'}-50 text-${theme.primaryColor || 'emerald'}-600 hover:text-${theme.primaryColor || 'emerald'}-700 flex items-center gap-1 py-1 px-3 rounded-full transition-colors duration-200 hover:bg-${theme.primaryColor || 'emerald'}-100 focus:outline-none focus:ring-2 focus:ring-${theme.primaryColor || 'emerald'}-500 focus:ring-opacity-50`}
                >
                  <Eye size={14} />
                  View Full Image
                </button>
              </div>
              <div 
                className="bg-gray-50 rounded-lg p-2 cursor-pointer overflow-hidden shadow-md hover:shadow-lg transition-shadow duration-300 border border-gray-100"
                onClick={() => handleImageView(paymentProofUrl)}
              >
                <img 
                  src={paymentProofUrl} 
                  alt="Payment Proof" 
                  className={`w-full h-auto object-contain max-h-[150px] rounded-md ${theme.animations ? 'transition-all duration-300 hover:scale-[1.02]' : ''}`}
                  loading="lazy"
                  referrerPolicy="no-referrer"
                  crossOrigin="anonymous"
                  onError={(e) => {
                    console.error("Failed to load image:", paymentProofUrl);
                    (e.target as HTMLImageElement).onerror = null;
                    (e.target as HTMLImageElement).src = 'https://i.imgur.com/JzDJS2A.png'; // Placeholder for failed image
                  }}
                />
              </div>
            </div>
          )}
          
          {/* Footer with Terms and Support Info */}
          <div className="mt-8 pt-4 border-t border-gray-200 text-center text-xs text-gray-500">
            <p>For support, please contact us on Discord</p>
            <p className="mt-1">All purchases are final and non-refundable</p>
            <div className={`w-8 h-1 bg-${theme.primaryColor || 'emerald'}-500 mx-auto mt-3 rounded-full opacity-50`}></div>
          </div>
        </div>
        
        <div className="p-4 border-t border-gray-700 flex justify-between items-center">
          {printEnabled && (
            <Button
              onClick={() => handlePrint()}
              disabled={isPrinting}
              className="flex items-center gap-2"
            >
              <Printer size={16} />
              {isPrinting ? 'Preparing...' : 'Print Receipt'}
            </Button>
          )}
          <Button variant="ghost" onClick={onClose}>Close</Button>
        </div>
      </DialogContent>

      {/* Image viewer */}
      {isImageViewerOpen && imageViewerUrl && (
        <Suspense fallback={<FallbackImageViewer onClose={handleImageViewerClose} imageUrl={imageViewerUrl} />}>
          <ImageViewer
            onClose={handleImageViewerClose}
            imageUrl={imageViewerUrl}
            alt={`Payment proof for order ${orderData.orderId || ''}`}
          />
        </Suspense>
      )}
    </Dialog>
  );
});