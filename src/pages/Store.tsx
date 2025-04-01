import React, { useState, useEffect } from 'react';
import { ShoppingCart, Check, ChevronLeft, ChevronRight } from 'lucide-react';
import { OrderModal } from '../components/OrderModal';

function Store() {
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);

  const bannerImages = [
    "https://i.imgur.com/8WJ8noJ.jpeg",
    "https://i.imgur.com/dIODmz4.jpeg",
    "https://i.imgur.com/OQJmGoB.jpeg"
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % bannerImages.length);
    }, 5000); // Change slide every 5 seconds

    return () => clearInterval(timer);
  }, []);

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % bannerImages.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + bannerImages.length) % bannerImages.length);
  };

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
          <div className="relative w-full overflow-hidden rounded-2xl shadow-2xl">
            {/* Banner Images */}
            <div 
              className="relative w-full h-[400px] transition-transform duration-500 ease-out"
              style={{ transform: `translateX(-${currentSlide * 100}%)` }}
            >
              <div className="absolute inset-0 flex">
                {bannerImages.map((image, index) => (
                  <div
                    key={index}
                    className="relative w-full h-full flex-shrink-0"
                    style={{ left: `${index * 100}%` }}
                  >
                    <img 
                      src={image}
                      alt={`Banner ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-r from-black/30 to-transparent"></div>
                  </div>
                ))}
              </div>
            </div>

            {/* Navigation Buttons */}
            <button 
              onClick={prevSlide}
              className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition-colors"
              aria-label="Previous slide"
            >
              <ChevronLeft size={24} />
            </button>
            <button 
              onClick={nextSlide}
              className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition-colors"
              aria-label="Next slide"
            >
              <ChevronRight size={24} />
            </button>

            {/* Slide Indicators */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
              {bannerImages.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentSlide(index)}
                  className={`w-2 h-2 rounded-full transition-all ${
                    currentSlide === index 
                      ? 'bg-white w-4' 
                      : 'bg-white/50 hover:bg-white/75'
                  }`}
                  aria-label={`Go to slide ${index + 1}`}
                />
              ))}
            </div>
            {/* Banner Content */}
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
            <h2 className="text-5xl text-white font-bold text-center mb-4">Champa Economy</h2>
            <p className="text-gray-300 text-center mb-12 max-w-2xl mx-auto text-lg">
              Experience the power of our premium ranks with exclusive features and benefits
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Premium Ranks Card */}
              <div className="bg-gray-800/80 backdrop-blur-sm rounded-2xl p-8 shadow-xl border border-gray-700 hover:border-emerald-500/50 transition-all duration-300">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-2xl font-bold text-white">Premium Ranks</h3>
                  <div className="bg-emerald-500/20 p-2 rounded-lg">
                    <ShoppingCart className="text-emerald-400" size={24} />
                  </div>
                </div>
                
                <div className="space-y-4 mb-8">
                  <div className="flex items-center justify-between p-3 bg-gray-700/30 rounded-lg">
                    <span className="text-emerald-400 font-semibold">VIP</span>
                    <span className="text-white">$5</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-700/30 rounded-lg">
                    <span className="text-blue-400 font-semibold">MVP</span>
                    <span className="text-white">$10</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-700/30 rounded-lg">
                    <span className="text-purple-400 font-semibold">MVP+</span>
                    <span className="text-white">$15</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-700/30 rounded-lg">
                    <span className="text-amber-400 font-semibold">LEGEND</span>
                    <span className="text-white">$25</span>
                  </div>
                </div>

                <button 
                  onClick={() => setIsOrderModalOpen(true)}
                  className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white rounded-lg py-3 px-6 flex items-center justify-center gap-2 transition duration-300"
                >
                  <ShoppingCart size={18} />
                  Purchase Rank
                </button>
              </div>

              {/* Features Card */}
              <div className="bg-gray-800/80 backdrop-blur-sm rounded-2xl p-8 shadow-xl border border-gray-700">
                <h3 className="text-2xl font-bold text-white mb-6">Premium Features</h3>
                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-3 bg-gray-700/30 rounded-lg">
                    <Check className="text-emerald-400" size={20} />
                    <div>
                      <h4 className="text-white font-semibold">VIP Access</h4>
                      <p className="text-gray-400 text-sm">Exclusive access to VIP areas and features</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-gray-700/30 rounded-lg">
                    <Check className="text-emerald-400" size={20} />
                    <div>
                      <h4 className="text-white font-semibold">Special Commands</h4>
                      <p className="text-gray-400 text-sm">Access to special commands and abilities</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-gray-700/30 rounded-lg">
                    <Check className="text-emerald-400" size={20} />
                    <div>
                      <h4 className="text-white font-semibold">Priority Support</h4>
                      <p className="text-gray-400 text-sm">Get priority access to support services</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-gray-700/30 rounded-lg">
                    <Check className="text-emerald-400" size={20} />
                    <div>
                      <h4 className="text-white font-semibold">Custom Perks</h4>
                      <p className="text-gray-400 text-sm">Unique perks based on your rank level</p>
                    </div>
                  </div>
                </div>
              </div>
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