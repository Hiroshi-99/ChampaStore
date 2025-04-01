import React, { useState } from 'react';
import { ShoppingCart, Check } from 'lucide-react';
import { OrderModal } from '../components/OrderModal';

interface Rank {
  name: string;
  price: number;
  features: string[];
}

const ranks: Rank[] = [
  {
    name: 'VIP',
    price: 5,
    features: ['Basic VIP Access', 'Chat Format', 'Custom Prefix']
  },
  {
    name: 'MVP',
    price: 10,
    features: ['VIP Features', 'Custom Nickname', 'Particle Effects']
  },
  {
    name: 'MVP+',
    price: 15,
    features: ['MVP Features', 'Custom Join Message', 'More Particle Effects']
  },
  {
    name: 'LEGEND',
    price: 20,
    features: ['MVP+ Features', 'Custom Chat Color', 'Exclusive Commands']
  },
  {
    name: 'DEVIL',
    price: 25,
    features: ['LEGEND Features', 'Custom Kill Messages', 'Special Effects']
  },
  {
    name: 'INFINITY',
    price: 30,
    features: ['DEVIL Features', 'Custom Join Sound', 'Advanced Commands']
  },
  {
    name: 'CHAMPA',
    price: 50,
    features: ['All Previous Features', 'Exclusive Events Access', 'Priority Support']
  }
];

function Store() {
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [selectedRank, setSelectedRank] = useState<Rank | null>(null);

  const handlePurchaseClick = (rank: Rank) => {
    setSelectedRank(rank);
    setIsOrderModalOpen(true);
  };

  return (
    <div className="min-h-screen relative">
      {/* Background Image */}
      <div 
        className="absolute inset-0 z-0"
        style={{
          backgroundImage: 'url("https://images.unsplash.com/photo-1607988795691-3d0147b43231?auto=format&fit=crop&q=80")',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          filter: 'brightness(0.8)'
        }}
      />

      {/* Content */}
      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Header */}
        <header className="p-6">
          <h1 className="text-white text-3xl font-bold">CHAMPA RANKS</h1>
        </header>

        {/* Main Content */}
        <main className="flex-1 p-4">
          <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {ranks.map((rank) => (
              <div key={rank.name} className="bg-gray-800/80 backdrop-blur-sm rounded-2xl p-6 text-center shadow-2xl">
                <h2 className="text-2xl font-bold text-white mb-4">{rank.name}</h2>
                
                <div className="text-4xl font-bold text-emerald-400 mb-6">
                  ${rank.price}
                </div>

                <div className="space-y-3 mb-6">
                  {rank.features.map((feature, index) => (
                    <div key={index} className="flex items-center text-white gap-3">
                      <Check className="text-emerald-400" size={20} />
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>

                <button 
                  onClick={() => handlePurchaseClick(rank)}
                  className="w-full bg-gray-700/80 hover:bg-gray-600/80 text-white rounded-lg py-3 px-6 flex items-center justify-center gap-2 transition duration-300"
                >
                  <ShoppingCart size={20} />
                  Purchase {rank.name}
                </button>
              </div>
            ))}
          </div>
        </main>

        {/* Footer */}
        <footer className="p-6 text-center text-white/80 text-sm">
          Copyright © 2024-2025 Cipher. All Rights Reserved.
        </footer>
      </div>
      
      {selectedRank && (
        <OrderModal
          isOpen={isOrderModalOpen}
          onClose={() => setIsOrderModalOpen(false)}
          rank={selectedRank}
        />
      )}
    </div>
  );
}

export default Store;