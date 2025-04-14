import React, { useState, useEffect, useMemo, useCallback, memo } from 'react';
import { X, Upload, Info, CreditCard, User, Shield, Check } from 'lucide-react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import { sanitizeInput, sanitizeDiscordContent } from '../utils/sanitize';
import { Dialog, DialogContent, DialogTitle } from "../ui/dialog";
import * as VisuallyHidden from '@radix-ui/react-visually-hidden';
import { ReceiptModal } from './ReceiptModal';

interface OrderModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface RankOption {
  name: string;
  price: number;
  color: string;
  image: string;
}

const RANKS: RankOption[] = [
  { 
    name: 'VIP', 
    price: 5, 
    color: 'from-emerald-500 to-emerald-600',
    image: 'https://i.imgur.com/NX3RB4i.png'
  },
  { 
    name: 'MVP', 
    price: 10, 
    color: 'from-blue-500 to-blue-600',
    image: 'https://i.imgur.com/gmlFpV2.png'
  },
  { 
    name: 'MVP+', 
    price: 15, 
    color: 'from-purple-500 to-purple-600',
    image: 'https://i.imgur.com/C4VE5b0.png'
  },
  { 
    name: 'LEGEND', 
    price: 20, 
    color: 'from-yellow-500 to-yellow-600',
    image: 'https://i.imgur.com/fiqqcOY.png'
  },
  { 
    name: 'DEVIL', 
    price: 25, 
    color: 'from-red-500 to-red-600',
    image: 'https://i.imgur.com/z0zBiyZ.png'
  },
  { 
    name: 'INFINITY', 
    price: 30, 
    color: 'from-pink-500 to-pink-600',
    image: 'https://i.imgur.com/SW6dtYW.png'
  },
  { 
    name: 'CHAMPA', 
    price: 50, 
    color: 'from-orange-500 to-orange-600',
    image: 'https://i.imgur.com/5xEinAj.png'
  }
];

// Rate limiting configuration
const RATE_LIMIT_DURATION = 60 * 1000; // 1 minute
const MAX_ATTEMPTS = 3;
const rateLimitStore = new Map<string, { attempts: number; timestamp: number; blocked: boolean }>();

// Memoized platform button component
const PlatformButton = memo(({ 
  label, 
  isSelected, 
  onClick 
}: { 
  label: 'java' | 'bedrock'; 
  isSelected: boolean; 
  onClick: () => void;
}) => (
  <button
    type="button"
    onClick={onClick}
    className={`flex-1 py-2 px-3 sm:px-4 rounded-lg border transition-colors text-sm sm:text-base ${
      isSelected
        ? 'bg-emerald-500 text-white border-emerald-600'
        : 'bg-gray-700/50 text-gray-300 border-gray-600 hover:bg-gray-600/50'
    }`}
  >
    {label.charAt(0).toUpperCase() + label.slice(1)}
  </button>
));

// Memoized rank button component
const RankButton = memo(({ 
  rank, 
  isSelected, 
  onClick 
}: { 
  rank: RankOption; 
  isSelected: boolean; 
  onClick: () => void;
}) => (
  <button
    type="button"
    onClick={onClick}
    className={`py-2 sm:py-3 px-2 sm:px-3 rounded-lg border transition-all transform hover:scale-[1.02] text-sm ${
      isSelected
        ? `bg-gradient-to-r ${rank.color} text-white border-transparent`
        : 'bg-gray-700/50 text-gray-300 border-gray-600 hover:bg-gray-600/50'
    }`}
  >
    <div className="font-medium truncate">{rank.name}</div>
    <div className="text-xs sm:text-sm">${rank.price}</div>
  </button>
));

export default function OrderModal({ isOpen, onClose }: OrderModalProps) {
  const [username, setUsername] = useState('');
  const [platform, setPlatform] = useState<'java' | 'bedrock'>('java');
  const [selectedRank, setSelectedRank] = useState<string>('VIP');
  const [paymentProof, setPaymentProof] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingStage, setLoadingStage] = useState<'uploading' | 'processing' | 'finalizing' | null>(null);
  const [showReceipt, setShowReceipt] = useState(false);
  const [receiptData, setReceiptData] = useState<any>(null);
  const [orderComplete, setOrderComplete] = useState(false);

  // Form steps for guided flow
  const [formStep, setFormStep] = useState<'info' | 'payment' | 'confirmation'>('info');

  // If order complete and receipt is showing, hide the order form
  const showOrderForm = isOpen && !(orderComplete && showReceipt);

  // Memoize the selected rank option to avoid re-calculations
  const selectedRankOption = useMemo(() => 
    RANKS.find(rank => rank.name === selectedRank), 
    [selectedRank]
  );
  
  const selectedRankPrice = selectedRankOption?.price || 0;

  // Reset states when modal is closed
  useEffect(() => {
    if (!isOpen) {
      // Small delay to ensure animations complete before resetting
      const timeout = setTimeout(() => {
        setOrderComplete(false);
        setShowReceipt(false);
        setReceiptData(null);
      }, 300);
      
      return () => clearTimeout(timeout);
    }
  }, [isOpen]);

  // Check rate limit
  const checkRateLimit = useCallback((identifier: string): boolean => {
    const now = Date.now();
    const userRateLimit = rateLimitStore.get(identifier);

    // If user is blocked, deny immediately
    if (userRateLimit?.blocked) {
      return false;
    }

    if (!userRateLimit) {
      rateLimitStore.set(identifier, { attempts: 1, timestamp: now, blocked: false });
      return true;
    }

    if (now - userRateLimit.timestamp > RATE_LIMIT_DURATION) {
      rateLimitStore.set(identifier, { attempts: 1, timestamp: now, blocked: false });
      return true;
    }

    if (userRateLimit.attempts >= MAX_ATTEMPTS) {
      // Block after exceeding max attempts
      userRateLimit.blocked = true;
      // Auto-unblock after 10 minutes
      setTimeout(() => {
        const currentData = rateLimitStore.get(identifier);
        if (currentData) {
          currentData.blocked = false;
          rateLimitStore.set(identifier, currentData);
        }
      }, 10 * 60 * 1000);
      return false;
    }

    userRateLimit.attempts += 1;
    return true;
  }, []);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setPaymentProof(e.target.files[0]);
    }
  }, []);

  const sendToDiscord = async (orderData: any, paymentProofUrl: string) => {
    try {
      // Create a more detailed and attractive Discord webhook message
      const embedColor = (() => {
        // Match color to rank
        const rankOption = RANKS.find(r => r.name === orderData.rank);
        // Default to green if no match found
        return rankOption ? 0x00aa00 : 0x00aa00;
      })();
      
      // Format timestamp for better readability
      const formattedDate = new Date().toLocaleString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });

      const webhookContent = {
        username: "Champa Store Bot",
        avatar_url: "https://i.imgur.com/R66g1Pe.jpg",
        content: "🎮 **NEW RANK ORDER!** 🎮",
        embeds: [
          {
            title: `New ${sanitizeInput(orderData.rank)} Rank Order`,
            color: embedColor,
            description: `A new order has been received and is awaiting processing.`,
            fields: [
              {
                name: "👤 Customer",
                value: `\`${sanitizeInput(orderData.username)}\``,
                inline: true
              },
              {
                name: "🎮 Platform",
                value: `\`${sanitizeInput(orderData.platform.toUpperCase())}\``,
                inline: true
              },
              {
                name: "⭐ Rank",
                value: `\`${sanitizeInput(orderData.rank)}\``,
                inline: true
              },
              {
                name: "💰 Price",
                value: `\`$${orderData.price}\``,
                inline: true
              },
              {
                name: "⏰ Time",
                value: `\`${formattedDate}\``,
                inline: true
              }
            ],
            thumbnail: {
              url: "https://i.imgur.com/R66g1Pe.jpg"
            },
            footer: {
              text: "Champa Store Order System",
              icon_url: "https://i.imgur.com/R66g1Pe.jpg"
            },
            timestamp: new Date().toISOString()
          }
        ]
      };

      // Add the payment proof image as a separate embed
      if (paymentProofUrl) {
        webhookContent.embeds.push({
          title: "💳 Payment Proof",
          color: embedColor,
          description: "Payment verification image",
          fields: [],
          thumbnail: {
            url: paymentProofUrl
          },
          footer: {
            text: "Champa Store Order System",
            icon_url: "https://i.imgur.com/R66g1Pe.jpg"
          },
          timestamp: new Date().toISOString()
        });
      }

      // Sanitize the entire webhook content
      const sanitizedContent = sanitizeDiscordContent(webhookContent);
      
      // Use the direct Netlify Function URL path
      const response = await fetch('/.netlify/functions/discord-webhook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'new_order',
          data: sanitizedContent
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Notification error:', errorText);
        throw new Error(`Failed to send notification: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.error('Error sending notification:', error);
      // Don't throw error to prevent blocking the order process
      // Just log it instead
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setLoadingStage('uploading');

    try {
      // Rate limit check using combined identifiers for stronger protection
      const clientIP = 'client-ip'; // In production, use actual client IP
      const identifierBase = username.toLowerCase() + '-' + navigator.userAgent.substring(0, 50);
      const identifier = btoa(identifierBase).substring(0, 50); // Base64 encode combined identifier
      
      if (!checkRateLimit(identifier)) {
        throw new Error('Too many attempts. Please try again later.');
      }

      // Enhanced input validation
      if (!paymentProof) throw new Error('Please upload payment proof');
      
      // Sanitize and validate username
      const sanitizedUsername = sanitizeInput(username.trim());
      if (!sanitizedUsername) throw new Error('Please enter your username');
      if (sanitizedUsername.length > 16) throw new Error('Username is too long (max 16 characters)');
      if (!/^[a-zA-Z0-9_]{3,16}$/.test(sanitizedUsername)) {
        throw new Error('Invalid Minecraft username format. Use only letters, numbers, and underscores.');
      }
      
      // Check for inappropriate content in username
      const forbiddenTerms = /\b(admin|moderator|owner|staff|hack|cheat|exploit)\b/i;
      if (forbiddenTerms.test(sanitizedUsername)) {
        throw new Error('Username contains prohibited terms');
      }

      const selectedRankOption = RANKS.find(rank => rank.name === selectedRank);
      if (!selectedRankOption) throw new Error('Please select a valid rank');

      // Enhanced file validation
      if (!paymentProof.type.startsWith('image/')) {
        throw new Error('Please upload a valid image file');
      }

      // Validate file size (max 3MB for tighter control)
      if (paymentProof.size > 3 * 1024 * 1024) {
        throw new Error('Image size should be less than 3MB');
      }

      // Stricter file type validation
      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
      if (!allowedTypes.includes(paymentProof.type)) {
        throw new Error('Please upload a JPG, PNG, or WebP image');
      }

      // Create cryptographically secure random filename
      const timestamp = Date.now();
      let randomString;
      try {
        randomString = crypto.randomUUID().replace(/-/g, '').slice(0, 12);
      } catch (e) {
        // Fallback for browsers without crypto.randomUUID
        randomString = Math.random().toString(36).substring(2, 14);
      }
      
      // Safer file name with proper sanitization
      const fileName = `${timestamp}_${randomString}.jpg`;
      const filePath = `guest/${fileName}`;
      
      // Upload the file with proper configuration
      const { error: uploadError, data: uploadData } = await supabase.storage
        .from('payment-proofs')
        .upload(filePath, paymentProof!, {
          cacheControl: '3600',
          upsert: false,
          contentType: paymentProof!.type
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw new Error('Failed to upload payment proof. Please try again.');
      }

      if (!uploadData || !uploadData.path) {
        throw new Error('Upload failed. No data returned.');
      }

      // Construct the absolute public URL for the image with URL encoding for safety
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://ymzksxrmsocggozepqsu.supabase.co';
      const encodedPath = encodeURIComponent(filePath);
      const publicUrl = `${supabaseUrl}/storage/v1/object/public/payment-proofs/${encodedPath}`;
      
      // Log for debugging
      console.log('Payment proof URL:', publicUrl);

      // Create order with all required fields using sanitized input
      const orderData = {
        username: sanitizedUsername,
        platform,
        rank: selectedRank,
        price: selectedRankOption.price,
        payment_proof: filePath, // Store the path only in the database
        created_at: new Date().toISOString(),
        status: 'pending' // Ensure status field is included
      };

      console.log('Sending order data:', orderData);

      // First, check if the orders table exists and has the correct structure
      const { error: checkError } = await supabase
        .from('orders')
        .select('id')
        .limit(1);

      // If there's a table issue, try to handle it gracefully
      if (checkError) {
        console.error('Table check error:', checkError);
        
        // If the table doesn't exist, we might try creating it (if user has permissions)
        if (checkError.message && checkError.message.includes('relation "orders" does not exist')) {
          console.log('Attempting to create orders table as it does not exist...');
          
          try {
            // This will only work if the connected user has create table permissions
            const createResult = await supabase.rpc('create_orders_table_if_not_exists');
            console.log('Create table result:', createResult);
            
            // Wait a moment for the table to be available
            await new Promise(resolve => setTimeout(resolve, 1000));
          } catch (createError) {
            console.error('Failed to create orders table:', createError);
            throw new Error('The order system is currently being set up. Please try again later or contact support.');
          }
        }
      }

      // Validate order data one more time before submitting
      const requiredFields = ['username', 'platform', 'rank', 'price', 'payment_proof', 'created_at', 'status'];
      const missingFields = requiredFields.filter(field => !orderData[field as keyof typeof orderData]);
      
      if (missingFields.length > 0) {
        console.error('Missing required fields:', missingFields);
        throw new Error(`Missing required order information: ${missingFields.join(', ')}`);
      }

      // Insert the order with retry mechanism for transient errors
      let orderError = null;
      let orderResponse = null;
      let retryCount = 0;
      const maxRetries = 2;

      while (retryCount <= maxRetries) {
        try {
          const result = await supabase
            .from('orders')
            .insert(orderData)
            .select('id');
          
          orderError = result.error;
          orderResponse = result.data;
          
          // If successful or non-transient error, break out of retry loop
          if (!orderError || (orderError.code !== '53300' && orderError.code !== '40001')) {
            break;
          }
          
          // If we get here, it's a transient error worth retrying
          retryCount++;
          console.log(`Retrying order creation (attempt ${retryCount}/${maxRetries})...`);
          
          // Add exponential backoff
          await new Promise(resolve => setTimeout(resolve, retryCount * 1000));
        } catch (e) {
          console.error('Unexpected error during order creation:', e);
          orderError = { message: 'Unexpected error occurred', code: 'unknown' };
          break;
        }
      }

      // For resilience, also save to localStorage as a fallback
      try {
        // Generate a unique ID for localStorage tracking
        const localOrderId = `order_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        
        // Store in localStorage as a backup
        const storedOrders = JSON.parse(localStorage.getItem('pendingOrders') || '[]');
        storedOrders.push({
          ...orderData,
          localOrderId,
          created_at: new Date().toISOString(),
          paymentProofUrl: publicUrl // Also store the full URL
        });
        
        // Limit to maximum 10 pending orders to prevent localStorage overflow
        if (storedOrders.length > 10) {
          storedOrders.splice(0, storedOrders.length - 10);
        }
        
        localStorage.setItem('pendingOrders', JSON.stringify(storedOrders));
      } catch (localStorageError) {
        console.error('Failed to save order to localStorage:', localStorageError);
        // Continue anyway, this is just a fallback
      }

      if (orderError) {
        // Log detailed error information for debugging
        console.error('Order error details:', {
          errorMessage: orderError.message,
          errorCode: orderError.code,
          details: orderError.details,
          hint: orderError.hint,
          fullError: JSON.stringify(orderError),
          retryAttempts: retryCount
        });
        
        // Provide more specific error messages based on common Supabase error codes
        if (orderError.code === '23502') { // not_null_violation
          throw new Error('Missing required field in order data. Please try again or contact support.');
        } else if (orderError.code === '23505') { // unique_violation
          throw new Error('This order already exists. Please try again with different information.');
        } else if (orderError.code === '42P01') { // undefined_table
          throw new Error('The orders database is currently unavailable. Please try again later.');
        } else if (orderError.code === '42703') { // undefined_column
          throw new Error('Order data format error. Please try again or contact support.');
        } else if (orderError.code === '28000' || orderError.code === '28P01') { // invalid_authorization
          throw new Error('Database authentication error. Please try again later.');
        } else if (orderError.message && orderError.message.includes('violates not-null constraint')) {
          throw new Error('Missing required field in order data. Please try again or contact support.');
        } else if (orderError.message && orderError.message.includes('duplicate key')) {
          throw new Error('This order already exists. Please try again with different information.');
        } else {
          // Fallback error message
          throw new Error('Failed to create order. Please try again later.');
        }
      }

      // Check if we actually got a valid order response
      if (!orderResponse || !orderResponse[0] || !orderResponse[0].id) {
        console.error('No valid order ID returned despite successful operation');
        // Continue anyway but log the issue
      }

      // Send order information to Discord with the direct public URL
      try {
        await sendToDiscord(orderData, publicUrl);
      } catch (discordError) {
        console.error('Discord notification failed, but order was created:', discordError);
        // Continue with success even if Discord notification fails
      }

      toast.success('Order submitted successfully! We will process your order.', {
        duration: 5000,
        style: {
          borderRadius: '10px',
          background: '#10b981',
          color: '#fff',
        },
        icon: '🎉',
      });
      
      // Prepare receipt data
      const orderCompleteData = {
        ...orderData,
        payment_proof: publicUrl,  // Use the complete URL for the receipt
        orderId: orderResponse && orderResponse[0] ? orderResponse[0].id : undefined
      };
      
      // Mark order as complete
      setOrderComplete(true);
      
      // Reset form
      setUsername('');
      setPlatform('java');
      setSelectedRank('VIP');
      setPaymentProof(null);
      
      // Show receipt with a slight delay to ensure UI updates
      setTimeout(() => {
        setReceiptData(orderCompleteData);
        setShowReceipt(true);
      }, 100);
    } catch (error) {
      console.error('Submit error:', error);
      // Sanitize error messages to prevent information leakage
      let errorMessage = 'An unexpected error occurred';
      
      if (error instanceof Error) {
        // Only show whitelisted error messages to prevent information disclosure
        const safeErrors = [
          'Please upload payment proof',
          'Please enter your username',
          'Username is too long',
          'Invalid Minecraft username format',
          'Username contains prohibited terms',
          'Please select a valid rank',
          'Please upload a valid image file',
          'Image size should be less than 3MB',
          'Please upload a JPG, PNG, or WebP image',
          'Too many attempts. Please try again later.'
        ];
        
        // Only display error if it's in our safe list
        const isKnownError = safeErrors.some(safeMsg => error.message.includes(safeMsg));
        errorMessage = isKnownError ? error.message : 'An error occurred. Please try again.';
      }
      
      toast.error(errorMessage);
    } finally {
      setLoading(false);
      setLoadingStage(null);
    }
  };

  const handleReceiptClose = useCallback(() => {
    setShowReceipt(false);
    setReceiptData(null);
    setOrderComplete(false);
    onClose();
  }, [onClose]);

  return (
    <>
      {/* Main Order Form Modal */}
      {showOrderForm && (
        <Dialog open={isOpen} onOpenChange={(open: boolean) => !open && onClose()}>
          <DialogContent 
            className="bg-gray-800/95 rounded-2xl p-4 sm:p-6 md:p-8 w-full max-w-2xl m-2 sm:m-4 relative max-h-[90vh] overflow-y-auto transition-all duration-300 ease-in-out shadow-xl border border-gray-700"
            aria-describedby="order-form-description"
          >
            <DialogTitle>
              <VisuallyHidden.Root>Complete Your Order</VisuallyHidden.Root>
            </DialogTitle>
            
            <p id="order-form-description" className="sr-only">
              Order form for purchasing {selectedRank} rank on Champa Store
            </p>
            
            <button
              onClick={onClose}
              className="absolute right-3 top-3 sm:right-4 sm:top-4 text-gray-400 hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-opacity-50 rounded-full p-1"
              aria-label="Close modal"
            >
              <X size={24} />
            </button>

            <div className="text-center mb-6">
              <div className="w-20 h-20 mx-auto mb-3 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-lg">
                <img 
                  src="https://i.imgur.com/ArKEQz1.png" 
                  alt="" 
                  className="w-16 h-16 rounded-full object-cover border-2 border-white"
                />
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">Complete Your Order</h2>
              <p className="text-gray-400 text-sm sm:text-base">Select your platform and rank to proceed with the purchase</p>
            </div>

            {/* Progress Tracker */}
            <div className="flex justify-between mb-6 px-2">
              <div className="flex flex-col items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${formStep === 'info' ? 'bg-emerald-500 text-white' : 'bg-gray-700 text-gray-400'} mb-1`}>1</div>
                <span className="text-xs text-gray-400">Info</span>
              </div>
              <div className="flex-1 flex items-center px-2">
                <div className={`h-1 w-full ${formStep !== 'info' ? 'bg-emerald-500' : 'bg-gray-700'}`}></div>
              </div>
              <div className="flex flex-col items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${formStep === 'payment' ? 'bg-emerald-500 text-white' : 'bg-gray-700 text-gray-400'} mb-1`}>2</div>
                <span className="text-xs text-gray-400">Payment</span>
              </div>
              <div className="flex-1 flex items-center px-2">
                <div className={`h-1 w-full ${formStep === 'confirmation' ? 'bg-emerald-500' : 'bg-gray-700'}`}></div>
              </div>
              <div className="flex flex-col items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${formStep === 'confirmation' ? 'bg-emerald-500 text-white' : 'bg-gray-700 text-gray-400'} mb-1`}>3</div>
                <span className="text-xs text-gray-400">Confirm</span>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
              {/* Order summary box - always visible but with fancy highlight on submit */}
              <div className="bg-gray-700/50 rounded-lg p-3 sm:p-4 border border-gray-600 transform transition-all duration-300 hover:border-emerald-500/50">
                <h3 className="text-base sm:text-lg font-semibold text-white mb-3 sm:mb-4 flex items-center gap-2">
                  <Info size={18} className="text-emerald-400" />
                  Order Summary
                </h3>
                <div className="space-y-2 text-sm sm:text-base">
                  <div className="flex justify-between text-gray-300">
                    <span>Selected Rank:</span>
                    <span className="font-medium">{selectedRank}</span>
                  </div>
                  <div className="flex justify-between text-gray-300">
                    <span>Platform:</span>
                    <span className="font-medium capitalize">{platform}</span>
                  </div>
                  <div className="flex justify-between text-gray-300">
                    <span>Price:</span>
                    <span className="font-medium text-emerald-400">${selectedRankPrice}</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-300 mb-1 flex items-center gap-2">
                  <User size={16} className="text-emerald-400" />
                  Minecraft Username
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-gray-700/50 border border-gray-600 rounded-lg py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-emerald-400 text-sm sm:text-base transition-all duration-200"
                  required
                  placeholder="Enter your Minecraft username"
                  autoFocus
                />
                <p className="text-xs text-gray-500 mt-1 ml-1">Only letters, numbers, and underscores allowed</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Platform
                </label>
                <div className="flex gap-2">
                  <PlatformButton 
                    label="java" 
                    isSelected={platform === 'java'} 
                    onClick={() => setPlatform('java')} 
                  />
                  <PlatformButton 
                    label="bedrock" 
                    isSelected={platform === 'bedrock'} 
                    onClick={() => setPlatform('bedrock')} 
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Select Rank
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                  {RANKS.map((rank) => (
                    <RankButton
                      key={rank.name}
                      rank={rank}
                      isSelected={selectedRank === rank.name}
                      onClick={() => setSelectedRank(rank.name)}
                    />
                  ))}
                </div>
              </div>

              {/* Rank Preview Section */}
              {selectedRankOption && (
                <div className="bg-gray-700/50 rounded-lg p-3 sm:p-4 border border-gray-600 hover:border-emerald-500/30 transition-all duration-300">
                  <h3 className="text-base sm:text-lg font-semibold text-white mb-3 sm:mb-4 flex items-center gap-2">
                    <Shield size={18} className="text-emerald-400" />
                    {selectedRank} Rank Preview
                  </h3>
                  <div className="flex justify-center">
                    <img 
                      src={selectedRankOption.image} 
                      alt={`${selectedRank} Kit Preview`}
                      className="w-auto h-auto max-w-full max-h-[250px] object-contain rounded-lg border border-gray-600 transition-transform duration-300 hover:scale-[1.02] shadow-lg"
                    />
                  </div>
                </div>
              )}

              {/* Payment Details Section */}
              <div className="bg-gray-700/50 rounded-lg p-3 sm:p-4 border border-gray-600 hover:border-emerald-500/30 transition-all duration-300">
                <h3 className="text-base sm:text-lg font-semibold text-white mb-3 sm:mb-4 flex items-center gap-2">
                  <CreditCard size={18} className="text-emerald-400" />
                  Payment Details
                </h3>
                <div className="text-center">
                  <p className="text-gray-300 mb-3 text-sm sm:text-base">Scan the QR code below to pay:</p>
                  <div className="bg-white p-2 sm:p-4 rounded-lg inline-block transition-transform duration-300 hover:scale-[1.02] shadow-lg">
                    <img 
                      src="/images/qr/qrcode.jpg" 
                      alt="Payment QR Code"
                      className="w-36 h-36 sm:w-48 sm:h-48 mx-auto"
                    />
                  </div>
                  <p className="text-xs sm:text-sm text-gray-400 mt-2">Amount: <span className="text-emerald-400 font-bold">${selectedRankPrice}</span></p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Payment Proof (QR Code Screenshot)
                </label>
                <div className="relative">
                  <input
                    type="file"
                    onChange={handleFileChange}
                    accept="image/*"
                    className="hidden"
                    id="payment-proof"
                    required
                  />
                  <label
                    htmlFor="payment-proof"
                    className="w-full bg-gray-700/50 border border-gray-600 rounded-lg py-2 sm:py-3 px-3 sm:px-4 text-white flex items-center justify-center gap-2 cursor-pointer hover:bg-gray-600/50 transition duration-300 text-sm sm:text-base group"
                  >
                    <Upload size={18} className="text-emerald-400 group-hover:scale-110 transition-transform duration-300" />
                    {paymentProof ? (
                      <span className="truncate max-w-full">{paymentProof.name}</span>
                    ) : (
                      'Upload QR Code Screenshot'
                    )}
                  </label>
                  {paymentProof && (
                    <div className="mt-2 bg-emerald-500/10 rounded-lg p-2 border border-emerald-500/30 text-xs text-emerald-400 flex items-center">
                      <Check size={16} className="mr-1" /> File selected successfully
                    </div>
                  )}
                </div>
              </div>

              {/* Loading Overlay */}
              {loading && (
                <div className="bg-gray-800/95 border border-emerald-500/20 rounded-lg p-4 shadow-lg animate-pulse">
                  <div className="flex items-center justify-center space-x-3">
                    <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                    <div className="text-sm text-gray-300">
                      {loadingStage === 'uploading' && 'Uploading payment proof...'}
                      {loadingStage === 'processing' && 'Processing your order...'}
                      {loadingStage === 'finalizing' && 'Finalizing your purchase...'}
                    </div>
                  </div>
                  <div className="w-full bg-gray-700 h-2 mt-3 rounded-full overflow-hidden">
                    <div 
                      className="bg-gradient-to-r from-emerald-400 to-emerald-600 h-full rounded-full" 
                      style={{ 
                        width: loadingStage === 'uploading' ? '30%' : 
                               loadingStage === 'processing' ? '60%' : '90%',
                        transition: 'width 0.5s ease-in-out'
                      }}
                    ></div>
                  </div>
                </div>
              )}

              {/* Form submission button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white rounded-lg py-3 px-4 transition duration-300 disabled:opacity-50 transform hover:scale-[1.02] text-sm sm:text-base font-medium mt-2 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-opacity-50 shadow-lg"
              >
                {loading ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Processing...
                  </span>
                ) : (
                  'Submit Order'
                )}
              </button>
            </form>
          </DialogContent>
        </Dialog>
      )}
      
      {/* Receipt Modal - This is rendered at the top level for better visibility */}
      {showReceipt && receiptData && (
        <ReceiptModal 
          isOpen={showReceipt} 
          onClose={handleReceiptClose} 
          orderData={receiptData} 
        />
      )}
    </>
  );
}