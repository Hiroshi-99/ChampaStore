import React, { useState, memo, lazy, Suspense } from 'react';
import { ShoppingCart, Check, Server } from 'lucide-react';

// Lazy load modals for better initial load performance
const OrderModal = lazy(() => import('../components/OrderModal'));
const ServerStatusModal = lazy(() => import('../components/ServerStatusModal'));

// Memoized feature item component for better performance
const FeatureItem = memo(({ icon: Icon, title, description }: { icon: React.ElementType, title: string, description: string }) => (
  <div className="flex items-center gap-3 p-2 sm:p-3 bg-gray-700/30 rounded-lg hover:bg-gray-700/50 transition-colors">
    <Icon className="text-emerald-400 flex-shrink-0" size={18} />
    <div>
      <h4 className="text-white font-semibold text-sm sm:text-base">{title}</h4>
      <p className="text-gray-400 text-xs sm:text-sm">{description}</p>
    </div>
  </div>
));

// Extract card components to minimize re-renders
const PremiumFeaturesCard = memo(({ features, onOpenOrderModal }: { 
  features: Array<{ icon: React.ElementType, title: string, description: string }>,
  onOpenOrderModal: () => void
}) => (
              <div className="bg-gray-800/80 backdrop-blur-sm rounded-xl sm:rounded-2xl p-4 sm:p-6 md:p-8 shadow-lg sm:shadow-xl border border-gray-700">
                <h3 className="text-xl sm:text-2xl font-bold text-white mb-4 sm:mb-6">Premium Features</h3>
                <div className="space-y-3 sm:space-y-4 mb-6 sm:mb-8">
      {features.map((item, index) => (
                    <FeatureItem 
                      key={index}
                      icon={item.icon}
                      title={item.title}
                      description={item.description}
                    />
                  ))}
                </div>
                
                <button 
      onClick={onOpenOrderModal}
                  className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white rounded-lg py-2.5 sm:py-3 px-4 sm:px-6 flex items-center justify-center gap-2 transition duration-300 transform hover:scale-[1.02] text-sm sm:text-base font-medium"
                >
                  <ShoppingCart size={16} className="sm:hidden" />
                  <ShoppingCart size={18} className="hidden sm:block" />
                  Purchase Rank
                </button>
              </div>
));

const MinecraftAccountCard = memo(() => (
              <div className="bg-gray-800/80 backdrop-blur-sm rounded-xl sm:rounded-2xl p-4 sm:p-6 md:p-8 shadow-lg sm:shadow-xl border border-gray-700">
                <h3 className="text-xl sm:text-2xl font-bold text-white mb-4 sm:mb-6">Minecraft Accounts</h3>
                <div className="space-y-3 sm:space-y-4 mb-6 sm:mb-8">
                  <div className="flex items-center gap-3 p-2 sm:p-3 bg-gray-700/30 rounded-lg hover:bg-gray-700/50 transition-colors">
                    <Check className="text-emerald-400 flex-shrink-0" size={18} />
                    <div>
                      <h4 className="text-white font-semibold text-sm sm:text-base">Full Access Account</h4>
                      <p className="text-gray-400 text-xs sm:text-sm">Original Minecraft account with full access</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-2 sm:p-3 bg-gray-700/30 rounded-lg hover:bg-gray-700/50 transition-colors">
                    <Check className="text-emerald-400 flex-shrink-0" size={18} />
                    <div>
                      <h4 className="text-white font-semibold text-sm sm:text-base">Email Access</h4>
                      <p className="text-gray-400 text-xs sm:text-sm">Complete email access included</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-2 sm:p-3 bg-gray-700/30 rounded-lg hover:bg-gray-700/50 transition-colors">
                    <Check className="text-emerald-400 flex-shrink-0" size={18} />
                    <div>
                      <h4 className="text-white font-semibold text-sm sm:text-base">Instant Delivery</h4>
                      <p className="text-gray-400 text-xs sm:text-sm">Get your account details instantly after purchase</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-2 sm:p-3 bg-gray-700/30 rounded-lg hover:bg-gray-700/50 transition-colors">
                    <Check className="text-emerald-400 flex-shrink-0" size={18} />
                    <div>
                      <h4 className="text-white font-semibold text-sm sm:text-base">24/7 Support</h4>
                      <p className="text-gray-400 text-xs sm:text-sm">Full support for any issues or questions</p>
                    </div>
                  </div>
                </div>
                
                <button 
                  onClick={() => window.open('https://cipher88.store', '_blank')}
                  className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-lg py-2.5 sm:py-3 px-4 sm:px-6 flex items-center justify-center gap-2 transition duration-300 transform hover:scale-[1.02] text-sm sm:text-base font-medium"
                >
                  <ShoppingCart size={16} className="sm:hidden" />
                  <ShoppingCart size={18} className="hidden sm:block" />
                  Buy Account
                </button>
              </div>
));

const Store: React.FC = () => {
  const [isOrderModalOpen, setIsOrderModalOpen] = useState<boolean>(false);
  const [isServerStatusModalOpen, setIsServerStatusModalOpen] = useState<boolean>(false);

  // Feature items data
  const featureItems = [
    { icon: Check, title: "Role Discord Access", description: "Exclusive access to VIP room" },
    { icon: Check, title: "Special Commands", description: "Access to special commands and abilities" },
    { icon: Check, title: "Priority Support", description: "Get priority access to support services" },
    { icon: Check, title: "Custom Perks", description: "Unique perks based on your rank level" }
  ];

  return (
    <div className="min-h-screen relative">
      {/* Background Video - with preload="metadata" for better initial load */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        <video
          autoPlay
          loop
          muted
          playsInline
          preload="metadata"
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
        <header className="p-4 sm:p-6 flex justify-between items-center border-b border-white/10">
          <div className="flex items-center gap-3">
            <img 
              src="https://i.imgur.com/ArKEQz1.png" 
              alt="Champa Logo" 
              className="w-8 h-8 sm:w-10 sm:h-10 rounded-full border-2 border-emerald-500"
              width={40}
              height={40}
              loading="eager"
              fetchPriority="high"
            />
            <h1 className="text-white text-xl sm:text-2xl font-bold tracking-wider">CHAMPA STORE</h1>
          </div>
          
          {/* Join Champa Now Button */}
          <button
            onClick={() => setIsServerStatusModalOpen(true)}
            className="hidden sm:flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            <Server size={18} />
            Join Champa Now!
          </button>
          
          {/* Mobile Join Button */}
          <button
            onClick={() => setIsServerStatusModalOpen(true)}
            className="sm:hidden flex items-center justify-center bg-emerald-600 hover:bg-emerald-700 text-white w-10 h-10 rounded-lg transition-colors"
            aria-label="Join Champa Now"
          >
            <Server size={18} />
          </button>
        </header>

        {/* Static Banner */}
        <div className="mx-auto w-full max-w-6xl px-3 sm:px-4 mt-3 sm:mt-4 mb-4 sm:mb-8">
          <div className="relative w-full overflow-hidden rounded-xl sm:rounded-2xl shadow-xl sm:shadow-2xl">
            <div className="w-full h-[200px] sm:h-[300px] md:h-[400px]">
              <img 
                src="/images/banner.gif"
                alt="Champa Banner"
                className="w-full h-full object-cover"
                loading="eager"
                fetchPriority="high"
                width={1200}
                height={400}
              />
            </div>
          </div>
        </div>

        {/* Main Content */}
        <main className="flex-1 px-3 sm:px-4 py-4 sm:py-8">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl sm:text-4xl md:text-5xl text-white font-bold text-center mb-2 sm:mb-4">Champa Economy</h2>
            <p className="text-gray-300 text-center mb-6 sm:mb-12 max-w-2xl mx-auto text-sm sm:text-base md:text-lg">
              Experience the power of our premium ranks and get your own Minecraft account
            </p>
            
            {/* Features Grid */}
            <div className="grid md:grid-cols-2 gap-6 max-w-6xl mx-auto">
              {/* Premium Features Card - Using memoized component */}
              <PremiumFeaturesCard 
                features={featureItems} 
                onOpenOrderModal={() => setIsOrderModalOpen(true)} 
              />

              {/* Minecraft Account Card - Using memoized component */}
              <MinecraftAccountCard />
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer className="p-4 sm:p-6 text-center text-white/80 text-xs sm:text-sm border-t border-white/10 mt-auto">
          <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-3 sm:gap-4">
            <div>
              Copyright © 2024-2025 ChampaMCxDL. All Rights Reserved.
            </div>
            <div className="flex gap-4 sm:gap-6 mt-2 md:mt-0">
              <a href="#" className="hover:text-emerald-400 transition-colors">Terms</a>
              <a href="#" className="hover:text-emerald-400 transition-colors">Privacy</a>
              <a href="#" className="hover:text-emerald-400 transition-colors">Contact</a>
            </div>
          </div>
        </footer>
      </div>
      
      {/* Lazy loaded modals */}
      <Suspense fallback={null}>
        {isOrderModalOpen && (
      <OrderModal
        isOpen={isOrderModalOpen}
        onClose={() => setIsOrderModalOpen(false)}
      />
        )}

        {isServerStatusModalOpen && (
      <ServerStatusModal
        isOpen={isServerStatusModalOpen}
        onClose={() => setIsServerStatusModalOpen(false)}
      />
        )}
      </Suspense>
    </div>
  );
};

export default Store;