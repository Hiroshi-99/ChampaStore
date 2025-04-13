import React, { useRef } from 'react';
import { X, Download, Check, User, CreditCard } from 'lucide-react';
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

export function ReceiptModal({ isOpen, onClose, orderData }: ReceiptModalProps) {
  const receiptRef = useRef<HTMLDivElement>(null);
  
  // Work around typing issues by using a direct approach
  const handlePrintReceipt = () => {
    // Modern browser print function with custom options
    if (window) {
      const printContents = receiptRef.current?.innerHTML;
      const originalContents = document.body.innerHTML;
      
      if (printContents) {
        document.body.innerHTML = `
          <html>
            <head>
              <title>ChampaStore Receipt - ${orderData.username}</title>
              <style>
                body { font-family: Arial, sans-serif; padding: 20px; }
                .container { max-width: 800px; margin: 0 auto; }
              </style>
            </head>
            <body>
              <div class="container">${printContents}</div>
            </body>
          </html>
        `;
        
        window.print();
        document.body.innerHTML = originalContents;
        // Reload page components after printing
        window.location.reload();
      }
    }
  };

  if (!isOpen) return null;
  
  // Format the date for better readability
  const orderDate = new Date(orderData.created_at);
  const formattedDate = orderDate.toLocaleString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  // Generate a receipt number based on timestamp if orderId not available
  const receiptNumber = orderData.orderId || `CS-${Date.now().toString().slice(-8)}`;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4 overflow-hidden">
      <div className="bg-gray-800/95 rounded-2xl p-4 sm:p-6 md:p-8 w-full max-w-lg m-2 sm:m-4 relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute right-3 top-3 sm:right-4 sm:top-4 text-gray-400 hover:text-white transition-colors"
          aria-label="Close receipt"
        >
          <X size={24} />
        </button>

        {/* Receipt Content - Printable Area */}
        <div ref={receiptRef} className="bg-white text-gray-900 rounded-lg p-5 mb-4 print:shadow-none">
          <div className="text-center mb-4 border-b border-gray-200 pb-4">
            <h2 className="text-2xl font-bold text-emerald-600">Champa Store</h2>
            <p className="text-sm text-gray-600">Purchase Receipt</p>
          </div>
          
          <div className="mb-4 pb-4 border-b border-gray-200">
            <div className="flex items-center justify-between text-gray-800">
              <span className="text-sm text-gray-600">Receipt ID:</span>
              <span className="font-medium">{receiptNumber}</span>
            </div>
            <div className="flex items-center justify-between text-gray-800 mt-2">
              <span className="text-sm text-gray-600">Date:</span>
              <span className="font-medium">{formattedDate}</span>
            </div>
          </div>
          
          <div className="mb-4 pb-4 border-b border-gray-200">
            <h3 className="font-medium mb-3 flex items-center">
              <User size={16} className="mr-2 text-emerald-500" />
              Customer Details
            </h3>
            <div className="flex items-center justify-between text-gray-800 mb-2">
              <span className="text-sm text-gray-600">Minecraft Username:</span>
              <span className="font-medium">{orderData.username}</span>
            </div>
            <div className="flex items-center justify-between text-gray-800 mb-2">
              <span className="text-sm text-gray-600">Platform:</span>
              <span className="font-medium capitalize">{orderData.platform}</span>
            </div>
          </div>
          
          <div className="mb-4 pb-4 border-b border-gray-200">
            <h3 className="font-medium mb-3 flex items-center">
              <CreditCard size={16} className="mr-2 text-emerald-500" />
              Purchase Details
            </h3>
            <div className="flex items-center justify-between text-gray-800 mb-2">
              <span className="text-sm text-gray-600">Item:</span>
              <span className="font-medium">{orderData.rank} Rank</span>
            </div>
            <div className="flex items-center justify-between text-gray-800">
              <span className="text-sm text-gray-600">Price:</span>
              <span className="font-semibold text-emerald-600">${orderData.price.toFixed(2)}</span>
            </div>
          </div>
          
          <div className="text-center mt-6">
            <div className="inline-flex items-center justify-center bg-emerald-100 text-emerald-700 py-1 px-3 rounded-full mb-4">
              <Check size={16} className="mr-1" />
              <span className="text-sm font-medium">Payment Confirmed</span>
            </div>
            <p className="text-sm text-gray-600 mt-2">Thank you for your purchase!</p>
            <p className="text-xs text-gray-500 mt-1">Login to the server to claim your rank</p>
            <div className="mt-4 font-mono text-xs text-center text-gray-500">
              <p>server.champastore.com</p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 mt-4">
          <button
            onClick={handlePrintReceipt}
            className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg py-2 px-4 transition duration-300 flex items-center justify-center gap-2 text-sm"
          >
            <Download size={16} />
            Save Receipt
          </button>
          <button
            onClick={onClose}
            className="flex-1 bg-gray-600 hover:bg-gray-700 text-white rounded-lg py-2 px-4 transition duration-300 text-sm"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
} 