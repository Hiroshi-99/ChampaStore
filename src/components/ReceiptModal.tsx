import React, { useRef, useCallback, memo, useState, useEffect, useMemo } from 'react';
import { X, Check, User, CreditCard, ImageIcon, ZoomIn, Eye, Shield, Printer } from 'lucide-react';
import { useReactToPrint } from 'react-to-print';
import toast from 'react-hot-toast';
import { Dialog, DialogContent, DialogTitle } from "../ui/dialog";
import * as VisuallyHidden from '@radix-ui/react-visually-hidden';
import { Button } from "../ui/button";
import { sanitizeInput } from '../utils/sanitize';

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

// Memoized payment proof component
const PaymentProofPreview = memo(({ imageUrl }: { imageUrl: string }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);
  const [isZoomed, setIsZoomed] = useState(false);

  const handleLoad = useCallback(() => {
    setIsLoading(false);
  }, []);

  const handleError = useCallback(() => {
    setIsLoading(false);
    setError(true);
  }, []);

  const toggleZoom = useCallback(() => {
    setIsZoomed(prev => !prev);
  }, []);

  if (!imageUrl) return null;

  return (
    <div className="mt-4 pt-4 border-t border-gray-700">
      <div className="flex items-center justify-between">
        <div className="text-xs text-gray-500 mb-2">Payment Proof</div>
        {!error && !isLoading && (
          <button 
            onClick={toggleZoom} 
            className="text-xs text-emerald-500 hover:text-emerald-400 flex items-center gap-1"
            title={isZoomed ? "Close preview" : "View larger image"}
          >
            {isZoomed ? <X size={14} /> : <ZoomIn size={14} />}
            {isZoomed ? "Close" : "Enlarge"}
          </button>
        )}
      </div>
      <div className={`relative bg-gray-900/50 rounded-lg overflow-hidden ${isZoomed ? 'cursor-zoom-out' : 'cursor-zoom-in'}`} onClick={!error && !isLoading ? toggleZoom : undefined}>
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-800/50">
            <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}
        {error ? (
          <div className="p-4 text-sm text-gray-400 text-center">
            <ImageIcon className="mx-auto mb-2 opacity-50" size={24} />
            Could not load payment proof image
          </div>
        ) : (
          <img 
            src={imageUrl} 
            alt="Payment Proof" 
            className={`w-full h-auto object-contain transition-all duration-300 ${isZoomed ? 'max-h-[400px]' : 'max-h-[200px]'}`}
            onLoad={handleLoad}
            onError={handleError}
          />
        )}
      </div>
      
      {/* Fullscreen modal for zoomed image */}
      {isZoomed && !error && !isLoading && (
        <div 
          className="fixed inset-0 bg-black/90 z-[60] flex items-center justify-center p-4"
          onClick={toggleZoom}
        >
          <button 
            onClick={toggleZoom}
            className="absolute top-4 right-4 bg-gray-800/70 hover:bg-gray-700 p-2 rounded-full text-white"
            aria-label="Close preview"
          >
            <X size={20} />
          </button>
          <img 
            src={imageUrl} 
            alt="Payment Proof" 
            className="max-w-full max-h-[90vh] object-contain"
          />
        </div>
      )}
    </div>
  );
});

// Optimized Receipt Modal component
export function ReceiptModal({ isOpen, onClose, orderData }: ReceiptModalProps) {
  const receiptRef = useRef<HTMLDivElement>(null);
  const [fadeIn, setFadeIn] = useState<boolean>(false);
  const [animateComplete, setAnimateComplete] = useState<boolean>(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [isImageViewerOpen, setIsImageViewerOpen] = useState(false);
  
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
    const date = new Date(time);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      hour12: true
    });
  }, [time]);

  // Generate receipt number only once
  const receiptNumber = useMemo(() => {
    return orderData.orderId || `CS-${Date.now().toString().slice(-8)}`;
  }, [orderData.orderId]);
  
  // Get payment proof URL if available
  const paymentProofUrl = useMemo(() => {
    if (!payment_proof) return '';
    
    try {
      // If it's already a full URL, validate and use it directly
      if (payment_proof.startsWith('http')) {
        // Validate URL to prevent XSS via javascript: protocol
        const url = new URL(payment_proof);
        if (url.protocol !== 'http:' && url.protocol !== 'https:') {
          console.error('Invalid URL protocol:', url.protocol);
          return ''; // Return empty string to prevent loading malicious URLs
        }
        
        // Handle CSP restrictions by proxying through our server or converting to data URL
        // Option 1: Proxy through Netlify function
        return `/.netlify/functions/image-proxy?url=${encodeURIComponent(payment_proof)}`;
        
        // Option 2: Or convert to Imgur URL if it's from Supabase
        // This is a fallback approach - replace with your actual Imgur image
        // if (payment_proof.includes('supabase.co')) {
        //   return 'https://i.imgur.com/JzDJS2A.png'; // Default fallback image
        // }
        
        // return payment_proof;
      }
      
      // Otherwise, construct the URL using the Supabase pattern with URL encoding
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://ymzksxrmsocggozepqsu.supabase.co';
      const encodedPath = encodeURIComponent(payment_proof);
      
      // Use the proxy for Supabase URLs as well
      return `/.netlify/functions/image-proxy?url=${encodeURIComponent(`${supabaseUrl}/storage/v1/object/public/payment-proofs/${encodedPath}`)}`;
      
    } catch (error) {
      console.error('Error constructing payment proof URL:', error);
      return ''; // Return empty string to prevent loading invalid URLs
    }
  }, [payment_proof]);
  
  // Ensure payment proof URL is valid for display
  useEffect(() => {
    if (paymentProofUrl && isOpen) {
      // Preload the image to check if it's valid
      const img = new Image();
      img.src = paymentProofUrl;
    }
  }, [paymentProofUrl, isOpen]);
  
  // Enhanced entry animation
  useEffect(() => {
    if (isOpen) {
      // Delay fade-in for smoother entry 
      const timer = setTimeout(() => setFadeIn(true), 50);
      // Add completion animation after fade-in
      const completeTimer = setTimeout(() => setAnimateComplete(true), 400);
      
      return () => {
        clearTimeout(timer);
        clearTimeout(completeTimer);
      };
    } else {
      setFadeIn(false);
      setAnimateComplete(false);
      // Reset image viewer state when modal closes
      setIsImageViewerOpen(false);
    }
  }, [isOpen]);

  // Custom print function with security enhancements
  const handlePrintReceipt = useCallback(() => {
    if (!receiptRef.current) return;
    
    try {
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        toast.error('Please allow popups for this website to print receipts');
        return;
      }
      
      // Sanitize content for the print window
      const sanitizedUsername = sanitizeInput(username);
      const receiptContent = receiptRef.current.innerHTML;
      
      // Apply Content-Security-Policy to the printed document
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>ChampaStore Receipt - ${sanitizedUsername}</title>
            <meta charset="utf-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1" />
            <meta http-equiv="Content-Security-Policy" content="default-src 'self'; img-src 'self' https: data:; style-src 'unsafe-inline';">
            <style>
              body {
                font-family: 'Helvetica', 'Arial', sans-serif;
                padding: 20px;
                max-width: 800px;
                margin: 0 auto;
                color: #333;
              }
              .container {
                padding: 20px;
                border-radius: 8px;
                border: 1px solid #e2e8f0;
              }
              .text-emerald-600 { color: #059669; }
              .text-emerald-500 { color: #10b981; }
              .receipt-header {
                text-align: center;
                border-bottom: 1px solid #e2e8f0;
                padding-bottom: 15px;
                margin-bottom: 15px;
              }
              .logo {
                width: 64px;
                height: 64px;
                margin: 0 auto 10px;
                display: block;
                border-radius: 50%;
                border: 2px solid #10b981;
              }
              h2 { margin: 5px 0; color: #059669; }
              @media print {
                body { 
                  -webkit-print-color-adjust: exact;
                  print-color-adjust: exact;
                }
                .no-print { display: none; }
              }
            </style>
          </head>
          <body>
            <div class="container">
              ${receiptContent}
            </div>
            <script>
              window.onload = function() { 
                try {
                  window.print(); 
                  setTimeout(function() { window.close(); }, 500);
                } catch(e) {
                  console.error('Print error:', e);
                }
              };
            </script>
          </body>
        </html>
      `);
      
      printWindow.document.close();
    } catch (error) {
      console.error('Print window error:', error);
      toast.error('Failed to open print window');
    }
  }, [username]);

  // Close modal on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isImageViewerOpen) {
          setIsImageViewerOpen(false);
        } else {
          onClose();
        }
      }
    };
    
    if (isOpen) {
      window.addEventListener('keydown', handleEscape);
      // Animate in
      setTimeout(() => setFadeIn(true), 10);
    }
    
    return () => {
      window.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose, isImageViewerOpen]);
  
  // Handle print functionality
  const handlePrint = useCallback(() => {
    if (!receiptRef.current) return;
    
    setIsPrinting(true);
    
    // Add print styling specific class
    document.body.classList.add('printing-receipt');
    
    try {
      const printContent = receiptRef.current.innerHTML;
      const printWindow = window.open('', '_blank');
      
      if (!printWindow) {
        throw new Error('Could not open print window');
      }
      
      printWindow.document.write(`
        <html>
          <head>
            <title>Receipt #${order_id}</title>
            <style>
              body { 
                font-family: system-ui, -apple-system, sans-serif;
                background: white;
                color: black;
                padding: 2rem;
                max-width: 800px;
                margin: 0 auto;
              }
              .receipt-header {
                text-align: center;
                margin-bottom: 1.5rem;
                border-bottom: 1px solid #ccc;
                padding-bottom: 1rem;
              }
              .receipt-row {
                display: flex;
                justify-content: space-between;
                margin-bottom: 0.5rem;
                padding: 0.25rem 0;
              }
              .receipt-row:not(:last-child) {
                border-bottom: 1px dashed #eee;
              }
              img { max-width: 100%; max-height: 300px; }
              .payment-proof { margin-top: 2rem; border-top: 1px solid #ccc; padding-top: 1rem; }
              .payment-proof-title { font-size: 0.875rem; color: #555; margin-bottom: 0.5rem; }
              @media print {
                body { padding: 0; }
                button { display: none; }
              }
            </style>
          </head>
          <body>
            <div class="receipt-content">
              ${printContent}
            </div>
            <script>
              window.onload = function() { window.print(); setTimeout(function() { window.close(); }, 500); };
            </script>
          </body>
        </html>
      `);
    } catch (error) {
      console.error('Print error:', error);
    } finally {
      // Cleanup
      document.body.classList.remove('printing-receipt');
      setIsPrinting(false);
    }
  }, [order_id, receiptRef]);

  // Open payment proof in full image viewer
  const openImageViewer = useCallback(() => {
    if (paymentProofUrl) {
      setIsImageViewerOpen(true);
    }
  }, [paymentProofUrl]);

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open: boolean) => !open && onClose()}>
      <DialogContent 
        className={`bg-gray-800/95 p-4 sm:p-6 md:p-8 w-full max-w-lg max-h-[90vh] overflow-y-auto border border-gray-700 shadow-xl transform transition-all duration-500 ${fadeIn ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
        aria-describedby="receipt-description"
      >
        <DialogTitle>
          <VisuallyHidden.Root>Purchase Receipt</VisuallyHidden.Root>
        </DialogTitle>
        
        <p id="receipt-description" className="sr-only">
          Your purchase receipt for {rank} rank on Champa Store
        </p>
      
        <button
          onClick={onClose}
          className="absolute right-3 top-3 sm:right-4 sm:top-4 text-gray-400 hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-opacity-50 rounded-full p-1"
          aria-label="Close receipt"
        >
          <X size={24} />
        </button>

        {/* Success animation that plays on load */}
        <div className={`absolute inset-0 bg-emerald-500/20 flex items-center justify-center transition-opacity duration-500 ${animateComplete ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
          <div className="w-20 h-20 rounded-full bg-emerald-500/30 flex items-center justify-center animate-ping">
            <Check size={40} className="text-emerald-500" />
          </div>
        </div>

        {/* Receipt Content - Printable Area */}
        <div 
          ref={receiptRef} 
          className={`bg-white text-gray-900 rounded-xl p-5 mb-4 print:shadow-none transition-all duration-500 ${animateComplete ? 'shadow-lg' : 'shadow-sm'}`}
          aria-labelledby="receipt-title"
        >
          <div className="text-center mb-4 border-b border-gray-200 pb-4 receipt-header">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 p-0.5 mx-auto mb-2 shadow-lg">
              <img 
                src="https://i.imgur.com/ArKEQz1.png" 
                alt="Champa Logo" 
                className="w-full h-full rounded-full border-2 border-white"
                width={64}
                height={64}
              />
            </div>
            <h2 id="receipt-title" className="text-2xl font-bold text-emerald-600">Champa Store</h2>
            <p className="text-sm text-gray-600">Purchase Receipt</p>
          </div>
          
          <div className="mb-4 pb-4 border-b border-gray-200">
            <ReceiptDetailRow
              label="Receipt ID"
              value={receiptNumber}
              icon={<User size={16} />}
            />
            <ReceiptDetailRow
              label="Date"
              value={formattedTime}
              icon={<User size={16} />}
            />
          </div>
          
          <div className="mb-4 pb-4 border-b border-gray-200">
            <ReceiptDetailRow
              label="Customer"
              value={username}
              icon={<User size={16} />}
            />
            <ReceiptDetailRow
              label="Platform"
              value={platform === 'java' ? 'Java Edition' : 'Bedrock Edition'}
              icon={<Shield size={16} />}
            />
          </div>
          
          <div className="mb-4 pb-4 border-b border-gray-200">
            <ReceiptDetailRow
              label="Purchase"
              value={`${rank} Rank`}
              icon={<CreditCard size={16} />}
            />
            <ReceiptDetailRow
              label="Amount"
              value={`$${price.toFixed(2)}`}
              icon={<CreditCard size={16} />}
              isHighlighted
            />
          </div>
          
          <div className="text-center mt-6">
            <div className="inline-flex items-center justify-center bg-emerald-100 text-emerald-700 py-1 px-3 rounded-full mb-4 shadow-sm">
              <Check size={16} className="mr-1" />
              <span className="text-sm font-medium">Payment Confirmed</span>
            </div>
            <p className="text-sm text-gray-600 mt-2">Thank you for your purchase!</p>
            <p className="text-xs text-gray-500 mt-1">Login to the server to claim your rank</p>
          </div>
          
          {/* Payment Proof Section - Only shown if available */}
          {payment_proof && paymentProofUrl && (
            <div className="mt-6 pt-4 border-t border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-medium text-gray-700">Payment Proof</h4>
                <button 
                  onClick={openImageViewer}
                  className="text-xs text-emerald-600 hover:text-emerald-700 flex items-center gap-1 transition-colors duration-200 hover:underline focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-opacity-50 rounded px-1"
                >
                  <Eye size={14} />
                  View
                </button>
              </div>
              <div 
                className="bg-gray-50 rounded-lg p-1 cursor-pointer overflow-hidden shadow-md hover:shadow-lg transition-shadow duration-300 border border-gray-100"
                onClick={openImageViewer}
              >
                <img 
                  src={paymentProofUrl} 
                  alt="Payment Proof" 
                  className="w-full h-auto object-contain max-h-[150px] rounded transition-transform duration-300 hover:scale-[1.02]"
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
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 mt-4">
          <Button
            onClick={handlePrint}
            disabled={isPrinting}
            className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white active:scale-95 transform transition-all duration-200 shadow-md hover:shadow-lg disabled:shadow-none"
            variant="default"
          >
            <Printer size={16} className="mr-2" />
            {isPrinting ? (
              <span className="flex items-center">
                <svg className="animate-spin -ml-1 mr-1 h-3 w-3 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Printing...
              </span>
            ) : 'Print Receipt'}
          </Button>
          <Button
            onClick={onClose}
            className="flex-1 active:scale-95 transform transition-all duration-200 hover:bg-gray-700/30"
            variant="outline"
          >
            Close
          </Button>
        </div>

        {/* Full Screen Image Viewer */}
        {isImageViewerOpen && paymentProofUrl && (
          <div 
            className="fixed inset-0 bg-black/90 z-[60] flex items-center justify-center p-4 animate-fadeIn"
            onClick={() => setIsImageViewerOpen(false)}
          >
            <button 
              onClick={(e) => {
                e.stopPropagation(); // Prevent double-handling
                setIsImageViewerOpen(false);
              }}
              className="absolute right-4 top-4 bg-gray-800/70 hover:bg-gray-700 p-2 rounded-full text-white transition-colors duration-200 shadow-lg hover:rotate-90 transform"
              aria-label="Close preview"
            >
              <X size={20} />
            </button>
            
            <div className="relative max-w-full max-h-[90vh]">
              <img 
                src={paymentProofUrl} 
                alt="Payment Proof" 
                className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl animate-zoomIn"
                referrerPolicy="no-referrer"
                crossOrigin="anonymous"
                onError={(e) => {
                  console.error("Failed to load image:", paymentProofUrl);
                  (e.target as HTMLImageElement).onerror = null;
                  (e.target as HTMLImageElement).src = 'https://i.imgur.com/JzDJS2A.png'; // Placeholder for failed image
                }}
              />
              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/60 text-white text-xs px-3 py-1 rounded-full">
                Click anywhere to close
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
} 