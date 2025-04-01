import React, { useState } from 'react';
import { ShoppingCart, Check } from 'lucide-react';
import { OrderModal } from '../components/OrderModal';

function Store() {
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);

  return (
    <div className="min-h-screen relative">
      {/* Background Video */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        <video
          autoPlay
          loop
          muted
          playsInline
          className="absolute w-full h-full object-cover"
          style={{
            filter: 'brightness(0.4)'
          }}
        >
          <source src="/videos/background.mp4" type="video/mp4" />
          {/* Fallback to gradient background if video doesn't load */}
          <div 
            className="absolute inset-0 z-0 bg-gradient-to-b from-gray-900 to-gray-800"
          />
        </video>
      </div>

      {/* Content */}
      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Header */}
        <header className="p-6 flex justify-between items-center border-b border-white/10">
          <div className="flex items-center gap-4">
            <img 
              src="https://i.imgur.com/dIODmz4.jpeg" 
              alt="Champa Logo" 
              className="w-10 h-10 rounded-full border-2 border-emerald-500"
            />
            <h1 className="text-white text-2xl font-bold tracking-wider">CHAMPA STORE</h1>
          </div>
        </header>

        {/* Banner */}
        <div className="mx-auto w-full max-w-6xl px-4 mt-4 mb-8">
          <div className="relative w-full overflow-hidden rounded-2xl shadow-2xl animate-fade-in">
            <div className="absolute inset-0 bg-gradient-to-r from-black/30 to-transparent z-10"></div>
            <img 
              src="https://i.imgur.com/dIODmz4.jpeg"
              alt="Champa Store Banner" 
              className="w-full object-cover h-80"
            />
            <div className="absolute inset-0 z-20 flex flex-col justify-center p-8 md:p-16">
              <h2 className="text-5xl md:text-6xl font-bold text-white drop-shadow-lg mb-4">
                Champa <span className="text-emerald-400">Ranks</span>
              </h2>
              <p className="text-white/90 text-lg md:text-xl max-w-md">
                Enhance your gameplay experience with our premium ranks
              </p>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <main className="flex-1 px-4 py-8">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl text-white font-bold text-center mb-2">Premium Rank Packages</h2>
            <p className="text-gray-300 text-center mb-12 max-w-2xl mx-auto">
              Choose from our selection of premium ranks to enhance your gameplay experience with exclusive perks and features
            </p>
            
            {/* Simplified Ranks Display */}
            <div className="bg-gray-800/80 backdrop-blur-sm rounded-2xl p-8 max-w-3xl mx-auto shadow-xl border border-gray-700">
              <div className="mb-6">
                <h3 className="text-2xl font-bold text-white mb-4">Available Ranks</h3>
                <table className="w-full text-left text-gray-300">
                  <thead>
                    <tr className="border-b border-gray-700">
                      <th className="py-3 px-2 font-semibold">Rank</th>
                      <th className="py-3 px-2 font-semibold text-right">Price</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-gray-700/50">
                      <td className="py-3 px-2">
                        <span className="inline-block bg-emerald-500/20 text-emerald-400 px-3 py-1 rounded-full font-semibold">VIP</span>
                      </td>
                      <td className="py-3 px-2 text-right">$5</td>
                    </tr>
                    <tr className="border-b border-gray-700/50">
                      <td className="py-3 px-2">
                        <span className="inline-block bg-blue-500/20 text-blue-400 px-3 py-1 rounded-full font-semibold">MVP</span>
                      </td>
                      <td className="py-3 px-2 text-right">$10</td>
                    </tr>
                    <tr className="border-b border-gray-700/50">
                      <td className="py-3 px-2">
                        <span className="inline-block bg-purple-500/20 text-purple-400 px-3 py-1 rounded-full font-semibold">MVP+</span>
                      </td>
                      <td className="py-3 px-2 text-right">$15</td>
                    </tr>
                    <tr>
                      <td className="py-3 px-2">
                        <span className="inline-block bg-amber-500/20 text-amber-400 px-3 py-1 rounded-full font-semibold">LEGEND</span>
                      </td>
                      <td className="py-3 px-2 text-right">$25</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              
              <div className="space-y-3 mb-8">
                <h3 className="text-xl font-bold text-white mb-4">Features Include:</h3>
                <div className="flex items-center text-gray-300 gap-3">
                  <Check className="text-emerald-400" size={18} />
                  <span>VIP Access</span>
                </div>
                <div className="flex items-center text-gray-300 gap-3">
                  <Check className="text-emerald-400" size={18} />
                  <span>Exclusive Features</span>
                </div>
                <div className="flex items-center text-gray-300 gap-3">
                  <Check className="text-emerald-400" size={18} />
                  <span>Priority Support</span>
                </div>
              </div>
              
              <button 
                onClick={() => setIsOrderModalOpen(true)}
                className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white rounded-lg py-3 px-6 flex items-center justify-center gap-2 transition duration-300"
              >
                <ShoppingCart size={18} />
                Purchase Now
              </button>
            </div>
            
            <div className="mt-16 p-8 bg-gray-800/60 backdrop-blur-sm rounded-2xl shadow-xl border border-gray-700 text-center">
              <h3 className="text-2xl font-bold text-white mb-4">Custom Rank Packages</h3>
              <p className="text-gray-300 mb-6 max-w-2xl mx-auto">
                Looking for something special? Contact us for custom rank packages tailored to your needs.
              </p>
              <button 
                onClick={() => setIsOrderModalOpen(true)}
                className="bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white rounded-lg py-3 px-6 inline-flex items-center justify-center gap-2 transition duration-300 transform hover:scale-[1.02]"
              >
                <ShoppingCart size={18} />
                Get Custom Package
              </button>
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer className="p-6 text-center text-white/80 text-sm border-t border-white/10 mt-auto">
          <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
            <div>
              Copyright © 2024-2025 ChampaMCxDL. All Rights Reserved.
            </div>
            <div className="flex gap-6">
              <a href="#" className="hover:text-emerald-400 transition-colors">Terms</a>
              <a href="#" className="hover:text-emerald-400 transition-colors">Privacy</a>
              <a href="#" className="hover:text-emerald-400 transition-colors">Contact</a>
            </div>
          </div>
        </footer>
      </div>
      
      <OrderModal
        isOpen={isOrderModalOpen}
        onClose={() => setIsOrderModalOpen(false)}
      />
    </div>
  );
}

export default Store;