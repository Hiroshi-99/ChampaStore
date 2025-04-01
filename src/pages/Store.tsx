import React, { useState, useEffect, useRef } from 'react';
import { ShoppingCart, Check, Star } from 'lucide-react';
import { OrderModal } from '../components/OrderModal';

function Store() {
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const tenorContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Load the Tenor embed script
    const script = document.createElement('script');
    script.src = 'https://tenor.com/embed.js';
    script.async = true;
    document.body.appendChild(script);

    return () => {
      // Clean up the script when component unmounts
      document.body.removeChild(script);
    };
  }, []);

  return (
    <div className="min-h-screen relative">
      {/* Background Container */}
      <div 
        className="absolute inset-0 z-0 overflow-hidden"
        style={{
          backgroundColor: 'white',
        }}
      >
        {/* Tenor GIF Background */}
        <div 
          ref={tenorContainerRef}
          className="tenor-gif-embed absolute inset-0 w-full h-full opacity-40" 
          data-postid="16891835739656681544" 
          data-share-method="host" 
          data-aspect-ratio="1.76596" 
          data-width="100%"
        >
          {/* The Tenor script will replace this div's contents */}
        </div>
      </div>

      {/* Content */}
      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Header */}
        <header className="p-6">
          <h1 className="text-black text-3xl font-bold">STORE</h1>
        </header>

        {/* Banner */}
        <div className="mx-auto w-full max-w-6xl px-4 mb-8">
          <div className="relative w-full overflow-hidden rounded-2xl shadow-2xl">
            {/* Banner Image */}
            <img 
              src="https://i.imgur.com/dIODmz4.jpeg"
              alt="Champa Store Banner" 
              className="w-full object-contain md:object-cover"
              style={{
                objectPosition: 'center'
              }}
            />
          </div>
        </div>

        {/* Main Content */}
        <main className="flex-1 flex items-center justify-center p-4">
          <div className="bg-gray-800/80 backdrop-blur-sm rounded-2xl p-8 max-w-md w-full text-center shadow-2xl">
            <h2 className="text-3xl font-bold text-white mb-6">Champa Ranks</h2>
            
            <div className="text-5xl font-bold text-emerald-400 mb-8">
              $9.99
            </div>

            <div className="space-y-4 mb-8">
              <div className="flex items-center text-white gap-3">
                <Check className="text-emerald-400" size={24} />
                <span>VIP Access</span>
              </div>
              <div className="flex items-center text-white gap-3">
                <Check className="text-emerald-400" size={24} />
                <span>Exclusive Features</span>
              </div>
              <div className="flex items-center text-white gap-3">
                <Check className="text-emerald-400" size={24} />
                <span>Priority Support</span>
              </div>
            </div>

            <button 
              onClick={() => setIsOrderModalOpen(true)}
              className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white rounded-lg py-3 px-6 flex items-center justify-center gap-2 transition duration-300 transform hover:scale-[1.02]"
            >
              <ShoppingCart size={20} />
              Purchase Now
            </button>
          </div>
        </main>

        {/* Footer */}
        <footer className="p-6 text-center text-white/80 text-sm">
          Copyright © 2024-2025 Cipher. All Rights Reserved.
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