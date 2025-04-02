import React, { useState, useEffect } from 'react';
import { X, Server, Users, Globe, Clock, Copy, ExternalLink, AlertTriangle } from 'lucide-react';

interface ServerStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ServerStatusData {
  online: boolean;
  hostname?: string;
  port?: number;
  players?: {
    online: number;
    max: number;
    list?: Array<{ name: string; uuid: string }>;
  };
  version?: string;
  protocol?: {
    version: number;
    name: string;
  };
  motd?: {
    raw: string[];
    clean: string[];
    html: string[];
  };
  debug?: {
    ping: boolean;
    query: boolean;
    bedrock: boolean;
    srv: boolean;
  };
  error?: string;
  lastUpdated: string;
}

export const ServerStatusModal: React.FC<ServerStatusModalProps> = ({ isOpen, onClose }) => {
  const [serverData, setServerData] = useState<ServerStatusData>({
    online: false,
    lastUpdated: new Date().toLocaleTimeString()
  });
  const [isLoading, setIsLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const SERVER_ADDRESS = 'champa.lol';
  const SERVER_PORT = 19132;

  useEffect(() => {
    if (isOpen) {
      fetchServerStatus();
    }
  }, [isOpen]);

  const fetchServerStatus = async () => {
    setIsLoading(true);
    setFetchError(null);
    
    try {
      // Using the mcsrvstat.us API for Bedrock servers
      const response = await fetch(`https://api.mcsrvstat.us/java/3/${SERVER_ADDRESS}`, {
        headers: {
          'User-Agent': 'ChampaStore/1.0'
        }
      });
      
      if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}`);
      }
      
      const data = await response.json();
      
      // Format the API response into our server data structure
      setServerData({
        online: data.online,
        hostname: SERVER_ADDRESS,
        port: SERVER_PORT,
        players: data.players || { online: 0, max: 0 },
        version: data.version || 'Unknown',
        motd: data.motd,
        debug: data.debug,
        lastUpdated: new Date().toLocaleTimeString()
      });
    } catch (error) {
      console.error('Error fetching server status:', error);
      setFetchError('Failed to fetch server status. Please try again later.');
      
      // Fallback to offline state with error
      setServerData({
        online: false,
        hostname: SERVER_ADDRESS,
        port: SERVER_PORT,
        error: error instanceof Error ? error.message : 'Unknown error',
        lastUpdated: new Date().toLocaleTimeString()
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyAddress = () => {
    navigator.clipboard.writeText(`${SERVER_ADDRESS}:${SERVER_PORT}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRefresh = () => {
    fetchServerStatus();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div 
        className="bg-gray-800 border border-gray-700 rounded-xl w-full max-w-md shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Server Banner Image */}
        <div className="relative">
          <img 
            src="https://i.imgur.com/8WJ8noJ.jpeg" 
            alt="Champa Server" 
            className="w-full h-36 object-cover rounded-t-xl"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-gray-800/80"></div>
          
          {/* Server Status Badge */}
          {!isLoading && (
            <div className="absolute bottom-4 left-4 flex items-center">
              <div className={`w-3 h-3 rounded-full mr-2 ${serverData.online ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span className="text-white font-medium text-sm px-2 py-1 bg-black/50 rounded-full">
                {serverData.online ? 'Online' : 'Offline'}
              </span>
            </div>
          )}
          
          <button 
            onClick={onClose}
            className="absolute top-3 right-3 text-white/80 hover:text-white bg-black/30 hover:bg-black/50 p-1.5 rounded-full transition-colors"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Header */}
        <div className="border-b border-gray-700 p-4 flex justify-between items-center">
          <h2 className="text-white text-lg font-semibold">Champa Minecraft Server</h2>
          <button
            onClick={handleRefresh}
            className="text-emerald-400 hover:text-emerald-300 p-1.5 rounded transition-colors text-sm flex items-center gap-1"
            aria-label="Refresh server status"
            disabled={isLoading}
          >
            <Clock size={14} className={isLoading ? 'animate-spin' : ''} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>

        {/* Content */}
        <div className="p-5">
          {isLoading ? (
            <div className="flex justify-center items-center h-40">
              <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : fetchError ? (
            <div className="text-center p-4">
              <AlertTriangle size={40} className="text-yellow-500 mx-auto mb-2" />
              <h3 className="text-white text-lg font-medium mb-1">Error</h3>
              <p className="text-gray-300 text-sm">{fetchError}</p>
              <button
                onClick={handleRefresh}
                className="mt-4 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 rounded-lg text-white text-sm font-medium"
              >
                Try Again
              </button>
            </div>
          ) : (
            <>
              {/* Player Count Highlight */}
              <div className="bg-gray-700/50 p-4 rounded-lg mb-5 text-center">
                <h3 className="text-white text-sm font-medium mb-1">Players Online</h3>
                <div className="flex items-center justify-center gap-1">
                  <Users size={20} className="text-emerald-400" />
                  <span className="text-2xl font-bold text-white">
                    {serverData.online ? serverData.players?.online || 0 : 0}
                  </span>
                  <span className="text-gray-400">/ {serverData.online ? serverData.players?.max || 0 : 0}</span>
                </div>
                <div className="w-full bg-gray-700 h-2 rounded-full mt-3 overflow-hidden">
                  <div 
                    className="bg-emerald-500 h-full rounded-full"
                    style={{ 
                      width: serverData.online && serverData.players?.max 
                        ? `${((serverData.players?.online || 0) / serverData.players.max) * 100}%` 
                        : '0%' 
                    }}
                  ></div>
                </div>
              </div>

              {/* Server MOTD */}
              {serverData.online && serverData.motd && (
                <div className="flex items-start gap-3 mb-4 bg-gray-700/30 p-3 rounded-lg">
                  <div className="flex-1">
                    <h3 className="text-white font-medium">Server Message</h3>
                    <div className="mt-1 text-gray-300">
                      {serverData.motd.clean.map((line, i) => (
                        <p key={i} className="text-sm">{line}</p>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Server Address */}
              <div className="flex items-start gap-3 mb-4 bg-gray-700/30 p-3 rounded-lg">
                <Server size={20} className="text-emerald-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h3 className="text-white font-medium">Server Address</h3>
                  <div className="flex items-center justify-between mt-1">
                    <p className="text-gray-300 font-mono">{SERVER_ADDRESS}:{SERVER_PORT}</p>
                    <button 
                      onClick={handleCopyAddress}
                      className="text-emerald-400 hover:text-emerald-300 transition-colors"
                      aria-label="Copy server address"
                    >
                      <Copy size={16} />
                    </button>
                  </div>
                  {copied && (
                    <span className="text-xs text-emerald-400 mt-1 block">Copied to clipboard!</span>
                  )}
                </div>
              </div>

              {/* Server Version */}
              <div className="flex items-start gap-3 mb-4 bg-gray-700/30 p-3 rounded-lg">
                <Globe size={20} className="text-emerald-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-white font-medium">Server Version</h3>
                  <p className="text-gray-300">{serverData.online ? serverData.version : 'Unknown'}</p>
                </div>
              </div>

              {/* Last Updated */}
              <div className="flex items-start gap-3 bg-gray-700/30 p-3 rounded-lg">
                <Clock size={20} className="text-emerald-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-white font-medium">Last Updated</h3>
                  <p className="text-gray-300">{serverData.lastUpdated}</p>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-700 p-4">
          <button 
            className={`w-full ${serverData.online ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700' : 'bg-gray-600 cursor-not-allowed'} text-white rounded-lg py-2.5 px-4 flex items-center justify-center gap-2 transition duration-300 ${serverData.online ? 'transform hover:scale-[1.02]' : ''} font-medium`}
            onClick={() => {
              if (serverData.online) {
                window.open(`minecraft://?addExternalServer=Champa|${SERVER_ADDRESS}:${SERVER_PORT}`);
              }
            }}
            disabled={!serverData.online || isLoading}
          >
            <ExternalLink size={18} />
            {serverData.online ? 'Join Server Now' : 'Server Offline'}
          </button>
        </div>
      </div>
    </div>
  );
}; 