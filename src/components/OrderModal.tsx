import React, { useState } from 'react';
import { X, Upload, Info, CreditCard, User } from 'lucide-react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

interface OrderModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface RankOption {
  name: string;
  price: number;
  color: string;
}

const RANKS: RankOption[] = [
  { name: 'VIP', price: 5, color: 'from-emerald-500 to-emerald-600' },
  { name: 'MVP', price: 10, color: 'from-blue-500 to-blue-600' },
  { name: 'MVP+', price: 15, color: 'from-purple-500 to-purple-600' },
  { name: 'LEGEND', price: 20, color: 'from-yellow-500 to-yellow-600' },
  { name: 'DEVIL', price: 25, color: 'from-red-500 to-red-600' },
  { name: 'INFINITY', price: 30, color: 'from-pink-500 to-pink-600' },
  { name: 'CHAMPA', price: 50, color: 'from-orange-500 to-orange-600' }
];

const DISCORD_WEBHOOK_URL = 'https://discord.com/api/webhooks/1326842035621068820/Os7gvio_nXdd6bM-mJ3eCxnoBVwlc7wvkCPpqFZITQMW3swCcTfZVFE45cmX1Aex4KVe'; // Replace with your Discord webhook URL

export function OrderModal({ isOpen, onClose }: OrderModalProps) {
  const [username, setUsername] = useState('');
  const [platform, setPlatform] = useState<'java' | 'bedrock'>('java');
  const [selectedRank, setSelectedRank] = useState<string>('VIP');
  const [paymentProof, setPaymentProof] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

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
        avatar_url: "https://i.imgur.com/R66g1Pe.jpg", // You can replace this with your logo URL
        content: "🎮 **NEW RANK ORDER!** 🎮",
        embeds: [
          {
            title: `New ${orderData.rank} Rank Order`,
            color: embedColor,
            description: `A new order has been received and is awaiting processing.`,
            fields: [
              {
                name: "👤 Customer",
                value: `\`${orderData.username}\``,
                inline: true
              },
              {
                name: "🎮 Platform",
                value: `\`${orderData.platform.toUpperCase()}\``,
                inline: true
              },
              {
                name: "⭐ Rank",
                value: `\`${orderData.rank}\``,
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
              url: "https://i.imgur.com/R66g1Pe.jpg"  // You can replace this with your logo URL
            },
            footer: {
              text: "Champa Store Order System",
              icon_url: "https://i.imgur.com/R66g1Pe.jpg"  // You can replace this with your logo URL
            },
            timestamp: new Date().toISOString()
          }
        ]
      };

      // Add the payment proof image as a separate embed to ensure it displays properly
      if (paymentProofUrl) {
        webhookContent.embeds.push({
          title: "💳 Payment Proof",
          color: embedColor,
          image: {
            url: paymentProofUrl
          }
        });
      }
      
      // Make the request to Discord webhook
      const response = await fetch(DISCORD_WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(webhookContent),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Discord webhook error:', errorText);
        throw new Error(`Failed to send Discord notification: ${response.status} ${response.statusText}`);
      }
      
      console.log('Discord webhook sent successfully');
    } catch (error) {
      console.error('Error sending Discord notification:', error);
      // Don't throw error to prevent blocking the order process
      // Just log it instead
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!paymentProof) throw new Error('Please upload payment proof');
      if (!username.trim()) throw new Error('Please enter your username');

      const selectedRankOption = RANKS.find(rank => rank.name === selectedRank);
      if (!selectedRankOption) throw new Error('Please select a valid rank');

      // Validate file type
      if (!paymentProof.type.startsWith('image/')) {
        throw new Error('Please upload a valid image file');
      }

      // Validate file size (max 5MB)
      if (paymentProof.size > 5 * 1024 * 1024) {
        throw new Error('Image size should be less than 5MB');
      }

      // Create the file path with proper formatting for Supabase
      const timestamp = new Date().getTime();
      const randomString = Math.random().toString(36).substring(2, 10);
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
      const supabaseUrl = 'https://feaxosxwaajfagfjkmrx.supabase.co';
      const publicUrl = `${supabaseUrl}/storage/v1/object/public/payment-proofs/${filePath}`;
      
      console.log('Payment proof URL:', publicUrl);

      // Create order
      const orderData = {
        username: username.trim(),
        platform,
        rank: selectedRank,
        price: selectedRankOption.price,
        payment_proof: uploadData.path,
        status: 'pending',
        created_at: new Date().toISOString()
      };

      const { error: orderError } = await supabase.from('orders').insert(orderData);

      if (orderError) {
        console.error('Order error:', orderError);
        throw new Error('Failed to create order. Please try again.');
      }

      // Send order information to Discord with the direct public URL
      try {
        await sendToDiscord(orderData, publicUrl);
      } catch (discordError) {
        console.error('Discord notification failed, but order was created:', discordError);
        // Continue with success even if Discord notification fails
      }

      toast.success('Order submitted successfully! We will process your order and send the rank details to your Discord.');
      setUsername('');
      setPlatform('java');
      setSelectedRank('VIP');
      setPaymentProof(null);
      onClose();
    } catch (error) {
      console.error('Submit error:', error);
      toast.error(error instanceof Error ? error.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const selectedRankOption = RANKS.find(rank => rank.name === selectedRank);
  const selectedRankPrice = selectedRankOption?.price || 0;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-gray-800/95 rounded-2xl p-8 max-w-2xl w-full m-4 relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-gray-400 hover:text-white transition-colors"
        >
          <X size={24} />
        </button>

        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-white mb-2">Complete Your Order</h2>
          <p className="text-gray-400">Select your platform and rank to proceed with the purchase</p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Left Column - Order Details */}
          <div className="space-y-6">
            <div className="bg-gray-700/50 rounded-lg p-4 border border-gray-600">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Info size={20} className="text-emerald-400" />
                Order Summary
              </h3>
              <div className="space-y-2">
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

            <div className="bg-gray-700/50 rounded-lg p-4 border border-gray-600">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <CreditCard size={20} className="text-emerald-400" />
                Payment Details
              </h3>
              <div className="text-center">
                <p className="text-gray-300 mb-4">Scan the QR code below to pay:</p>
                <div className="bg-white p-4 rounded-lg inline-block">
                  <img 
                    src="https://i.imgur.com/xmzqO4S.jpeg" 
                    alt="Payment QR Code"
                    className="w-48 h-48 mx-auto"
                  />
                </div>
                <p className="text-sm text-gray-400 mt-2">Amount: ${selectedRankPrice}</p>
              </div>
            </div>
          </div>

          {/* Right Column - Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1 flex items-center gap-2">
                <User size={16} className="text-emerald-400" />
                Minecraft Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-gray-700/50 border border-gray-600 rounded-lg py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-emerald-400"
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
                  className={`flex-1 py-2 px-4 rounded-lg border transition-colors ${
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
                  className={`flex-1 py-2 px-4 rounded-lg border transition-colors ${
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
              <div className="grid grid-cols-2 gap-2">
                {RANKS.map((rank) => (
                  <button
                    key={rank.name}
                    type="button"
                    onClick={() => setSelectedRank(rank.name)}
                    className={`py-3 px-4 rounded-lg border transition-all transform hover:scale-105 ${
                      selectedRank === rank.name
                        ? `bg-gradient-to-r ${rank.color} text-white border-transparent`
                        : 'bg-gray-700/50 text-gray-300 border-gray-600 hover:bg-gray-600/50'
                    }`}
                  >
                    <div className="font-medium">{rank.name}</div>
                    <div className="text-sm">${rank.price}</div>
                  </button>
                ))}
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
                  className="w-full bg-gray-700/50 border border-gray-600 rounded-lg py-3 px-4 text-white flex items-center justify-center gap-2 cursor-pointer hover:bg-gray-600/50 transition duration-300"
                >
                  <Upload size={20} />
                  {paymentProof ? paymentProof.name : 'Upload QR Code Screenshot'}
                </label>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white rounded-lg py-3 px-4 transition duration-300 disabled:opacity-50 transform hover:scale-[1.02]"
            >
              {loading ? 'Processing...' : 'Submit Order'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}