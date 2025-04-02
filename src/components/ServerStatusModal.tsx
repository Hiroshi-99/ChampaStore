import React, { useState, useEffect } from 'react';
import { X, Server, Users, Globe, Clock } from 'lucide-react';

interface ServerStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ServerStatusModal: React.FC<ServerStatusModalProps> = ({ isOpen, onClose }) => {
  const [serverData, setServerData] = useState({
    online: true,
    players: { online: 42, max: 100 },
    version: 'Paper 1.20.1',
    hostname: 'mc.champastore.com',
    lastUpdated: new Date().toLocaleTimeString()
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
      // Simulate API call to fetch server status
      setTimeout(() => {
        setServerData({
          online: true,
          players: { online: 42, max: 100 },
          version: 'Paper 1.20.1',
          hostname: 'mc.champastore.com',
          lastUpdated: new Date().toLocaleTimeString()
        });
        setIsLoading(false);
      }, 1000);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div 
        className="bg-gray-800 border border-gray-700 rounded-xl w-full max-w-md shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="border-b border-gray-700 p-4 flex justify-between items-center">
          <h2 className="text-white text-lg font-semibold">Server Status</h2>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-5">
          {isLoading ? (
            <div className="flex justify-center items-center h-40">
              <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : (
            <>
              {/* Server Status */}
              <div className="flex items-center mb-5">
                <div className={`w-3 h-3 rounded-full mr-2 ${serverData.online ? 'bg-green-500' : 'bg-red-500'}`}></div>
                <span className="text-lg font-medium text-white">
                  {serverData.online ? 'Online' : 'Offline'}
                </span>
              </div>

              {/* Server Info */}
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <Server size={20} className="text-emerald-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="text-white font-medium">Server Address</h3>
                    <p className="text-gray-300">{serverData.hostname}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Users size={20} className="text-emerald-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="text-white font-medium">Players Online</h3>
                    <p className="text-gray-300">{serverData.players.online}/{serverData.players.max}</p>
                    <div className="w-full bg-gray-700 h-2 rounded-full mt-1 overflow-hidden">
                      <div 
                        className="bg-emerald-500 h-full rounded-full"
                        style={{ width: `${(serverData.players.online / serverData.players.max) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Globe size={20} className="text-emerald-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="text-white font-medium">Server Version</h3>
                    <p className="text-gray-300">{serverData.version}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Clock size={20} className="text-emerald-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="text-white font-medium">Last Updated</h3>
                    <p className="text-gray-300">{serverData.lastUpdated}</p>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-700 p-4">
          <button 
            className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white rounded-lg py-2.5 px-4 flex items-center justify-center gap-2 transition duration-300 transform hover:scale-[1.02] font-medium"
            onClick={() => {
              navigator.clipboard.writeText(serverData.hostname);
              // You could add a toast notification here
            }}
          >
            Copy Server Address
          </button>
        </div>
      </div>
    </div>
  );
}; 