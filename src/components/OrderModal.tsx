import React, { useState } from 'react';
import { X, Upload } from 'lucide-react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

interface OrderModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface RankOption {
  name: string;
  price: number;
}

const RANKS: RankOption[] = [
  { name: 'VIP', price: 5 },
  { name: 'MVP', price: 10 },
  { name: 'MVP+', price: 15 },
  { name: 'LEGEND', price: 20 },
  { name: 'DEVIL', price: 25 },
  { name: 'INFINITY', price: 30 },
  { name: 'CHAMPA', price: 50 }
];

export function OrderModal({ isOpen, onClose }: OrderModalProps) {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!paymentProof) throw new Error('Please upload payment proof');
      if (!username.trim()) throw new Error('Please enter your username');
      if (!email.trim()) throw new Error('Please enter your email');

      const selectedRankOption = RANKS.find(rank => rank.name === selectedRank);
      if (!selectedRankOption) throw new Error('Please select a valid rank');

      // Upload payment proof
      const fileExt = paymentProof.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const { error: uploadError, data } = await supabase.storage
        .from('payment-proofs')
        .upload(`guest/${fileName}`, paymentProof);

      if (uploadError) throw uploadError;

      // Create order
      const { error: orderError } = await supabase.from('orders').insert({
        username: username.trim(),
        email: email.trim(),
        platform,
        rank: selectedRank,
        price: selectedRankOption.price,
        payment_proof: data.path,
        status: 'pending'
      });

      if (orderError) throw orderError;

      toast.success('Order submitted successfully! We will process your order and send the rank details to your email.');
      setUsername('');
      setEmail('');
      setPlatform('java');
      setSelectedRank('VIP');
      setPaymentProof(null);
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const selectedRankPrice = RANKS.find(rank => rank.name === selectedRank)?.price || 0;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-gray-800/95 rounded-2xl p-8 max-w-md w-full m-4 relative">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-gray-400 hover:text-white"
        >
          <X size={24} />
        </button>

        <h2 className="text-2xl font-bold text-white mb-6">Complete Your Order</h2>

        {/* QR Code Display */}
        <div className="mb-8 text-center">
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

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Minecraft Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-gray-700/50 border border-gray-600 rounded-lg py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-emerald-400"
              required
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
                  className={`py-2 px-4 rounded-lg border transition-colors ${
                    selectedRank === rank.name
                      ? 'bg-emerald-500 text-white border-emerald-600'
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
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-gray-700/50 border border-gray-600 rounded-lg py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-emerald-400"
              required
            />
            <p className="text-sm text-gray-400 mt-1">
              We'll send your rank details to this email
            </p>
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
                className="w-full bg-gray-700/50 border border-gray-600 rounded-lg py-2 px-3 text-white flex items-center justify-center gap-2 cursor-pointer hover:bg-gray-600/50 transition duration-300"
              >
                <Upload size={20} />
                {paymentProof ? paymentProof.name : 'Upload QR Code Screenshot'}
              </label>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg py-2 px-4 transition duration-300 disabled:opacity-50"
          >
            {loading ? 'Processing...' : 'Submit Order'}
          </button>
        </form>
      </div>
    </div>
  );
}