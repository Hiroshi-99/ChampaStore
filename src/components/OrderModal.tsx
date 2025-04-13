import React, { useState, useEffect } from 'react';
import { X, Upload, Info, CreditCard, User, Shield } from 'lucide-react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import { sanitizeInput, sanitizeDiscordContent } from '../utils/sanitize';
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
const rateLimitStore = new Map<string, { attempts: number; timestamp: number }>();

export function OrderModal({ isOpen, onClose }: OrderModalProps) {
  const [username, setUsername] = useState('');
  const [platform, setPlatform] = useState<'java' | 'bedrock'>('java');
  const [selectedRank, setSelectedRank] = useState<string>('VIP');
  const [paymentProof, setPaymentProof] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [receiptData, setReceiptData] = useState<any>(null);
  const [orderComplete, setOrderComplete] = useState(false);

  // If order complete and receipt is showing, hide the order form
  const showOrderForm = isOpen && !(orderComplete && showReceipt);

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
  const checkRateLimit = (identifier: string): boolean => {
    const now = Date.now();
    const userRateLimit = rateLimitStore.get(identifier);

    if (!userRateLimit) {
      rateLimitStore.set(identifier, { attempts: 1, timestamp: now });
      return true;
    }

    if (now - userRateLimit.timestamp > RATE_LIMIT_DURATION) {
      rateLimitStore.set(identifier, { attempts: 1, timestamp: now });
      return true;
    }

    if (userRateLimit.attempts >= MAX_ATTEMPTS) {
      return false;
    }

    userRateLimit.attempts += 1;
    return true;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setPaymentProof(e.target.files[0]);
    }
  };

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

    try {
      // Rate limit check using IP or username as identifier
      const identifier = username.toLowerCase(); // In production, use IP address
      if (!checkRateLimit(identifier)) {
        throw new Error('Too many attempts. Please try again later.');
      }

      // Input validation
      if (!paymentProof) throw new Error('Please upload payment proof');
      if (!username.trim()) throw new Error('Please enter your username');
      if (username.length > 50) throw new Error('Username is too long');
      if (!/^[a-zA-Z0-9_]{3,16}$/.test(username.trim())) {
        throw new Error('Invalid Minecraft username format');
      }

      const selectedRankOption = RANKS.find(rank => rank.name === selectedRank);
      if (!selectedRankOption) throw new Error('Please select a valid rank');

      // File validation
      if (!paymentProof.type.startsWith('image/')) {
        throw new Error('Please upload a valid image file');
      }

      // Validate file size (max 5MB)
      if (paymentProof.size > 5 * 1024 * 1024) {
        throw new Error('Image size should be less than 5MB');
      }

      // Validate file type more strictly
      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
      if (!allowedTypes.includes(paymentProof.type)) {
        throw new Error('Please upload a JPG, PNG, or WebP image');
      }

      // Create the file path with proper formatting for Supabase
      const timestamp = Date.now();
      const randomString = crypto.randomUUID().slice(0, 8);
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

      // Construct the absolute public URL for the image manually to ensure it works
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const publicUrl = `${supabaseUrl}/storage/v1/object/public/payment-proofs/${filePath}`;
      

      // Create order with all required fields
      const orderData = {
        username: username.trim(),
        platform,
        rank: selectedRank,
        price: selectedRankOption.price,
        payment_proof: uploadData.path,
        created_at: new Date().toISOString(),
        status: 'pending' // Ensure status field is included
      };

      console.log('Sending order data:', orderData);

      // First, check if the orders table exists and has the correct structure
      const { error: checkError } = await supabase
        .from('orders')
        .select('id')
        .limit(1);

      if (checkError) {
        console.error('Table check error:', checkError);
        
        // If there's an issue with the table, attempt to provide helpful information
        if (checkError.message.includes('relation "orders" does not exist')) {
          throw new Error('Orders table does not exist. Please contact support.');
        }
      }

      // Insert the order with explicit column selection
      const { error: orderError, data: orderResponse } = await supabase
        .from('orders')
        .insert(orderData)
        .select('id');

      if (orderError) {
        console.error('Order error:', orderError);
        
        // Provide more specific error messages based on common issues
        if (orderError.message && orderError.message.includes('violates not-null constraint')) {
          throw new Error('Missing required field in order data. Please try again or contact support.');
        } else if (orderError.message && orderError.message.includes('duplicate key')) {
          throw new Error('This order already exists. Please try again with different information.');
        } else {
          throw new Error('Failed to create order. Please try again.');
        }
      }

      // Send order information to Discord with the direct public URL
      try {
        await sendToDiscord(orderData, publicUrl);
      } catch (discordError) {
        console.error('Discord notification failed, but order was created:', discordError);
        // Continue with success even if Discord notification fails
      }

      toast.success('Order submitted successfully! We will process your order.');
      
      // Prepare receipt data
      const orderCompleteData = {
        ...orderData,
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
      toast.error(error instanceof Error ? error.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleReceiptClose = () => {
    setShowReceipt(false);
    setReceiptData(null);
    setOrderComplete(false);
    onClose();
  };

  const selectedRankOption = RANKS.find(rank => rank.name === selectedRank);
  const selectedRankPrice = selectedRankOption?.price || 0;

  return (
    <>
      {/* Main Order Form Modal */}
      {showOrderForm && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-2 sm:p-4 overflow-hidden">
          <div className="bg-gray-800/95 rounded-2xl p-4 sm:p-6 md:p-8 w-full max-w-2xl m-2 sm:m-4 relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={onClose}
              className="absolute right-3 top-3 sm:right-4 sm:top-4 text-gray-400 hover:text-white transition-colors"
              aria-label="Close modal"
            >
              <X size={24} />
            </button>

            <div className="text-center mb-6">
              <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">Complete Your Order</h2>
              <p className="text-gray-400 text-sm sm:text-base">Select your platform and rank to proceed with the purchase</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
              <div className="bg-gray-700/50 rounded-lg p-3 sm:p-4 border border-gray-600">
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
                  className="w-full bg-gray-700/50 border border-gray-600 rounded-lg py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-emerald-400 text-sm sm:text-base"
                  required
                  placeholder="Enter your Minecraft username"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Platform
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setPlatform('java')}
                    className={`flex-1 py-2 px-3 sm:px-4 rounded-lg border transition-colors text-sm sm:text-base ${
                      platform === 'java'
                        ? 'bg-emerald-500 text-white border-emerald-600'
                        : 'bg-gray-700/50 text-gray-300 border-gray-600 hover:bg-gray-600/50'
                    }`}
                  >
                    Java
                  </button>
                  <button
                    type="button"
                    onClick={() => setPlatform('bedrock')}
                    className={`flex-1 py-2 px-3 sm:px-4 rounded-lg border transition-colors text-sm sm:text-base ${
                      platform === 'bedrock'
                        ? 'bg-emerald-500 text-white border-emerald-600'
                        : 'bg-gray-700/50 text-gray-300 border-gray-600 hover:bg-gray-600/50'
                    }`}
                  >
                    Bedrock
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Select Rank
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                  {RANKS.map((rank) => (
                    <button
                      key={rank.name}
                      type="button"
                      onClick={() => setSelectedRank(rank.name)}
                      className={`py-2 sm:py-3 px-2 sm:px-3 rounded-lg border transition-all transform hover:scale-[1.02] text-sm ${
                        selectedRank === rank.name
                          ? `bg-gradient-to-r ${rank.color} text-white border-transparent`
                          : 'bg-gray-700/50 text-gray-300 border-gray-600 hover:bg-gray-600/50'
                      }`}
                    >
                      <div className="font-medium truncate">{rank.name}</div>
                      <div className="text-xs sm:text-sm">${rank.price}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Rank Preview Section */}
              {selectedRankOption && (
                <div className="bg-gray-700/50 rounded-lg p-3 sm:p-4 border border-gray-600">
                  <h3 className="text-base sm:text-lg font-semibold text-white mb-3 sm:mb-4 flex items-center gap-2">
                    <Shield size={18} className="text-emerald-400" />
                    {selectedRank} Rank Preview
                  </h3>
                  <div className="flex justify-center">
                    <img 
                      src={selectedRankOption.image} 
                      alt={`${selectedRank} Kit Preview`}
                      className="w-auto h-auto max-w-full max-h-[250px] object-contain rounded-lg border border-gray-600"
                    />
                  </div>
                </div>
              )}

              {/* Payment Details Section */}
              <div className="bg-gray-700/50 rounded-lg p-3 sm:p-4 border border-gray-600">
                <h3 className="text-base sm:text-lg font-semibold text-white mb-3 sm:mb-4 flex items-center gap-2">
                  <CreditCard size={18} className="text-emerald-400" />
                  Payment Details
                </h3>
                <div className="text-center">
                  <p className="text-gray-300 mb-3 text-sm sm:text-base">Scan the QR code below to pay:</p>
                  <div className="bg-white p-2 sm:p-4 rounded-lg inline-block">
                    <img 
                      src="/images/qr/qrcode.jpg" 
                      alt="Payment QR Code"
                      className="w-36 h-36 sm:w-48 sm:h-48 mx-auto"
                    />
                  </div>
                  <p className="text-xs sm:text-sm text-gray-400 mt-2">Amount: ${selectedRankPrice}</p>
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
                    className="w-full bg-gray-700/50 border border-gray-600 rounded-lg py-2 sm:py-3 px-3 sm:px-4 text-white flex items-center justify-center gap-2 cursor-pointer hover:bg-gray-600/50 transition duration-300 text-sm sm:text-base"
                  >
                    <Upload size={18} />
                    {paymentProof ? (
                      <span className="truncate max-w-full">{paymentProof.name}</span>
                    ) : (
                      'Upload QR Code Screenshot'
                    )}
                  </label>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white rounded-lg py-3 px-4 transition duration-300 disabled:opacity-50 transform hover:scale-[1.02] text-sm sm:text-base font-medium mt-2"
              >
                {loading ? 'Processing...' : 'Submit Order'}
              </button>
            </form>
          </div>
        </div>
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