import React, { useState, useEffect, useMemo, useCallback, memo } from 'react';
import { X, Upload, Info, CreditCard, User, Shield, Check, AlertCircle } from 'lucide-react';
import { supabase, checkSupabaseBuckets } from '../lib/supabase';
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
  originalPrice?: number; // Optional original price for discounts
  color: string;
  image: string;
}

// Initial fallback ranks in case database fetch fails
const DEFAULT_RANKS: RankOption[] = [
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

// Memoized rank button component with improved discount display
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
    <div className="text-xs sm:text-sm">
      {rank.originalPrice && rank.originalPrice > rank.price ? (
        <div className="flex flex-col items-center">
          <span className="line-through text-gray-400 text-xs">${rank.originalPrice.toFixed(2)}</span>
          <span className="text-emerald-300 font-semibold">${rank.price.toFixed(2)}</span>
        </div>
      ) : (
        <span>${rank.price.toFixed(2)}</span>
      )}
    </div>
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
  
  // Store ranks and QR code image in state
  const [ranks, setRanks] = useState<RankOption[]>(DEFAULT_RANKS);
  const [qrCodeImage, setQrCodeImage] = useState('/images/qr/qrcode.jpg');
  const [receiptImage, setReceiptImage] = useState('/images/receipt-bg.jpg');
  const [receiptLogoImage, setReceiptLogoImage] = useState('https://i.imgur.com/ArKEQz1.png');
  const [logoImage, setLogoImage] = useState<string>('https://i.imgur.com/ArKEQz1.png');
  const [initialLoading, setInitialLoading] = useState(true);
  const [paymentProofPreview, setPaymentProofPreview] = useState<string | null>(null);
  const [uploadDisabled, setUploadDisabled] = useState(false);

  // Form steps for guided flow
  const [formStep, setFormStep] = useState<'info' | 'payment' | 'confirmation'>('info');

  // If order complete and receipt is showing, hide the order form
  const showOrderForm = isOpen && !(orderComplete && showReceipt);

  // Fetch ranks and images from the database
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Check if storage is properly configured
        if (isOpen) {
          try {
            const hasBuckets = await checkSupabaseBuckets();
            if (!hasBuckets) {
              setUploadDisabled(true);
              console.warn('Storage uploads likely to fail - no buckets available');
            } else {
              setUploadDisabled(false);
            }
          } catch (err) {
            console.error('Error checking storage buckets:', err);
          }
        }
        
        // Fetch ranks
        const { data: productsData, error: productsError } = await supabase
          .from('products')
          .select('*')
          .eq('active', true)
          .order('price');
          
        if (productsError) throw productsError;
        
        if (productsData && productsData.length > 0) {
          const formattedRanks = productsData.map(product => ({
            name: product.name,
            price: parseFloat(product.price),
            originalPrice: product.original_price ? parseFloat(product.original_price) : undefined,
            color: product.color || 'from-emerald-500 to-emerald-600',
            image: product.image_url || 'https://i.imgur.com/NX3RB4i.png'
          }));
          
          setRanks(formattedRanks);
          
          // If the previously selected rank no longer exists, select the first available
          if (!formattedRanks.some(rank => rank.name === selectedRank) && formattedRanks.length > 0) {
            setSelectedRank(formattedRanks[0].name);
          }
        }
        
        // Fetch QR code and logo images
        const { data: configData, error: configError } = await supabase
          .from('site_config')
          .select('*')
          .in('key', ['qr_code_image', 'receipt_image', 'receipt_logo_image', 'logo_image']);
          
        if (configError) throw configError;
        
        if (configData && configData.length > 0) {
          const configObj = configData.reduce((acc: any, item: any) => {
            acc[item.key] = item.value;
            return acc;
          }, {});
          
          if (configObj.qr_code_image) {
            setQrCodeImage(configObj.qr_code_image);
          }
          
          if (configObj.receipt_image) {
            setReceiptImage(configObj.receipt_image);
          }
          
          if (configObj.receipt_logo_image) {
            setReceiptLogoImage(configObj.receipt_logo_image);
          }
          
          if (configObj.logo_image) {
            setLogoImage(configObj.logo_image);
          }
        }
      } catch (error) {
        console.error('Error fetching order modal data:', error);
        toast.error('Failed to load some data. Using default values.');
      } finally {
        setInitialLoading(false);
      }
    };
    
    if (isOpen) {
      fetchData();
    }
  }, [isOpen, selectedRank]);

  // Memoize the selected rank option to avoid re-calculations
  const selectedRankOption = useMemo(() => 
    ranks.find(rank => rank.name === selectedRank), 
    [selectedRank, ranks]
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

  // Enhanced file upload handler with data URL preview instead of blob URL to fix CSP issues
  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Validate file size
    if (file.size > 3 * 1024 * 1024) {
      toast.error('Image is too large (max 3MB)');
      return;
    }
    
    // Validate file type
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      toast.error('Please upload a JPG, PNG, or WebP image');
      return;
    }
    
    setPaymentProof(file);
    
    // Create a data URL instead of a blob URL to avoid CSP issues
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setPaymentProofPreview(event.target.result as string);
      }
    };
    reader.onerror = () => {
      toast.error('Failed to preview image');
      setPaymentProofPreview(null);
    };
    reader.readAsDataURL(file);
  }, []);

  const sendToDiscord = async (orderData: any, paymentProofUrl: string) => {
    try {
      // Create a more detailed and attractive Discord webhook message
      const embedColor = (() => {
        // Match color to rank
        const rankOption = ranks.find(r => r.name === orderData.rank);
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
              url: logoImage
            },
            footer: {
              text: "Champa Store Order System",
              icon_url: logoImage
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
            icon_url: logoImage
          },
          timestamp: new Date().toISOString()
        });
      }

      // Sanitize the entire webhook content
      const sanitizedContent = sanitizeDiscordContent(webhookContent);

      // Fetch site config for the webhook URL
      const { data: configData, error: configError } = await supabase
        .from('site_config')
        .select('value')
        .eq('key', 'discord_webhook_url')
        .single();
      
      if (configError) {
        console.error('Error fetching Discord webhook URL:', configError);
        return;
      }
      
      const webhookUrl = configData?.value;
      if (!webhookUrl) {
        console.error('Discord webhook URL not configured');
        return;
      }

      // Send the webhook
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(sanitizedContent),
      });

      if (!response.ok) {
        throw new Error(`Discord webhook error: ${response.status}`);
      }
      
      console.log('Discord notification sent successfully');
    } catch (error) {
      console.error('Failed to send Discord notification:', error);
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

      const selectedRankOption = ranks.find(rank => rank.name === selectedRank);
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
        throw new Error('Please upload a JPEG, PNG, or WebP image');
      }

      // Generate a unique filename with timestamp and random string
      const timestamp = Date.now();
      const randomString = Math.random().toString(36).substring(2, 10);
      const fileExtension = paymentProof.name.split('.').pop();
      const fileName = `payment_proof_${sanitizedUsername}_${timestamp}_${randomString}.${fileExtension}`;
      const filePath = `payment_proofs/${fileName}`;

      // Set loading state to uploading
      setLoadingStage('uploading');
      
      // Try uploading to various possible bucket names
      let uploadError;
      let fileData;
      let bucketName;
      
      // List of possible bucket names to try
      const possibleBuckets = ['payment-proofs', 'uploads', 'media', 'public', 'images', 'storage'];
      
      for (const bucket of possibleBuckets) {
        try {
          const result = await supabase.storage
            .from(bucket)
            .upload(filePath, paymentProof, {
              cacheControl: '3600',
              upsert: false
            });
            
          if (!result.error) {
            fileData = result.data;
            bucketName = bucket;
            uploadError = null;
            break;
          }
          
          uploadError = result.error;
        } catch (err) {
          uploadError = err;
        }
      }
      
      if (uploadError || !bucketName) {
        console.error('All bucket attempts failed:', uploadError);
        
        // Fallback to direct data URL if storage fails
        const reader = new FileReader();
        return new Promise((resolve, reject) => {
          reader.onload = async (event) => {
            if (!event.target || !event.target.result) {
              reject(new Error('Failed to read file data'));
              return;
            }
            
            const dataUrl = event.target.result as string;
            
            try {
              // Continue with order processing using data URL
              setLoadingStage('processing');
              
              // Create order with data URL instead of storage path
              const orderData = {
                username: sanitizedUsername,
                platform,
                rank: selectedRank,
                price: selectedRankOption.price,
                payment_proof: dataUrl, // Store data URL directly
                created_at: new Date().toISOString(),
                status: 'pending'
              };
              
              // Process the order
              const { data: insertData, error: insertError } = await supabase
                .from('orders')
                .insert([orderData])
                .select();
              
              if (insertError) throw new Error(`Order submission failed: ${insertError.message}`);
              
              // Set loading state to finalizing
              setLoadingStage('finalizing');
              
              // Send notification to Discord (with data URL)
              await sendToDiscord(orderData, dataUrl);
              
              // Update receipt data for the confirmation modal
              setReceiptData({
                ...orderData,
                payment_proof: dataUrl,
                orderId: insertData[0]?.id || 'N/A'
              });
              
              // Show success notification
              toast.success('Order submitted successfully!');
              
              // Show receipt modal
              setOrderComplete(true);
              setShowReceipt(true);
              resolve(true);
            } catch (error) {
              reject(error);
            }
          };
          
          reader.onerror = () => {
            reject(new Error('Failed to read file data'));
          };
          
          reader.readAsDataURL(paymentProof);
        });
      }
      
      // Get public URL from the successful bucket
      const { data: urlData } = supabase.storage
        .from(bucketName)
        .getPublicUrl(filePath);
        
      if (!urlData || !urlData.publicUrl) {
        throw new Error('Failed to get public URL for uploaded file');
      }
      
      const paymentProofUrl = urlData.publicUrl;
      
      // Set loading state to processing
      setLoadingStage('processing');

      // Create order with all required fields using sanitized input
      const orderData = {
        username: sanitizedUsername,
        platform,
        rank: selectedRank,
        price: selectedRankOption.price,
        payment_proof: filePath,
        created_at: new Date().toISOString(),
        status: 'pending'
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
      for (const field of requiredFields) {
        if (!orderData[field as keyof typeof orderData]) {
          throw new Error(`Missing required field: ${field}`);
        }
      }
      
      // Insert the order into the database
      const { data: insertData, error: insertError } = await supabase
        .from('orders')
        .insert([orderData])
        .select();
        
      if (insertError) throw new Error(`Order submission failed: ${insertError.message}`);
      
      // Set loading state to finalizing
      setLoadingStage('finalizing');
      
      // Send notification to Discord
      await sendToDiscord(orderData, paymentProofUrl);
      
      // Update receipt data for the confirmation modal
      setReceiptData({
        ...orderData,
        payment_proof: paymentProofUrl,
        orderId: insertData[0]?.id || 'N/A'
      });
      
      // Show success notification
      toast.success('Order submitted successfully!');
      
      // Show receipt modal
      setOrderComplete(true);
      setShowReceipt(true);
      
    } catch (error: any) {
      // Handle errors
      console.error('Order Error:', error);
      toast.error(error.message || 'Failed to process your order');
    } finally {
      setLoading(false);
      setLoadingStage(null);
    }
  };

  const handleReceiptClose = () => {
    setShowReceipt(false);
    // Wait for animation to complete before fully closing modal
    setTimeout(() => {
      onClose();
      // Reset form data
      setUsername('');
      setPlatform('java');
      setSelectedRank('VIP');
      setPaymentProof(null);
      setOrderComplete(false);
    }, 500);
  };

  // Cleanup is not needed for data URLs as they are not browser resources like blob URLs
  useEffect(() => {
    return () => {
      // No cleanup needed for data URLs
    };
  }, [paymentProofPreview]);

  // Enhanced file upload section with preview and fallback message
  const renderFileUploadSection = () => (
    <div>
      <label className="block text-sm font-medium text-gray-300 mb-1">
        Payment Proof (QR Code Screenshot)
      </label>
      <div className="relative">
        <input
          type="file"
          onChange={handleFileChange}
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          id="payment-proof"
          required
          disabled={uploadDisabled}
        />
        <label
          htmlFor={!uploadDisabled ? "payment-proof" : undefined}
          className={`w-full bg-gray-700/50 border border-gray-600 rounded-lg py-2 sm:py-3 px-3 sm:px-4 text-white flex items-center justify-center gap-2 cursor-pointer hover:bg-gray-600/50 transition duration-300 text-sm sm:text-base group ${uploadDisabled ? 'opacity-70 cursor-not-allowed' : ''}`}
        >
          <Upload size={18} className="text-emerald-400 group-hover:scale-110 transition-transform duration-300" />
          {paymentProof ? (
            <span className="truncate max-w-full">{paymentProof.name}</span>
          ) : (
            'Upload QR Code Screenshot'
          )}
        </label>
        
        {uploadDisabled && (
          <div className="mt-2 bg-amber-500/10 rounded-lg p-3 border border-amber-500/30 text-xs text-amber-400 flex items-center">
            <AlertCircle size={16} className="mr-2 shrink-0" /> 
            <span>Storage uploads may be unavailable. Please contact support or try again later.</span>
          </div>
        )}
        
        {paymentProofPreview && (
          <div className="mt-3 relative animate-fadeIn">
            <div className="bg-gray-700/50 rounded-lg overflow-hidden border border-gray-600 group relative transition-all hover:border-emerald-500/50 shadow-md">
              <img 
                src={paymentProofPreview} 
                alt="Payment proof preview" 
                className="w-full h-auto max-h-[200px] object-contain rounded transition-transform duration-300 group-hover:scale-[1.02]"
                onLoad={() => console.log('Preview image loaded')}
                onError={() => {
                  toast.error('Failed to load image preview');
                  setPaymentProofPreview(null);
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/40 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
            </div>
            <div className="absolute top-2 right-2 flex gap-1">
              <button 
                type="button"
                onClick={() => {
                  setPaymentProof(null);
                  setPaymentProofPreview(null);
                }}
                className="bg-gray-800/80 text-white p-1.5 rounded-full hover:bg-red-500 transition-colors duration-200 shadow-md"
                aria-label="Remove image"
              >
                <X size={14} />
              </button>
            </div>
            <div className="mt-2 text-xs text-emerald-400 flex items-center justify-center">
              <Check size={12} className="mr-1" /> Image ready for submission
            </div>
          </div>
        )}
        
        {paymentProof && !paymentProofPreview && (
          <div className="mt-2 bg-gray-700/50 rounded-lg p-3 border border-gray-600 text-xs flex items-center justify-center animate-pulse">
            <div className="animate-spin h-4 w-4 border-2 border-emerald-500 border-t-transparent rounded-full mr-2"></div>
            <span className="text-gray-300">Processing image...</span>
          </div>
        )}
        
        <div className="mt-2 text-xs text-gray-500 flex items-center gap-1">
          <Info size={12} />
          <span>Accepted formats: JPG, PNG, WebP (max 3MB)</span>
        </div>
      </div>
    </div>
  );

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
                  src={logoImage} 
                  alt="" 
                  className="w-16 h-16 rounded-full object-cover border-2 border-white"
                />
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">Complete Your Order</h2>
              <p className="text-gray-400 text-sm sm:text-base">Select your platform and rank to proceed with the purchase</p>
            </div>

            {/* Loading Indicator */}
            {initialLoading && (
              <div className="flex justify-center items-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-emerald-500"></div>
              </div>
            )}

            {!initialLoading && (
              <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
                {/* Enhanced summary with discount if applicable */}
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
                      {selectedRankOption?.originalPrice && selectedRankOption.originalPrice > selectedRankOption.price ? (
                        <div className="flex flex-col items-end">
                          <span className="line-through text-gray-500 text-xs">${selectedRankOption.originalPrice.toFixed(2)}</span>
                          <span className="font-medium text-emerald-400">${selectedRankOption.price.toFixed(2)}</span>
                        </div>
                      ) : (
                        <span className="font-medium text-emerald-400">${selectedRankPrice.toFixed(2)}</span>
                      )}
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
                    {ranks.map((rank) => (
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
                        src={qrCodeImage} 
                        alt="Payment QR Code"
                        className="w-36 h-36 sm:w-48 sm:h-48 mx-auto"
                      />
                    </div>
                    <p className="text-xs sm:text-sm text-gray-400 mt-2">Amount: <span className="text-emerald-400 font-bold">${selectedRankPrice}</span></p>
                  </div>
                </div>

                {/* Replace the file upload section with enhanced version */}
                {renderFileUploadSection()}

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
            )}
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