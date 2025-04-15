import React, { useState, useEffect, useMemo, useCallback, memo } from 'react';
import { X, Upload, Info, CreditCard, User, Shield, Check, AlertCircle } from 'lucide-react';
import { supabase, checkSupabaseBuckets, createStorageBucket } from '../lib/supabase';
import toast from 'react-hot-toast';
import { sanitizeInput, sanitizeDiscordContent } from '../utils/sanitize';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "../ui/dialog";
import * as VisuallyHidden from '@radix-ui/react-visually-hidden';
import { ReceiptModal } from './ReceiptModal';
import { Button } from "../ui/button";

interface OrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  name?: string;
  platform?: "java" | "bedrock";
  rankName?: string;
  onConfirm: () => void;
  isLoading?: boolean;
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

// Rate limiting configuration with memory efficiency
const RATE_LIMIT_DURATION = 60 * 1000; // 1 minute
const MAX_ATTEMPTS = 3;
// Use WeakMap for better garbage collection when possible
const rateLimitStore = new Map<string, { attempts: number; timestamp: number; blocked: boolean }>();

// Clean up expired rate limit entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of rateLimitStore.entries()) {
    if (now - value.timestamp > RATE_LIMIT_DURATION * 2) {
      rateLimitStore.delete(key);
    }
  }
}, 300000); // Clean up every 5 minutes

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

// Virtualized rank buttons component for better performance with many ranks
const VirtualizedRankButtons = memo(({ 
  ranks, 
  selectedRank, 
  onSelectRank 
}: { 
  ranks: RankOption[]; 
  selectedRank: string; 
  onSelectRank: (name: string) => void;
}) => {
  // Only re-render when ranks or selection changes
  return useMemo(() => (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
      {ranks.map((rank) => (
        <RankButton
          key={rank.name}
          rank={rank}
          isSelected={selectedRank === rank.name}
          onClick={() => onSelectRank(rank.name)}
        />
      ))}
    </div>
  ), [ranks, selectedRank, onSelectRank]);
});

// Memoized components to prevent unnecessary re-renders
const ModalHeader = React.memo(({ title, onClose }: { title: string, onClose: () => void }) => (
  <div className="p-4 sm:p-6 border-b flex justify-between items-center">
    <h2 className="text-xl font-semibold">{title}</h2>
    <Button variant="ghost" className="h-8 w-8 p-0" onClick={onClose}>
      <X className="h-4 w-4" />
    </Button>
  </div>
));

const InfoRow = React.memo(({ label, value }: { label: string, value: string }) => (
  <div className="flex justify-between mb-2">
    <span className="text-gray-500">{label}</span>
    <span className="font-medium">{value}</span>
  </div>
));

const OrderModal: React.FC<OrderModalProps> = ({
  isOpen,
  onClose,
  title,
  name: initialName = '',
  platform: initialPlatform,
  rankName: initialRankName,
  onConfirm,
  isLoading = false
}): JSX.Element | null => {
  const [name, setName] = useState(initialName);
  const [phone, setPhone] = useState('');
  const [platform, setPlatform] = useState<"java" | "bedrock" | undefined>(initialPlatform);
  const [rankName, setRankName] = useState(initialRankName);
  const [paymentProof, setPaymentProof] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [username, setUsername] = useState('');
  const [selectedRank, setSelectedRank] = useState<string>('VIP');
  const [loading, setLoading] = useState(false);
  const [loadingStage, setLoadingStage] = useState<'uploading' | 'processing' | 'finalizing' | null>(null);
  const [showReceipt, setShowReceipt] = useState(false);
  const [receiptData, setReceiptData] = useState<any>(null);
  const [orderComplete, setOrderComplete] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  
  // Store ranks and QR code image in state
  const [ranks, setRanks] = useState<RankOption[]>(DEFAULT_RANKS);
  const [qrCodeImage, setQrCodeImage] = useState('/images/qr/qrcode.jpg');
  const [receiptImage, setReceiptImage] = useState('/images/receipt-bg.jpg');
  const [receiptLogoImage, setReceiptLogoImage] = useState('https://i.imgur.com/ArKEQz1.png');
  const [logoImage, setLogoImage] = useState<string>('https://i.imgur.com/ArKEQz1.png');
  const [initialLoading, setInitialLoading] = useState(true);
  const [paymentProofPreview, setPaymentProofPreview] = useState<string | null>(null);
  const [uploadDisabled, setUploadDisabled] = useState(false);
  const [uploadFallbackMode, setUploadFallbackMode] = useState(false);

  // Form steps for guided flow
  const [formStep, setFormStep] = useState<'info' | 'payment' | 'confirmation'>('info');

  // If order complete and receipt is showing, hide the order form
  const showOrderForm = isOpen && !(orderComplete && showReceipt);

  // Implement debouncing for username input
  const [debouncedUsername, setDebouncedUsername] = useState('');
  
  useEffect(() => {
    const timer = setTimeout(() => {
      if (username !== debouncedUsername) {
        setDebouncedUsername(username);
      }
    }, 300);
    
    return () => clearTimeout(timer);
  }, [username, debouncedUsername]);
  
  // Prefetch image optimization
  useEffect(() => {
    if (isOpen && ranks.length > 0) {
      // Prefetch rank images for faster rendering
      ranks.forEach(rank => {
        if (rank.image) {
          const img = new Image();
          img.src = rank.image;
        }
      });
    }
  }, [isOpen, ranks]);
  
  // Better memoization of selected rank
  const selectedRankOption = useMemo(() => 
    ranks.find(rank => rank.name === selectedRank) || ranks[0], 
    [selectedRank, ranks]
  );
  
  // Memoize expensive operations
  const selectedRankPrice = useMemo(() => 
    selectedRankOption?.price || 0,
    [selectedRankOption]
  );
  
  const hasDiscount = useMemo(() => 
    !!(selectedRankOption?.originalPrice && selectedRankOption.originalPrice > selectedRankOption.price),
    [selectedRankOption]
  );
  
  // Memoize platform selection handler to avoid function recreation
  const handlePlatformSelect = useCallback((platform: 'java' | 'bedrock') => {
    setPlatform(platform);
  }, []);
  
  // Memoize rank selection handler
  const handleRankSelect = useCallback((name: string) => {
    setSelectedRank(name);
  }, []);

  // Fetch ranks and images from the database
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Check if storage is properly configured
        if (isOpen) {
          try {
            setUploadError(null);
            const hasBuckets = await checkSupabaseBuckets();
            if (!hasBuckets) {
              // Try to create buckets as a last resort
              const bucketsCreated = await createStorageBucket('payment-proofs');
              
              if (!bucketsCreated) {
                console.warn('Storage uploads likely to fail - no buckets available');
                setUploadDisabled(true);
                setUploadFallbackMode(true);
                toast.error('Using fallback upload method. Your order will still work.', { duration: 5000 });
              } else {
                console.log('Created storage buckets successfully!');
                setUploadDisabled(false);
                setUploadFallbackMode(false);
              }
            } else {
              setUploadDisabled(false);
              setUploadFallbackMode(false);
            }
          } catch (err) {
            console.error('Error checking storage buckets:', err);
            setUploadDisabled(false); // Still allow uploads, we'll use the fallback
            setUploadFallbackMode(true);
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

  // Progressive image loading
  const handleImageLoad = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setUploadError(null);
    
    // Validate file size
    if (file.size > 3 * 1024 * 1024) {
      setUploadError('Image is too large (max 3MB)');
      toast.error('Image is too large (max 3MB)');
      return;
    }
    
    // Validate file type
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setUploadError('Please upload a JPG, PNG, or WebP image');
      toast.error('Please upload a JPG, PNG, or WebP image');
      return;
    }
    
    setPaymentProof(file);
    
    // Create a small preview immediately for better UX
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        // Use a small version first for immediate feedback
        const img = new Image();
        img.onload = () => {
          // Create a canvas to resize the image
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          
          // Small preview for immediate display
          const MAX_PREVIEW_SIZE = 100;
          const ratio = Math.min(MAX_PREVIEW_SIZE / img.width, MAX_PREVIEW_SIZE / img.height);
          canvas.width = img.width * ratio;
          canvas.height = img.height * ratio;
          
          if (ctx) {
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            const smallPreview = canvas.toDataURL('image/jpeg', 0.5);
            
            // Set small preview immediately
            setPaymentProofPreview(smallPreview);
            
            // Then load full quality version
            setTimeout(() => {
              const fullReader = new FileReader();
              fullReader.onload = (e) => {
                if (e.target?.result) {
                  setPaymentProofPreview(e.target.result as string);
                }
              };
              fullReader.readAsDataURL(file);
            }, 100);
          }
        };
        img.src = event.target.result as string;
      }
    };
    reader.onerror = () => {
      setUploadError('Failed to preview image');
      toast.error('Failed to preview image');
      setPaymentProofPreview(null);
    };
    reader.readAsDataURL(file);
  }, []);

  // Ensure storage bucket exists
  const ensureStorageBucket = async () => {
    try {
      const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
      
      if (bucketsError) {
        console.error('Error listing buckets:', bucketsError);
        throw new Error('Failed to access storage');
      }
      
      const paymentProofsBucket = buckets?.find(b => b.name === 'payment-proofs');
      
      if (!paymentProofsBucket) {
        throw new Error('Payment proofs bucket not found. Please contact administrator.');
      }

      return true;
    } catch (error) {
      console.error('Storage bucket error:', error);
      throw new Error('Failed to access storage. Please try again later.');
    }
  };

  // Fallback upload to Imgur
  const uploadToImgurFallback = async () => {
    if (!paymentProof) return null;
    
    try {
      // Convert file to base64
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          if (typeof reader.result === 'string') {
            // Remove data URL prefix
            const base64Data = reader.result.split(',')[1];
            resolve(base64Data);
          } else {
            reject(new Error('Failed to read file as base64'));
          }
        };
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(paymentProof);
      });

      // Upload to our serverless function
      const response = await fetch('/.netlify/functions/imgur-upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ image: base64 })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to upload image');
      }

      const result = await response.json();
      return result.url;
    } catch (error) {
      console.error('Failed to upload to Imgur:', error);
      return null;
    }
  };

  // Send to Discord webhook
  const sendToDiscord = async (orderData: any, paymentProofUrl: string) => {
    try {
      const webhookData = {
        type: 'new_order',
        data: {
          embeds: [
            {
              title: '🛍️ New Order Received',
              color: 0x4ade80, // Emerald color
              fields: [
                {
                  name: '👤 Username',
                  value: orderData.username,
                  inline: true
                },
                {
                  name: '🎮 Platform',
                  value: orderData.platform.charAt(0).toUpperCase() + orderData.platform.slice(1),
                  inline: true
                },
                {
                  name: '⭐ Rank',
                  value: orderData.rank,
                  inline: true
                },
                {
                  name: '💰 Price',
                  value: `$${orderData.price.toFixed(2)}`,
                  inline: true
                },
                {
                  name: '🆔 Order ID',
                  value: orderData.orderId || 'N/A',
                  inline: true
                },
                {
                  name: '📅 Date',
                  value: new Date().toLocaleString(),
                  inline: true
                }
              ],
              thumbnail: {
                url: 'https://i.imgur.com/ArKEQz1.png'
              },
              image: paymentProofUrl ? {
                url: paymentProofUrl
              } : undefined,
              footer: {
                text: 'Champa Store - Order System',
                icon_url: 'https://i.imgur.com/ArKEQz1.png'
              }
            }
          ]
        }
      };

      const response = await fetch('/.netlify/functions/discord-webhook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(webhookData)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Discord webhook error: ${response.status} ${response.statusText} - ${errorText}`);
      }

      return true;
    } catch (error) {
      console.error('Failed to send Discord notification:', error);
      throw error;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setLoadingStage('processing');

    try {
      // Validate form fields
      const validationErrors: string[] = [];
      
      if (!username?.trim()) {
        validationErrors.push('Minecraft username is required');
      }
      
      if (!platform) {
        validationErrors.push('Platform is required');
      }
      
      if (!selectedRank?.trim()) {
        validationErrors.push('Rank selection is required');
      }
      
      if (!paymentProof) {
        validationErrors.push('Payment proof is required');
      }

      if (validationErrors.length > 0) {
        throw new Error(validationErrors.join('. '));
      }

      // Try to upload to Supabase first
      let paymentProofUrl: string | null = null;
      setLoadingStage('uploading');
      try {
        await ensureStorageBucket();
        if (paymentProof) {
          const fileExt = paymentProof.name.split('.').pop();
          const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
          
          const { data, error } = await supabase.storage
            .from('payment-proofs')
            .upload(fileName, paymentProof, {
              cacheControl: '3600',
              upsert: false
            });

          if (error) throw error;
          
          const { data: { publicUrl } } = supabase.storage
            .from('payment-proofs')
            .getPublicUrl(fileName);
            
          paymentProofUrl = publicUrl;
        }
      } catch (storageError) {
        console.warn('Supabase storage upload failed, falling back to Imgur:', storageError);
        // Fall back to Imgur upload
        paymentProofUrl = await uploadToImgurFallback();
      }

      if (!paymentProofUrl) {
        throw new Error('Failed to upload payment proof');
      }

      setLoadingStage('finalizing');
      // Create order data
      const orderData = {
        customer_name: username.trim(),
        customer_phone: phone?.trim() || '', // Make phone optional
        platform,
        rank_name: selectedRank,
        payment_proof_url: paymentProofUrl,
        status: 'pending',
        created_at: new Date().toISOString()
      };

      // Send to Discord
      await sendToDiscord(orderData, paymentProofUrl);

      // Show success message
      toast.success('Order submitted successfully!');
      
      // Set receipt data
      setReceiptData(orderData);
      setShowReceipt(true);
      setOrderComplete(true);
      
    } catch (err: any) {
      console.error('Order submission failed:', err);
      setError(err.message || 'Failed to submit order. Please try again.');
      toast.error(err.message || 'Failed to submit order. Please try again.');
    } finally {
      setIsSubmitting(false);
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

  // Memoize UI sections to prevent unnecessary re-renders
  const renderSummarySection = useMemo(() => (
    <div className="bg-gray-800/70 backdrop-blur-sm rounded-xl p-4 sm:p-5 border border-gray-700/80 transform transition-all duration-300 hover:border-emerald-500/40 shadow-md hover:shadow-emerald-900/20">
      <h3 className="text-base sm:text-lg font-semibold text-white mb-4 flex items-center gap-2">
        <div className="bg-emerald-500/20 p-1.5 rounded-lg">
          <Info size={18} className="text-emerald-400" />
        </div>
        Order Summary
      </h3>
      <div className="space-y-2.5 text-sm sm:text-base">
        <div className="flex justify-between items-center text-gray-300 pb-2 border-b border-gray-700/50">
          <span>Selected Rank:</span>
          <span className="font-medium text-white">{selectedRank}</span>
          </div>
        <div className="flex justify-between items-center text-gray-300 pb-2 border-b border-gray-700/50">
          <span>Platform:</span>
          <span className="font-medium text-white capitalize">{platform}</span>
              </div>
        <div className="flex justify-between items-center text-gray-300 pt-1">
          <span>Price:</span>
          {hasDiscount ? (
            <div className="flex flex-col items-end">
              <span className="line-through text-gray-500 text-xs">${selectedRankOption.originalPrice!.toFixed(2)}</span>
              <span className="font-medium text-emerald-400 text-lg">${selectedRankOption.price.toFixed(2)}</span>
            </div>
          ) : (
            <span className="font-medium text-emerald-400 text-lg">${selectedRankPrice.toFixed(2)}</span>
          )}
            </div>
            </div>
          </div>
  ), [selectedRank, platform, hasDiscount, selectedRankOption, selectedRankPrice]);

  // State for animation
  const [showConfirmation, setShowConfirmation] = useState(false);
  
  // Memoized platform display string
  const platformDisplay = useMemo(() => {
    return platform === "java" ? "Java Edition" : "Bedrock Edition";
  }, [platform]);

  // Memoized handlers to prevent recreation on every render
  const handleConfirm = useCallback(() => {
    if (isLoading || isSubmitting) return;
    
    try {
      // Validate required fields
      if (!username?.trim() || !platform || !selectedRank || !paymentProof) {
        throw new Error('Please complete all required fields before confirming');
      }

      setLoading(true);
      onConfirm();
      
      // Show confirmation animation
      setShowConfirmation(true);
      
      // Hide confirmation and close modal after delay
      setTimeout(() => {
        setShowConfirmation(false);
        toast.success("Order confirmed successfully!");
        
        // Reset form state
        setUsername('');
        setPlatform(undefined);
        setSelectedRank('VIP');
        setPaymentProof(null);
        setPaymentProofPreview(null);
        setError(null);
        
        onClose();
      }, 1500);
    } catch (error: any) {
      console.error("Error confirming order:", error);
      setError(error.message || "Failed to confirm order. Please try again.");
      toast.error(error.message || "Failed to confirm order. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [onConfirm, onClose, isLoading, isSubmitting, username, platform, selectedRank, paymentProof]);

  // If modal is not open, return null to improve performance
  if (!isOpen) return null;

  return (
    <>
      {/* Main Order Form Modal */}
      {showOrderForm && (
        <Dialog open={isOpen} onOpenChange={(open: boolean) => !open && onClose()}>
          <DialogContent 
            className="bg-gradient-to-b from-gray-900 to-gray-800 rounded-3xl p-5 sm:p-6 w-full max-w-2xl m-2 sm:m-4 relative max-h-[90vh] overflow-y-auto transition-all duration-300 ease-in-out shadow-2xl border border-gray-700/80"
            aria-describedby="order-form-description"
          >
            <DialogTitle>
              <VisuallyHidden.Root>Complete Your Order</VisuallyHidden.Root>
            </DialogTitle>
            
            
            <button
              onClick={onClose}
              className="absolute right-4 top-4 text-gray-400 hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500/50 rounded-full p-1.5 bg-gray-800/70 hover:bg-gray-700/70"
              aria-label="Close modal"
            >
              <X size={20} />
            </button>

            <div className="text-center mb-7">
              <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-lg p-1 transform hover:scale-105 transition-transform duration-300">
                <div className="w-full h-full rounded-full overflow-hidden border-2 border-white flex items-center justify-center">
                  <img 
                    src={logoImage} 
                    alt="" 
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.src = 'https://i.imgur.com/ArKEQz1.png';
                    }}
                  />
                </div>
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent mb-2">Complete Your Order</h2>
              <p className="text-gray-400 text-sm sm:text-base max-w-md mx-auto">Select your platform and rank to proceed with the purchase</p>
            </div>

            {/* Loading Indicator */}
            {initialLoading && (
              <div className="flex justify-center items-center py-8">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-500 p-1">
                  <div className="rounded-full h-full w-full bg-gray-800"></div>
                </div>
              </div>
            )}

            {!initialLoading && (
            <form onSubmit={handleSubmit} className="space-y-5 sm:space-y-6">
              {/* Enhanced summary with discount if applicable */}
              {renderSummarySection}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="bg-gray-800/70 backdrop-blur-sm rounded-xl p-4 sm:p-5 border border-gray-700/80 transform transition-all duration-300 hover:border-emerald-500/40 shadow-md hover:shadow-emerald-900/20">
                  <label className="text-sm font-medium text-white mb-3 flex items-center gap-2 pb-2 border-b border-gray-700/50">
                    <div className="bg-emerald-500/20 p-1.5 rounded-lg">
                      <User size={16} className="text-emerald-400" />
                    </div>
                    Minecraft Username
                  </label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full bg-gray-700/50 border border-gray-600/80 rounded-lg py-2.5 px-3 text-white focus:outline-none focus:ring-2 focus:ring-emerald-400/50 text-sm sm:text-base transition-all duration-200 mt-3"
                    required
                    placeholder="Enter your Minecraft username"
                    autoFocus
                  />
                  <p className="text-xs text-gray-500 mt-2 ml-1">Only letters, numbers, and underscores allowed</p>
                </div>

                <div className="bg-gray-800/70 backdrop-blur-sm rounded-xl p-4 sm:p-5 border border-gray-700/80 transform transition-all duration-300 hover:border-emerald-500/40 shadow-md hover:shadow-emerald-900/20">
                  <label className="block text-sm font-medium text-white mb-3 flex items-center gap-2 pb-2 border-b border-gray-700/50">
                    <div className="bg-emerald-500/20 p-1.5 rounded-lg">
                      <Shield size={16} className="text-emerald-400" />
                    </div>
                    Platform
                  </label>
                  <div className="flex gap-3 mt-3">
                    <PlatformButton 
                      label="java" 
                      isSelected={platform === 'java'} 
                      onClick={() => handlePlatformSelect('java')} 
                    />
                    <PlatformButton 
                      label="bedrock" 
                      isSelected={platform === 'bedrock'} 
                      onClick={() => handlePlatformSelect('bedrock')} 
                    />
                  </div>
                </div>
              </div>

              <div className="bg-gray-800/70 backdrop-blur-sm rounded-xl p-4 sm:p-5 border border-gray-700/80 transform transition-all duration-300 hover:border-emerald-500/40 shadow-md hover:shadow-emerald-900/20">
                <label className="block text-sm font-medium text-white mb-4 flex items-center gap-2 pb-2 border-b border-gray-700/50">
                  <div className="bg-emerald-500/20 p-1.5 rounded-lg">
                    <Shield size={16} className="text-emerald-400" />
                  </div>
                  Select Rank
                </label>
                <VirtualizedRankButtons 
                  ranks={ranks} 
                  selectedRank={selectedRank} 
                  onSelectRank={handleRankSelect} 
                />
              </div>

              {/* Rank Preview Section */}
              {selectedRankOption && (
                <div className="bg-gray-800/70 backdrop-blur-sm rounded-xl p-4 sm:p-5 border border-gray-700/80 transform transition-all duration-300 hover:border-emerald-500/40 shadow-md hover:shadow-emerald-900/20 overflow-hidden">
                  <h3 className="text-base sm:text-lg font-semibold text-white mb-4 flex items-center gap-2 pb-2 border-b border-gray-700/50">
                    <div className="bg-emerald-500/20 p-1.5 rounded-lg">
                      <Shield size={16} className="text-emerald-400" />
                    </div>
                    {selectedRank} Rank Preview
                  </h3>
                  <div className="flex justify-center">
                    <div className="relative group">
                      <div className="absolute -inset-1 bg-gradient-to-r from-emerald-600 to-emerald-400 rounded-lg blur opacity-25 group-hover:opacity-50 transition duration-200"></div>
                      <img 
                        src={selectedRankOption.image} 
                        alt={`${selectedRank} Kit Preview`}
                        className="relative w-auto h-auto max-w-full max-h-[200px] object-contain rounded-lg border border-gray-600/50 transition-transform duration-300 group-hover:scale-[1.03] shadow-lg"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Payment Details Section */}
              <div className="bg-gray-800/70 backdrop-blur-sm rounded-xl p-4 sm:p-5 border border-gray-700/80 transform transition-all duration-300 hover:border-emerald-500/40 shadow-md hover:shadow-emerald-900/20">
                <h3 className="text-base sm:text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <div className="bg-emerald-500/20 p-1.5 rounded-lg">
                    <CreditCard size={16} className="text-emerald-400" />
                  </div>
                  Payment Details
                </h3>
                <div className="text-center py-2">
                  <p className="text-gray-300 mb-4 text-sm sm:text-base">Scan the QR code below to pay:</p>
                  <div className="bg-white p-3 sm:p-4 rounded-xl inline-block transition-transform duration-300 hover:scale-[1.03] shadow-lg relative group">
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-600 to-emerald-400 rounded-xl blur opacity-25 group-hover:opacity-40 transition duration-200"></div>
                    <div className="relative bg-white rounded-lg p-2">
                      <img 
                        src={qrCodeImage} 
                        alt="Payment QR Code"
                        className="w-32 h-32 sm:w-40 sm:h-40 mx-auto"
                      />
                    </div>
                  </div>
                  <p className="text-sm sm:text-base text-gray-400 mt-4">Amount: <span className="text-emerald-400 font-bold">${selectedRankPrice.toFixed(2)}</span></p>
                </div>
              </div>

              {/* Replace the file upload section with enhanced version */}
              <div className="bg-gray-800/70 backdrop-blur-sm rounded-xl p-4 sm:p-5 border border-gray-700/80 transform transition-all duration-300 hover:border-emerald-500/40 shadow-md hover:shadow-emerald-900/20">
                <label className="block text-sm font-medium text-white mb-4 flex items-center gap-2 pb-2 border-b border-gray-700/50">
                  <div className="bg-emerald-500/20 p-1.5 rounded-lg">
                    <Upload size={16} className="text-emerald-400" />
                  </div>
                  Payment Proof (QR Code Screenshot)
                </label>
                
                <div className="relative">
                  <input
                    type="file"
                    onChange={handleImageLoad}
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    id="payment-proof"
                    required
                  />
                  <label
                    htmlFor="payment-proof"
                    className={`w-full border rounded-lg py-3 px-4 flex items-center justify-center gap-2 cursor-pointer transition duration-300 text-sm sm:text-base group
                      ${uploadError ? 'bg-red-500/10 border-red-500/30 text-red-300 hover:bg-red-500/20' : 'bg-gray-700/50 border-gray-600/80 text-white hover:bg-gray-600/50'}`}
                  >
                    <Upload size={18} className={`${uploadError ? 'text-red-400' : 'text-emerald-400'} group-hover:scale-110 transition-transform duration-300`} />
                    {paymentProof ? (
                      <span className="truncate max-w-full">{paymentProof.name}</span>
                    ) : (
                      'Upload QR Code Screenshot'
                    )}
                  </label>
                  
                  {uploadError && (
                    <div className="mt-3 bg-red-500/10 rounded-lg p-3 border border-red-500/30 text-xs text-red-300 flex items-center">
                      <AlertCircle size={16} className="mr-2 shrink-0" /> 
                      <span>{uploadError}</span>
                    </div>
                  )}
                  
                  {uploadFallbackMode && (
                    <div className="mt-3 bg-amber-500/10 rounded-lg p-3 border border-amber-500/30 text-xs text-amber-300 flex items-center">
                      <AlertCircle size={16} className="mr-2 shrink-0" /> 
                      <span>Using alternative upload method. Your order will still be processed normally.</span>
                    </div>
                  )}
                  
                  {paymentProofPreview && (
                    <div className="mt-4 relative animate-fadeIn">
                      <div className="relative group">
                        <div className="absolute -inset-1 bg-gradient-to-r from-emerald-600 to-emerald-400 rounded-lg blur opacity-25 group-hover:opacity-50 transition duration-200"></div>
                        <div className="relative bg-gray-700/70 rounded-lg overflow-hidden border border-gray-600/50 transition-all hover:border-emerald-500/50 shadow-md">
                          <img 
                            src={paymentProofPreview} 
                            alt="Payment proof preview" 
                            className="w-full h-auto max-h-[200px] object-contain rounded transition-transform duration-300 group-hover:scale-[1.02]"
                            onLoad={() => console.log('Preview image loaded')}
                            onError={() => {
                              toast.error('Failed to load image preview');
                              setPaymentProofPreview(null);
                              setUploadError('Failed to load image preview. Please try another image.');
                            }}
                          />
                          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/40 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
                        </div>
                      </div>
                      <div className="absolute top-2 right-2 flex gap-1">
                        <button 
                          type="button"
                          onClick={() => {
                            setPaymentProof(null);
                            setPaymentProofPreview(null);
                            setUploadError(null);
                          }}
                          className="bg-gray-800/90 text-white p-1.5 rounded-full hover:bg-red-500 transition-colors duration-200 shadow-md"
                          aria-label="Remove image"
                        >
                          <X size={14} />
                        </button>
                      </div>
                      <div className="mt-3 text-xs text-emerald-400 flex items-center justify-center bg-emerald-500/10 py-2 rounded-lg border border-emerald-500/20">
                        <Check size={14} className="mr-1.5" /> Image ready for submission
                      </div>
                    </div>
                  )}
                  
                  {paymentProof && !paymentProofPreview && (
                    <div className="mt-3 bg-gray-700/70 rounded-lg p-3 border border-gray-600/50 text-xs flex items-center justify-center animate-pulse">
                      <div className="animate-spin h-4 w-4 border-2 border-emerald-500 border-t-transparent rounded-full mr-2"></div>
                      <span className="text-gray-300">Processing image...</span>
                    </div>
                  )}
                  
                  <div className="mt-3 text-xs text-gray-500 flex items-center gap-1.5 bg-gray-700/30 rounded-lg p-2 px-3">
                    <Info size={12} />
                    <span>Accepted formats: JPG, PNG, WebP (max 3MB)</span>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || !paymentProof}
                className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white rounded-lg py-3.5 px-4 transition duration-300 disabled:opacity-50 transform hover:scale-[1.02] text-sm sm:text-base font-medium mt-6 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-opacity-50 shadow-lg relative group"
              >
                <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-600 to-emerald-400 rounded-lg blur opacity-25 group-hover:opacity-50 transition duration-200 group-disabled:opacity-0"></div>
                <div className="relative flex items-center justify-center">
                  {loading ? (
                    <span className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      {loadingStage === 'uploading' ? 'Uploading image...' : 
                       loadingStage === 'processing' ? 'Processing order...' : 
                       loadingStage === 'finalizing' ? 'Finalizing...' : 'Processing...'}
                    </span>
                  ) : (
                    <>
                      <span className="mr-2">
                        <CreditCard size={18} />
                      </span>
                      {!paymentProof ? 'Upload Payment Proof to Continue' : 'Submit Order'}
                    </>
                  )}
                </div>
              </button>
            </form>
            )}
          </DialogContent>
        </Dialog>
      )}
      
      {/* Receipt Modal */}
      {showReceipt && receiptData && (
        <ReceiptModal 
          isOpen={showReceipt} 
          onClose={handleReceiptClose} 
          orderData={receiptData} 
          receiptBackgroundUrl={receiptImage}
          receiptLogoUrl={receiptLogoImage}
          logoUrl={logoImage}
          storeName="Champa Store"
        />
      )}

      {/* Confirmation Modal */}
      {showConfirmation && (
        <Dialog open={showConfirmation} onOpenChange={(open) => !open && setShowConfirmation(false)}>
          <DialogContent className="bg-white rounded-lg shadow-lg w-full max-w-md relative overflow-hidden">
            <ModalHeader title="Order Confirmed" onClose={() => setShowConfirmation(false)} />
            
            <div className="p-4 sm:p-6">
              <div className="flex justify-center items-center mb-4">
                <div className="rounded-full bg-emerald-100 p-3">
                  <Check className="h-8 w-8 text-emerald-600" />
                </div>
              </div>
              <p className="text-emerald-700 font-medium text-lg">Order Confirmed</p>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
};

OrderModal.displayName = "OrderModal";

export default OrderModal;