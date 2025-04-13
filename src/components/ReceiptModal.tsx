import React, { useRef, useCallback, memo, useState, useEffect } from 'react';
import { X, Download, Check, User, CreditCard, Copy, ExternalLink } from 'lucide-react';
import { useReactToPrint } from 'react-to-print';

interface ReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderData: {
    username: string;
    platform: string;
    rank: string;
    price: number;
    created_at: string;
    orderId?: string;
  };
}

// Helper component for receipt detail row
const DetailRow = memo(({ label, value, highlighted = false }: { 
  label: string; 
  value: string | React.ReactNode;
  highlighted?: boolean;
}) => (
  <div className="flex items-center justify-between text-gray-800 mb-2">
    <span className="text-sm text-gray-600">{label}:</span>
    <span className={`font-medium ${highlighted ? 'text-emerald-600' : ''}`}>{value}</span>
  </div>
));

// Optimized Receipt Modal component
export function ReceiptModal({ isOpen, onClose, orderData }: ReceiptModalProps) {
  const receiptRef = useRef<HTMLDivElement>(null);
  const [copySuccess, setCopySuccess] = useState<boolean>(false);
  const [fadeIn, setFadeIn] = useState<boolean>(false);
  
  // Format date once when component renders
  const formattedDate = useCallback(() => {
    const orderDate = new Date(orderData.created_at);
    return orderDate.toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }, [orderData.created_at]);

  // Generate receipt number only once
  const receiptNumber = useCallback(() => {
    return orderData.orderId || `CS-${Date.now().toString().slice(-8)}`;
  }, [orderData.orderId]);
  
  // Custom print function that doesn't rely on useReactToPrint
  const handlePrintReceipt = useCallback(() => {
    if (!receiptRef.current) return;
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Please allow popups for this website to print receipts');
      return;
    }
    
    const receiptContent = receiptRef.current.innerHTML;
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>ChampaStore Receipt - ${orderData.username}</title>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
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
            window.onload = function() { window.print(); setTimeout(function() { window.close(); }, 500); };
          </script>
        </body>
      </html>
    `);
    
    printWindow.document.close();
  }, [orderData.username]);

  // Copy server information to clipboard
  const copyServerInfo = useCallback(() => {
    navigator.clipboard.writeText('champamc.store').then(() => {
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    });
  }, []);

  // Close modal on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    
    if (isOpen) {
      window.addEventListener('keydown', handleEscape);
      // Animate in
      setTimeout(() => setFadeIn(true), 10);
    }
    
    return () => {
      window.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);
  
  if (!isOpen) return null;

  return (
    <div 
      className={`fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4 overflow-hidden transition-opacity duration-300 ${fadeIn ? 'opacity-100' : 'opacity-0'}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="receipt-title"
    >
      <div 
        className="bg-gray-800/95 rounded-2xl p-4 sm:p-6 md:p-8 w-full max-w-lg m-2 sm:m-4 relative max-h-[90vh] overflow-y-auto transform transition-transform duration-300 ease-out"
        style={{ 
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          transform: fadeIn ? 'translateY(0)' : 'translateY(20px)'
        }}
      >
        <button
          onClick={onClose}
          className="absolute right-3 top-3 sm:right-4 sm:top-4 text-gray-400 hover:text-white transition-colors"
          aria-label="Close receipt"
        >
          <X size={24} />
        </button>

        {/* Receipt Content - Printable Area */}
        <div 
          ref={receiptRef} 
          className="bg-white text-gray-900 rounded-lg p-5 mb-4 print:shadow-none"
          aria-labelledby="receipt-title"
        >
          <div className="text-center mb-4 border-b border-gray-200 pb-4 receipt-header">
            <img 
              src="https://i.imgur.com/ArKEQz1.png" 
              alt="Champa Logo" 
              className="w-16 h-16 mx-auto mb-2 rounded-full border-2 border-emerald-500 logo"
              width={64}
              height={64}
            />
            <h2 id="receipt-title" className="text-2xl font-bold text-emerald-600">Champa Store</h2>
            <p className="text-sm text-gray-600">Purchase Receipt</p>
          </div>
          
          <div className="mb-4 pb-4 border-b border-gray-200">
            <DetailRow label="Receipt ID" value={receiptNumber()} />
            <DetailRow label="Date" value={formattedDate()} />
          </div>
          
          <div className="mb-4 pb-4 border-b border-gray-200">
            <h3 className="font-medium mb-3 flex items-center">
              <User size={16} className="mr-2 text-emerald-500" />
              Customer Details
            </h3>
            <DetailRow label="Minecraft Username" value={orderData.username} />
            <DetailRow label="Platform" value={<span className="capitalize">{orderData.platform}</span>} />
          </div>
          
          <div className="mb-4 pb-4 border-b border-gray-200">
            <h3 className="font-medium mb-3 flex items-center">
              <CreditCard size={16} className="mr-2 text-emerald-500" />
              Purchase Details
            </h3>
            <DetailRow label="Item" value={`${orderData.rank} Rank`} />
            <DetailRow label="Price" value={`$${orderData.price.toFixed(2)}`} highlighted />
          </div>
          
          <div className="text-center mt-6">
            <div className="inline-flex items-center justify-center bg-emerald-100 text-emerald-700 py-1 px-3 rounded-full mb-4">
              <Check size={16} className="mr-1" />
              <span className="text-sm font-medium">Payment Confirmed</span>
            </div>
            <p className="text-sm text-gray-600 mt-2">Thank you for your purchase!</p>
            <p className="text-xs text-gray-500 mt-1">Login to the server to claim your rank</p>
            
            <div className="mt-5 border border-gray-200 rounded-lg p-3 bg-gray-50 no-print">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Connect to our server</h4>
              <div className="flex items-center justify-center gap-2 font-mono text-xs text-center text-gray-700">
                <span className="py-1 px-2 bg-gray-100 rounded">champamc.store</span>
                <button 
                  onClick={copyServerInfo} 
                  className="p-1 text-gray-500 hover:text-emerald-600 transition-colors"
                  aria-label="Copy server address"
                  title="Copy server address"
                >
                  <Copy size={14} />
                </button>
                <a 
                  href="https://champamc.store" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="p-1 text-gray-500 hover:text-emerald-600 transition-colors"
                  aria-label="Open website"
                  title="Open website"
                >
                  <ExternalLink size={14} />
                </a>
              </div>
              {copySuccess && (
                <div className="text-xs text-emerald-600 mt-1 text-center">
                  Copied to clipboard!
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 mt-4">
          <button
            onClick={handlePrintReceipt}
            className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg py-2 px-4 transition duration-300 flex items-center justify-center gap-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300"
          >
            <Download size={16} />
            Save Receipt
          </button>
          <button
            onClick={onClose}
            className="flex-1 bg-gray-600 hover:bg-gray-700 text-white rounded-lg py-2 px-4 transition duration-300 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
} 