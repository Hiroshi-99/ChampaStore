import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { Save, Image, DollarSign, Percent, Settings, LogOut, ShoppingCart, FileText, X, AlertTriangle, Lock, Upload, Shield, Info, Users } from 'lucide-react';
import { toast } from 'react-hot-toast';

// Types
interface Order {
  id: string;
  customer_name: string;
  customer_phone: string;
  created_at: string;
  total_amount: number;
  status: 'pending' | 'processing' | 'completed' | 'cancelled';
  items: Array<{
    name: string;
    price: number;
  }>;
}

interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  original_price: number | null;
  image_url: string;
  color: string;
}

// Enhanced authentication with SessionProvider pattern
const useAuth = () => {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [loginAttempts, setLoginAttempts] = useState<{[key: string]: {count: number, timestamp: number}}>({});
  const navigate = useNavigate();

  // Session monitoring with timeout
  useEffect(() => {
    const fetchSession = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;
        setSession(data.session);
        
        // Set session timeout
        if (data.session) {
          const timeout = setTimeout(() => {
            logout();
            toast.error('Session expired. Please login again.');
          }, 30 * 60 * 1000); // 30 minutes
          
          return () => clearTimeout(timeout);
        }
      } catch (err: any) {
        console.error('Auth error:', err);
        setAuthError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  // Clean up expired login attempts
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setLoginAttempts(prev => {
        const updated = { ...prev };
        for (const [ip, data] of Object.entries(prev)) {
          if (now - data.timestamp > 5 * 60 * 1000) { // 5 minutes
            delete updated[ip];
          }
        }
        return updated;
      });
    }, 60 * 1000); // Check every minute

    return () => clearInterval(interval);
  }, []);

  // Get client IP
  const getClientIP = useCallback(async () => {
    try {
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      return data.ip;
    } catch (error) {
      return 'unknown';
    }
  }, []);

  // Login handler with rate limiting and security enhancements
  const login = useCallback(async (email: string, password: string) => {
    if (!email || !password) {
      setAuthError('Please enter both email and password');
      return false;
    }

    setLoading(true);
    setAuthError(null);

    try {
      // Get client IP for rate limiting
      const clientIP = await getClientIP();
      
      // Check rate limit
      const now = Date.now();
      const attempts = loginAttempts[clientIP] || { count: 0, timestamp: now };
      
      if (attempts.count >= 5 && now - attempts.timestamp < 5 * 60 * 1000) {
        setAuthError('Too many login attempts. Please try again later.');
        return false;
      }

      // Add short delay to prevent brute force
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        // Update login attempts
        setLoginAttempts(prev => ({
          ...prev,
          [clientIP]: {
            count: (prev[clientIP]?.count || 0) + 1,
            timestamp: now
          }
        }));
        throw error;
      }

      // Reset attempts on successful login
      setLoginAttempts(prev => {
        const updated = { ...prev };
        delete updated[clientIP];
        return updated;
      });

      return true;
    } catch (error: any) {
      setAuthError(error.message || 'Authentication failed');
      console.error('Login error:', error);
      return false;
    } finally {
      setLoading(false);
    }
  }, [loginAttempts, getClientIP]);

  // Logout handler
  const logout = useCallback(async () => {
    setLoading(true);
    try {
      await supabase.auth.signOut();
      navigate('/');
    } catch (error) {
      console.error('Error logging out:', error);
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  return { session, loading, authError, login, logout };
};

// Components
const AdminLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeTab, setActiveTab] = useState('orders'); // Default to orders tab
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      navigate('/');
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex">
      {/* Sidebar */}
      <div className="w-64 bg-gray-800/80 backdrop-blur-sm border-r border-gray-700/80 hidden md:flex md:flex-col">
        <div className="p-5 border-b border-gray-700/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-lg flex items-center justify-center shadow-lg">
              <Settings size={20} className="text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">Admin Panel</h1>
              <p className="text-xs text-gray-400">Champa Store</p>
            </div>
          </div>
        </div>
        
        {/* Navigation */}
        <nav className="flex-1 p-4">
          <ul className="space-y-2">
            {[
              { id: 'orders', label: 'Orders', icon: <ShoppingCart size={18} /> },
              { id: 'images', label: 'Images', icon: <Image size={18} /> },
              { id: 'prices', label: 'Prices', icon: <DollarSign size={18} /> },
              { id: 'settings', label: 'Settings', icon: <Settings size={18} /> }
            ].map(tab => (
              <li key={tab.id}>
                <button
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                    activeTab === tab.id
                      ? 'bg-emerald-500/20 text-emerald-400 border-l-2 border-emerald-500'
                      : 'text-gray-400 hover:bg-gray-700/50 hover:text-gray-200'
                  }`}
                >
                  <span className={activeTab === tab.id ? 'text-emerald-400' : 'text-gray-500'}>
                    {tab.icon}
                  </span>
                  <span className="font-medium">{tab.label}</span>
                </button>
              </li>
            ))}
          </ul>
        </nav>
        
        {/* Logout Button */}
        <div className="p-4 border-t border-gray-700/80">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gray-700/50 hover:bg-gray-700 text-gray-300 hover:text-white transition-colors"
          >
            <LogOut size={16} />
            <span>Sign Out</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-x-hidden md:p-0 md:pt-0 pt-28 p-4">
        <div className="container mx-auto p-4 md:p-6 max-w-6xl">
          <AdminHeader 
            title={activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
            description={`Manage your store ${activeTab} settings`}
          />
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            <AdminCard title="Total Orders" icon={<ShoppingCart size={18} className="text-emerald-400" />}>
              <div className="text-3xl font-bold text-white">1,234</div>
              <p className="text-sm text-gray-400 mt-1">+12% from last month</p>
            </AdminCard>
            <AdminCard title="Total Revenue" icon={<DollarSign size={18} className="text-emerald-400" />}>
              <div className="text-3xl font-bold text-white">$45,678</div>
              <p className="text-sm text-gray-400 mt-1">+8% from last month</p>
            </AdminCard>
            <AdminCard title="Active Users" icon={<Users size={18} className="text-emerald-400" />}>
              <div className="text-3xl font-bold text-white">892</div>
              <p className="text-sm text-gray-400 mt-1">+5% from last month</p>
            </AdminCard>
          </div>

          <div className="space-y-6">
            {activeTab === 'images' && <ImageManager />}
            {activeTab === 'prices' && <PriceManager />}
            {activeTab === 'orders' && <OrdersManager />}
            {activeTab === 'settings' && <SettingsManager />}
          </div>
        </div>
      </div>
    </div>
  );
};

const AdminHeader: React.FC<{ title: string; description: string }> = ({ title, description }) => {
  return (
    <div className="mb-8">
      <h1 className="text-2xl font-bold text-white">{title}</h1>
      <p className="text-gray-400 mt-1">{description}</p>
    </div>
  );
};

const AdminCard: React.FC<{ children: React.ReactNode; title: string; icon: React.ReactNode }> = ({ 
  children, 
  title, 
  icon 
}) => {
  return (
    <div className="bg-gradient-to-br from-gray-800/80 to-gray-800/40 rounded-2xl p-6 border border-gray-700/50 backdrop-blur-sm shadow-xl">
      <h3 className="text-xl font-semibold text-white mb-5 pb-3 border-b border-gray-700/50 flex items-center gap-2">
        <div className="bg-emerald-500/20 p-1.5 rounded-lg">
          {icon}
        </div>
        {title}
      </h3>
      {children}
    </div>
  );
};

const LoadingSpinner: React.FC = () => {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="relative">
        <div className="w-12 h-12 border-2 border-emerald-500/30 rounded-full"></div>
        <div className="absolute inset-0 rounded-full border-t-2 border-emerald-500 animate-spin"></div>
        <div className="absolute inset-0 flex items-center justify-center">
          <Settings size={16} className="text-emerald-400" />
        </div>
      </div>
    </div>
  );
};

const ErrorMessage: React.FC<{ message: string }> = ({ message }) => {
  return (
    <div className="bg-red-500/10 border border-red-500/30 text-red-300 px-4 py-3 rounded-xl mb-6 flex items-start gap-3 backdrop-blur-sm">
      <AlertTriangle className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
      <p className="text-sm">{message}</p>
    </div>
  );
};

const SaveButton: React.FC<{ 
  isSaving: boolean; 
  onClick: () => void; 
  disabled?: boolean 
}> = ({ isSaving, onClick, disabled }) => {
  return (
    <button
      onClick={onClick}
      disabled={isSaving || disabled}
      className="relative group"
    >
      <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-600 to-emerald-400 rounded-full blur opacity-60 group-hover:opacity-100 transition duration-200 group-disabled:opacity-30"></div>
      <div className="relative bg-gray-900 text-white px-6 py-3 rounded-full flex items-center gap-2 group-hover:bg-gray-800 transition-colors">
        {isSaving ? (
          <>
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            <span>Saving...</span>
          </>
        ) : (
          <>
            <Save size={18} className="text-emerald-400" />
            <span>Save Changes</span>
          </>
        )}
      </div>
    </button>
  );
};

// Image uploader component for reuse
interface ImageUploaderProps {
  imageType: string;
  currentUrl: string;
  label: string;
  onUpload: (file: File, type: string) => void;
  isUploading: boolean;
}

const ImageUploader = React.memo(({ 
  imageType, 
  currentUrl, 
  label,
  onUpload,
  isUploading
}: ImageUploaderProps) => (
  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-black/60 rounded-lg backdrop-blur-sm">
    <label className="cursor-pointer bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium py-2 px-3 rounded-lg transition-colors flex items-center gap-2">
      <Upload size={14} />
      Update {label}
      <input
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onUpload(file, imageType);
        }}
        disabled={isUploading}
      />
    </label>
  </div>
));

// Main Admin Dashboard Component
const AdminDashboard: React.FC = () => {
  const { session, loading, authError, login, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('images');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginInProgress, setLoginInProgress] = useState(false);
  
  // Admin tabs
  const tabs = [
    { id: 'images', label: 'Images', icon: <Image size={18} /> },
    { id: 'prices', label: 'Prices & Discounts', icon: <DollarSign size={18} /> },
    { id: 'orders', label: 'Orders', icon: <ShoppingCart size={18} /> },
    { id: 'settings', label: 'Settings', icon: <Settings size={18} /> },
  ];

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginInProgress(true);
    await login(email, password);
    setLoginInProgress(false);
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-4">
        <div className="bg-gray-800/80 backdrop-blur-sm p-8 rounded-2xl shadow-2xl border border-gray-700/80 w-full max-w-md transition-all duration-300 transform hover:shadow-emerald-900/20">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-700/20">
              <Lock className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent mb-2">Admin Dashboard</h1>
            <p className="text-gray-400 text-sm">Secure access to management area</p>
          </div>
          
          {authError && <ErrorMessage message={authError} />}
          
          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-gray-300 text-sm font-medium mb-2" htmlFor="email">
                Email Address
              </label>
              <div className="relative">
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-gray-700/50 text-white border border-gray-600/80 rounded-xl px-4 py-3 pl-10 focus:outline-none focus:border-emerald-500/70 focus:ring-1 focus:ring-emerald-500/50 transition-colors"
                  required
                  autoComplete="username"
                  disabled={loginInProgress}
                  placeholder="admin@example.com"
                />
                <div className="absolute left-3 top-3.5 text-gray-400">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
              </div>
            </div>
            
            <div>
              <label className="block text-gray-300 text-sm font-medium mb-2" htmlFor="password">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-gray-700/50 text-white border border-gray-600/80 rounded-xl px-4 py-3 pl-10 focus:outline-none focus:border-emerald-500/70 focus:ring-1 focus:ring-emerald-500/50 transition-colors"
                  required
                  autoComplete="current-password"
                  disabled={loginInProgress}
                  placeholder="••••••••"
                />
                <div className="absolute left-3 top-3.5 text-gray-400">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
              </div>
            </div>
            
            <button
              type="submit"
              disabled={loginInProgress}
              className="w-full mt-6 relative group"
            >
              <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-600 to-emerald-400 rounded-xl blur opacity-30 group-hover:opacity-80 transition duration-200 group-disabled:opacity-20"></div>
              <div className="relative bg-gradient-to-r from-emerald-600 to-emerald-500 text-white font-medium py-3 px-4 rounded-xl transition-colors flex items-center justify-center group-hover:from-emerald-500 group-hover:to-emerald-400 group-disabled:from-emerald-700/50 group-disabled:to-emerald-600/50 group-disabled:cursor-not-allowed">
                {loginInProgress ? (
                  <>
                    <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full mr-3"></div>
                    <span>Authenticating...</span>
                  </>
                ) : (
                  <>
                    <span className="mr-2">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                      </svg>
                    </span>
                    Sign In
                  </>
                )}
              </div>
            </button>
          </form>
          
          <p className="text-gray-500 text-xs text-center mt-8">
            Protected area. Unauthorized access attempts will be logged.
          </p>
        </div>
      </div>
    );
  }

  return (
    <AdminLayout>
      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          {tabs.map(tab => (
            <li key={tab.id}>
              <button
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                  activeTab === tab.id
                    ? 'bg-emerald-500/20 text-emerald-400 border-l-2 border-emerald-500'
                    : 'text-gray-400 hover:bg-gray-700/50 hover:text-gray-200'
                }`}
              >
                <span className={activeTab === tab.id ? 'text-emerald-400' : 'text-gray-500'}>
                  {tab.icon}
                </span>
                <span className="font-medium">{tab.label}</span>
              </button>
            </li>
          ))}
        </ul>
      </nav>
      
      <div className="p-4 border-t border-gray-700/80">
        <button
          onClick={logout}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gray-700/50 hover:bg-gray-700 text-gray-300 hover:text-white transition-colors"
        >
          <LogOut size={16} />
          <span>Sign Out</span>
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-x-hidden md:p-0 md:pt-0 pt-28 p-4">
        <div className="container mx-auto p-4 md:p-6 max-w-6xl">
          <AdminHeader 
            title="Dashboard"
            description="Manage your store settings and orders"
          />
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            <AdminCard title="Total Orders" icon={<ShoppingCart size={18} className="text-emerald-400" />}>
              <div className="text-3xl font-bold text-white">1,234</div>
              <p className="text-sm text-gray-400 mt-1">+12% from last month</p>
            </AdminCard>
            <AdminCard title="Total Revenue" icon={<DollarSign size={18} className="text-emerald-400" />}>
              <div className="text-3xl font-bold text-white">$45,678</div>
              <p className="text-sm text-gray-400 mt-1">+8% from last month</p>
            </AdminCard>
            <AdminCard title="Active Users" icon={<Users size={18} className="text-emerald-400" />}>
              <div className="text-3xl font-bold text-white">892</div>
              <p className="text-sm text-gray-400 mt-1">+5% from last month</p>
            </AdminCard>
          </div>

          <div className="space-y-6">
            {activeTab === 'images' && <ImageManager />}
            {activeTab === 'prices' && <PriceManager />}
            {activeTab === 'orders' && <OrdersManager />}
            {activeTab === 'settings' && <SettingsManager />}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

// Image Manager Component
const ImageManager: React.FC = () => {
  const [bannerImage, setBannerImage] = useState('/images/banner.gif');
  const [logoImage, setLogoImage] = useState('https://i.imgur.com/ArKEQz1.png');
  const [qrCodeImage, setQrCodeImage] = useState('/images/qr/qrcode.jpg');
  const [receiptImage, setReceiptImage] = useState('/images/receipt-bg.jpg');
  const [receiptLogoImage, setReceiptLogoImage] = useState('https://i.imgur.com/ArKEQz1.png');
  const [rankImages, setRankImages] = useState<{[key: string]: string}>({
    'VIP': 'https://i.imgur.com/NX3RB4i.png',
    'MVP': 'https://i.imgur.com/gmlFpV2.png',
    'MVP+': 'https://i.imgur.com/C4VE5b0.png',
    'LEGEND': 'https://i.imgur.com/fiqqcOY.png',
    'DEVIL': 'https://i.imgur.com/z0zBiyZ.png',
    'INFINITY': 'https://i.imgur.com/SW6dtYW.png',
    'CHAMPA': 'https://i.imgur.com/5xEinAj.png'
  });
  const [selectedRank, setSelectedRank] = useState('VIP');
  const [isSaving, setIsSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [uploadLoading, setUploadLoading] = useState<string | null>(null);
  
  // Memoize selected rank image
  const selectedRankImage = useMemo(() => 
    rankImages[selectedRank] || rankImages['VIP'],
    [rankImages, selectedRank]
  );

  // Memoize rank options for dropdown
  const rankOptions = useMemo(() => 
    Object.keys(rankImages).map(rank => ({
      value: rank,
      label: rank
    })),
    [rankImages]
  );

  // Preload images when component mounts
  useEffect(() => {
    const imagesToPreload = [
      bannerImage,
      logoImage,
      qrCodeImage,
      receiptImage,
      receiptLogoImage,
      ...Object.values(rankImages)
    ].filter(Boolean);

    const imageLoaders = imagesToPreload.map(url => {
      const img = document.createElement('img');
      img.src = url;
      return img;
    });

    return () => {
      // Cleanup image loaders
      imageLoaders.forEach(img => {
        img.onload = null;
        img.onerror = null;
      });
    };
  }, [bannerImage, logoImage, qrCodeImage, receiptImage, receiptLogoImage, rankImages]);

  // Fetch images from database
  useEffect(() => {
    let mounted = true;
    const fetchImages = async () => {
      try {
        // Fetch site configuration
        const { data: configData, error: configError } = await supabase
          .from('site_config')
          .select('*')
          .in('key', ['banner_image', 'logo_image', 'qr_code_image', 'receipt_image', 'receipt_logo_image']);
          
        if (configError) throw configError;
        
        if (configData && mounted) {
          const imagesObj = configData.reduce((acc: any, item: any) => {
            acc[item.key] = item.value;
            return acc;
          }, {});
          
          setBannerImage(imagesObj.banner_image || '/images/banner.gif');
          setLogoImage(imagesObj.logo_image || 'https://i.imgur.com/ArKEQz1.png');
          setQrCodeImage(imagesObj.qr_code_image || '/images/qr/qrcode.jpg');
          setReceiptImage(imagesObj.receipt_image || '/images/receipt-bg.jpg');
          setReceiptLogoImage(imagesObj.receipt_logo_image || 'https://i.imgur.com/ArKEQz1.png');
        }
        
        // Fetch rank images from products table
        const { data: rankData, error: rankError } = await supabase
          .from('products')
          .select('name, image_url');
          
        if (rankError) throw rankError;
        
        if (rankData && rankData.length > 0 && mounted) {
          const rankImagesObj = rankData.reduce((acc: {[key: string]: string}, item: any) => {
            if (item.name && item.image_url) {
              acc[item.name] = item.image_url;
            }
            return acc;
          }, {});
          
          setRankImages(rankImagesObj);
        }
      } catch (error) {
        console.error('Error fetching images:', error);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };
    
    fetchImages();
    
    return () => {
      mounted = false;
    };
  }, []);

  // Memoize save handler
  const handleSaveImages = useCallback(async () => {
    setIsSaving(true);
    
    try {
      // Save main images to site_config
      await supabase
        .from('site_config')
        .upsert([
          { key: 'banner_image', value: bannerImage },
          { key: 'logo_image', value: logoImage },
          { key: 'qr_code_image', value: qrCodeImage },
          { key: 'receipt_image', value: receiptImage },
          { key: 'receipt_logo_image', value: receiptLogoImage }
        ]);
      
      // Save rank images to products table
      for (const [rankName, imageUrl] of Object.entries(rankImages)) {
        await supabase
          .from('products')
          .update({ image_url: imageUrl })
          .eq('name', rankName);
      }
      
      toast.success('All images saved successfully!');
    } catch (error) {
      console.error('Error saving images:', error);
      toast.error('Failed to save images. Please try again.');
    } finally {
      setIsSaving(false);
    }
  }, [bannerImage, logoImage, qrCodeImage, receiptImage, receiptLogoImage, rankImages]);

  // Memoize rank image change handler
  const handleRankImageChange = useCallback((value: string) => {
    setRankImages(prev => ({
      ...prev,
      [selectedRank]: value
    }));
  }, [selectedRank]);

  // File upload handler for direct uploads
  const handleFileUpload = useCallback(async (file: File, imageType: string) => {
    if (!file) return;
    
    // Validate file
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload a valid image file');
      return;
    }
    
    // Max size 2MB
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image is too large (max 2MB)');
      return;
    }
    
    setUploadLoading(imageType);
    
    try {
      // Create a unique filename
      const timestamp = Date.now();
      const randomString = Math.random().toString(36).substring(2, 10);
      const fileExtension = file.name.split('.').pop() || 'jpg';
      const fileName = `${imageType}_${timestamp}_${randomString}.${fileExtension}`;
      const filePath = `store-images/${fileName}`;
      
      // Try multiple buckets in case some are not available
      let uploadResult = null;
      let bucketName = null;
      
      for (const bucket of ['images', 'store-images', 'public', 'media', 'uploads']) {
        try {
          const result = await supabase.storage
            .from(bucket)
            .upload(filePath, file, {
              cacheControl: '3600',
              upsert: false
            });
            
          if (!result.error) {
            uploadResult = result;
            bucketName = bucket;
            break;
          }
        } catch (err) {
          // Continue trying the next bucket
        }
      }
      
      if (!uploadResult || !bucketName) {
        throw new Error('Failed to upload image: No valid storage bucket found');
      }
      
      // Get public URL
      const { data: urlData } = supabase.storage
        .from(bucketName)
        .getPublicUrl(filePath);
        
      if (!urlData || !urlData.publicUrl) {
        throw new Error('Failed to get public URL');
      }
      
      const imageUrl = urlData.publicUrl;
      
      // Update the appropriate image state based on type
      switch (imageType) {
        case 'banner':
          setBannerImage(imageUrl);
          break;
        case 'logo':
          setLogoImage(imageUrl);
          break;
        case 'qr_code':
          setQrCodeImage(imageUrl);
          break;
        case 'receipt':
          setReceiptImage(imageUrl);
          break;
        case 'receipt_logo':
          setReceiptLogoImage(imageUrl);
          break;
        case 'rank':
          handleRankImageChange(imageUrl);
          break;
      }
      
      toast.success('Image uploaded successfully!');
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error(`Failed to upload image: ${error.message}`);
    } finally {
      setUploadLoading(null);
    }
  }, [handleRankImageChange]);

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="space-y-8">
      {/* Floating save button */}
      <div className="fixed bottom-6 right-6 z-40">
        <SaveButton 
          isSaving={isSaving}
          onClick={handleSaveImages}
          disabled={isSaving || !!uploadLoading}
        />
      </div>

      {/* Main store images */}
      <AdminCard title="Main Store Images" icon={<Image size={18} className="text-emerald-400" />}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-5">
            <div>
              <label className="block text-gray-300 mb-2 font-medium">Store Logo</label>
              <div className="mb-3 bg-gray-900/70 p-4 rounded-xl flex items-center justify-center relative group h-48 overflow-hidden border border-gray-700/50 shadow-md hover:shadow-emerald-900/10 transition-shadow">
                <img 
                  src={logoImage} 
                  alt="Logo Preview" 
                  className="h-32 object-contain"
                />
                <ImageUploader 
                  imageType="logo" 
                  currentUrl={logoImage} 
                  label="Logo"
                  onUpload={handleFileUpload}
                  isUploading={!!uploadLoading}
                />
                {uploadLoading === 'logo' && (
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center backdrop-blur-sm">
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                      <span className="text-sm text-emerald-400">Uploading...</span>
                    </div>
                  </div>
                )}
              </div>
                
              <div className="relative">
                <input
                  type="text"
                  value={logoImage}
                  onChange={(e) => setLogoImage(e.target.value)}
                  className="w-full bg-gray-700/50 text-white border border-gray-600/80 rounded-lg px-4 py-2 focus:outline-none focus:border-emerald-500/70 focus:ring-1 focus:ring-emerald-500/50 transition-colors text-sm"
                />
                <p className="text-xs text-gray-400 mt-1.5 ml-1">Store logo displayed site-wide</p>
              </div>
            </div>
              
            <div>
              <label className="block text-gray-300 mb-2 font-medium">Banner Image</label>
              <div className="mb-3 bg-gray-900/70 p-4 rounded-xl flex items-center justify-center relative group overflow-hidden border border-gray-700/50 shadow-md hover:shadow-emerald-900/10 transition-shadow">
                <img 
                  src={bannerImage} 
                  alt="Banner Preview" 
                  className="w-full h-32 object-cover rounded-lg"
                />
                <ImageUploader 
                  imageType="banner" 
                  currentUrl={bannerImage} 
                  label="Banner"
                  onUpload={handleFileUpload}
                  isUploading={!!uploadLoading}
                />
                {uploadLoading === 'banner' && (
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center backdrop-blur-sm">
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                      <span className="text-sm text-emerald-400">Uploading...</span>
                    </div>
                  </div>
                )}
              </div>
                
              <div className="relative">
                <input
                  type="text"
                  value={bannerImage}
                  onChange={(e) => setBannerImage(e.target.value)}
                  className="w-full bg-gray-700/50 text-white border border-gray-600/80 rounded-lg px-4 py-2 focus:outline-none focus:border-emerald-500/70 focus:ring-1 focus:ring-emerald-500/50 transition-colors text-sm"
                />
                <p className="text-xs text-gray-400 mt-1.5 ml-1">Banner image shown at the top of the store page</p>
              </div>
            </div>
          </div>
            
          <div>
            <label className="block text-gray-300 mb-2 font-medium">Payment QR Code</label>
            <div className="mb-3 bg-gray-900/70 p-4 rounded-xl flex items-center justify-center relative group h-48 overflow-hidden border border-gray-700/50 shadow-md hover:shadow-emerald-900/10 transition-shadow">
              <div className="bg-white p-3 rounded-lg">
                <img 
                  src={qrCodeImage} 
                  alt="QR Code Preview" 
                  className="w-32 h-32 object-contain"
                />
              </div>
              <ImageUploader 
                imageType="qr_code" 
                currentUrl={qrCodeImage} 
                label="QR Code"
                onUpload={handleFileUpload}
                isUploading={!!uploadLoading}
              />
              {uploadLoading === 'qr_code' && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center backdrop-blur-sm">
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-sm text-emerald-400">Uploading...</span>
                  </div>
                </div>
              )}
            </div>
              
            <div className="mb-4">
              <input
                type="text"
                value={qrCodeImage}
                onChange={(e) => setQrCodeImage(e.target.value)}
                className="w-full bg-gray-700/50 text-white border border-gray-600/80 rounded-lg px-4 py-2 focus:outline-none focus:border-emerald-500/70 focus:ring-1 focus:ring-emerald-500/50 transition-colors text-sm"
              />
              <p className="text-xs text-gray-400 mt-1.5 ml-1">QR code for payments</p>
            </div>
          </div>
        </div>
      </AdminCard>
        
      <AdminCard title="Receipt Images" icon={<FileText size={18} className="text-emerald-400" />}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-gray-300 mb-2 font-medium">Receipt Background</label>
            <div className="mb-3 bg-gray-900/70 p-4 rounded-xl flex items-center justify-center relative group overflow-hidden border border-gray-700/50 shadow-md hover:shadow-emerald-900/10 transition-shadow">
              <img 
                src={receiptImage} 
                alt="Receipt Background Preview" 
                className="w-full h-40 object-cover rounded-lg"
              />
              <ImageUploader 
                imageType="receipt" 
                currentUrl={receiptImage} 
                label="Background"
                onUpload={handleFileUpload}
                isUploading={!!uploadLoading}
              />
              {uploadLoading === 'receipt' && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center backdrop-blur-sm">
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-sm text-emerald-400">Uploading...</span>
                  </div>
                </div>
              )}
            </div>
            
            <div className="mb-4">
              <input
                type="text"
                value={receiptImage}
                onChange={(e) => setReceiptImage(e.target.value)}
                className="w-full bg-gray-700/50 text-white border border-gray-600/80 rounded-lg px-4 py-2 focus:outline-none focus:border-emerald-500/70 focus:ring-1 focus:ring-emerald-500/50 transition-colors text-sm"
              />
              <p className="text-xs text-gray-400 mt-1.5 ml-1">Background image for the receipt</p>
            </div>
          </div>
          
          <div>
            <label className="block text-gray-300 mb-2 font-medium">Receipt Logo</label>
            <div className="mb-3 bg-gray-900/70 p-4 rounded-xl flex items-center justify-center relative group h-40 overflow-hidden border border-gray-700/50 shadow-md hover:shadow-emerald-900/10 transition-shadow">
              <img 
                src={receiptLogoImage} 
                alt="Receipt Logo Preview" 
                className="w-32 h-32 object-contain"
              />
              <ImageUploader 
                imageType="receipt_logo" 
                currentUrl={receiptLogoImage} 
                label="Logo"
                onUpload={handleFileUpload}
                isUploading={!!uploadLoading}
              />
              {uploadLoading === 'receipt_logo' && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center backdrop-blur-sm">
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-sm text-emerald-400">Uploading...</span>
                  </div>
                </div>
              )}
            </div>
            
            <div className="mb-4">
              <input
                type="text"
                value={receiptLogoImage}
                onChange={(e) => setReceiptLogoImage(e.target.value)}
                className="w-full bg-gray-700/50 text-white border border-gray-600/80 rounded-lg px-4 py-2 focus:outline-none focus:border-emerald-500/70 focus:ring-1 focus:ring-emerald-500/50 transition-colors text-sm"
              />
              <p className="text-xs text-gray-400 mt-1.5 ml-1">Logo displayed on the receipt</p>
            </div>
          </div>
        </div>
      </AdminCard>
      
      {/* Rank Preview Images Section */}
      <AdminCard title="Rank Preview Images" icon={<Shield size={18} className="text-emerald-400" />}>
        <div className="space-y-6">
          {/* Rank selector */}
          <div className="mb-6">
            <label className="block text-gray-300 mb-3 font-medium">Select Rank to Edit</label>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-7 gap-2">
              {Object.keys(rankImages).map((rank) => (
                <button
                  key={rank}
                  onClick={() => setSelectedRank(rank)}
                  className={`py-2 px-3 rounded-xl border transition-all text-sm ${
                    selectedRank === rank
                      ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50'
                      : 'bg-gray-700/30 text-gray-300 border-gray-700 hover:bg-gray-700/50'
                  }`}
                >
                  {rank}
                </button>
              ))}
            </div>
          </div>
          
          {/* Selected rank image editor */}
          <div className="bg-gray-800/50 rounded-xl p-5 border border-gray-700/50">
            <h4 className="text-lg font-medium text-white mb-4 flex items-center">
              <Shield size={16} className="text-emerald-400 mr-2" /> 
              {selectedRank} Rank Image
            </h4>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-gray-900/70 p-4 rounded-xl flex items-center justify-center relative group border border-gray-700/50 shadow-md hover:shadow-emerald-900/10 transition-shadow">
                <div className="relative group">
                  <div className="absolute -inset-1 bg-gradient-to-r from-emerald-600 to-emerald-400 rounded-lg blur opacity-20 group-hover:opacity-40 transition duration-200"></div>
                  <img 
                    src={selectedRankImage} 
                    alt={`${selectedRank} Rank Preview`} 
                    className="h-48 object-contain relative"
                  />
                </div>
                <ImageUploader 
                  imageType="rank" 
                  currentUrl={selectedRankImage} 
                  label="Image"
                  onUpload={handleFileUpload}
                  isUploading={!!uploadLoading}
                />
                {uploadLoading === 'rank' && (
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center backdrop-blur-sm">
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                      <span className="text-sm text-emerald-400">Uploading...</span>
                    </div>
                  </div>
                )}
              </div>
              
              <div>
                <div className="mb-4">
                  <input
                    type="text"
                    value={selectedRankImage}
                    onChange={(e) => handleRankImageChange(e.target.value)}
                    className="w-full bg-gray-700/50 text-white border border-gray-600/80 rounded-lg px-4 py-3 focus:outline-none focus:border-emerald-500/70 focus:ring-1 focus:ring-emerald-500/50 transition-colors text-sm"
                    placeholder="Enter image URL"
                  />
                  <p className="text-xs text-gray-400 mt-2 ml-1">Image displayed when customers select this rank</p>
                </div>
                
                <div className="text-sm text-gray-300 mt-4 space-y-2">
                  <p className="flex items-start gap-2">
                    <span className="bg-emerald-500/20 p-1 rounded-lg inline-flex mt-0.5">
                      <Info size={14} className="text-emerald-400" />
                    </span>
                    <span>Recommended image dimensions: 800x600 pixels</span>
                  </p>
                  <p className="flex items-start gap-2">
                    <span className="bg-emerald-500/20 p-1 rounded-lg inline-flex mt-0.5">
                      <Info size={14} className="text-emerald-400" />
                    </span>
                    <span>Use transparent PNG images for best results</span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </AdminCard>
    </div>
  );
};

// Price Manager Component
const PriceManager: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const { data, error } = await supabase
          .from('products')
          .select('*')
          .order('id');
          
        if (error) throw error;
        
        if (data) {
          setProducts(data.map((item: any) => ({
            id: item.id,
            name: item.name,
            description: item.description,
            price: Number(item.price) || 0,
            original_price: item.original_price ? Number(item.original_price) : null,
            image_url: item.image_url,
            color: item.color
          })));
        }
      } catch (error) {
        console.error('Error fetching products:', error);
        toast.error('Failed to load products');
      } finally {
        setLoading(false);
      }
    };
    
    fetchProducts();
  }, []);
  
  const handlePriceChange = (id: number, newPrice: number) => {
    setProducts(prevProducts => prevProducts.map(product => 
      product.id === id ? { ...product, price: newPrice } : product
    ));
  };
  
  const handleOriginalPriceChange = (id: number, newOriginalPrice: number | null) => {
    setProducts(prevProducts => prevProducts.map(product => 
      product.id === id ? { ...product, original_price: newOriginalPrice } : product
    ));
  };
  
  const applyDiscount = (id: number, discountPercentage: number) => {
    const product = products.find(p => p.id === id);
    if (!product) return;
    
    const currentPrice = product.price;
    // Set original price to current price if not already set
    const originalPrice = product.original_price || currentPrice;
    
    // Calculate new price with discount
    const discountedPrice = (originalPrice * (100 - discountPercentage) / 100);
    
    setProducts(prevProducts => prevProducts.map(p => 
      p.id === id ? { ...p, price: discountedPrice, original_price: originalPrice } : p
    ));
  };
  
  const removeDiscount = (id: number) => {
    const product = products.find(p => p.id === id);
    if (!product || !product.original_price) return;
    
    // Reset price to original price
    setProducts(prevProducts => prevProducts.map(p => 
      p.id === id ? { ...p, price: product.original_price || 0, original_price: null } : p
    ));
  };
  
  const handleSavePrices = async () => {
    setIsSaving(true);
    
    try {
      // Update each product
      for (const product of products) {
        const { error } = await supabase
          .from('products')
          .update({ 
            price: product.price,
            original_price: product.original_price
          })
          .eq('id', product.id);
          
        if (error) throw error;
      }
      
      toast.success('Prices updated successfully!');
    } catch (error) {
      console.error('Error saving prices:', error);
      toast.error('Failed to save prices. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="space-y-6">
      <AdminCard title="Price Management" icon={<DollarSign size={18} className="text-emerald-400" />}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="text-left py-3 px-4 text-gray-300">Rank</th>
                <th className="text-left py-3 px-4 text-gray-300">Description</th>
                <th className="text-center py-3 px-4 text-gray-300">Preview</th>
                <th className="text-left py-3 px-4 text-gray-300">Price ($)</th>
                <th className="text-left py-3 px-4 text-gray-300">Original Price ($)</th>
                <th className="text-left py-3 px-4 text-gray-300">Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => (
                <tr key={product.id} className="border-b border-gray-700">
                  <td className="py-3 px-4">
                    <div className={`inline-block px-3 py-1 rounded text-white font-medium bg-gradient-to-r ${product.color}`}>
                      {product.name}
                    </div>
                  </td>
                  <td className="py-3 px-4 text-gray-300">{product.description}</td>
                  <td className="py-3 px-4 text-center">
                    {product.image_url && (
                      <img 
                        src={product.image_url} 
                        alt={product.name} 
                        className="h-12 w-auto inline-block"
                      />
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={product.price}
                      onChange={(e) => handlePriceChange(product.id, Number(e.target.value))}
                      className="w-24 bg-gray-700 text-white border border-gray-600 rounded px-3 py-1 focus:outline-none focus:border-emerald-500"
                    />
                  </td>
                  <td className="py-3 px-4">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={product.original_price || ''}
                      onChange={(e) => {
                        const value = e.target.value ? Number(e.target.value) : null;
                        handleOriginalPriceChange(product.id, value);
                      }}
                      placeholder="No discount"
                      className="w-24 bg-gray-700 text-white border border-gray-600 rounded px-3 py-1 focus:outline-none focus:border-emerald-500"
                    />
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex gap-2">
                      <div className="relative">
                        <select
                          className="appearance-none bg-gray-700 text-white border border-gray-600 rounded px-3 py-1 pr-8 focus:outline-none focus:border-emerald-500"
                          onChange={(e) => {
                            const value = Number(e.target.value);
                            if (value > 0) {
                              applyDiscount(product.id, value);
                            }
                            e.target.value = ""; // Reset after use
                          }}
                          value=""
                        >
                          <option value="">Discount %</option>
                          <option value="5">5% off</option>
                          <option value="10">10% off</option>
                          <option value="15">15% off</option>
                          <option value="20">20% off</option>
                          <option value="25">25% off</option>
                          <option value="30">30% off</option>
                          <option value="40">40% off</option>
                          <option value="50">50% off</option>
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-white">
                          <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                            <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                          </svg>
                        </div>
                      </div>
                      
                      {product.original_price && (
                        <button
                          onClick={() => removeDiscount(product.id)}
                          className="bg-red-600 hover:bg-red-700 text-white rounded px-2 transition-colors"
                          title="Remove discount"
                        >
                          <X size={16} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        <div className="mt-6 flex justify-end">
          <SaveButton 
            isSaving={isSaving}
            onClick={handleSavePrices}
            disabled={isSaving}
          />
        </div>
      </AdminCard>
    </div>
  );
};

// Orders Manager Component
const OrdersManager: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Fetch orders with filters
  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });

      // Apply search filter
      if (searchTerm) {
        query = query.or(`id.ilike.%${searchTerm}%,customer_name.ilike.%${searchTerm}%,customer_phone.ilike.%${searchTerm}%`);
      }

      // Apply status filter
      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;
      
      if (error) throw error;
      
      // Ensure all orders have required properties with default values
      const processedOrders = (data || []).map(order => ({
        ...order,
        total_amount: order.total_amount || 0,
        items: order.items || [],
        status: order.status || 'pending',
        customer_name: order.customer_name || 'Unknown',
        customer_phone: order.customer_phone || 'N/A'
      }));
      
      setOrders(processedOrders);
      setTotalPages(Math.ceil(processedOrders.length / 10));
    } catch (err: any) {
      setError(err.message);
      toast.error('Failed to fetch orders');
    } finally {
      setLoading(false);
    }
  }, [searchTerm, statusFilter]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // Calculate pagination
  const filteredOrders = orders;
  const startIndex = (currentPage - 1) * 10;
  const paginatedOrders = filteredOrders.slice(startIndex, startIndex + 10);

  // Handle page change
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // Handle status update with optimistic UI
  const handleStatusChange = (orderId: string, newStatus: Order['status']) => {
    setOrders(prev => prev.map(order => 
      order.id === orderId ? { ...order, status: newStatus } : order
    ));
  };

  // Update the order items rendering to handle undefined values
  const renderOrderItems = (items: Order['items']) => {
    if (!items || !Array.isArray(items)) return null;
    
    return items.map((item, index) => (
      <div key={index} className="flex justify-between py-2">
        <span>{item.name || 'Unknown Item'}</span>
        <span>${(item.price || 0).toFixed(2)}</span>
      </div>
    ));
  };

  return (
    <div className="space-y-6">
      {/* Search and Filter Controls */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search orders by ID, name, or phone..."
              className="w-full bg-gray-700/50 text-white border border-gray-600/80 rounded-xl px-4 py-2 pl-10 focus:outline-none focus:border-emerald-500/70 focus:ring-1 focus:ring-emerald-500/50 transition-colors"
            />
            <div className="absolute left-3 top-2.5 text-gray-400">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
        </div>
        <div className="flex gap-4">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-gray-700/50 text-white border border-gray-600/80 rounded-xl px-4 py-2 focus:outline-none focus:border-emerald-500/70 focus:ring-1 focus:ring-emerald-500/50 transition-colors"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="processing">Processing</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-gray-800/50 rounded-xl shadow overflow-hidden border border-gray-700/50">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-700">
            <thead className="bg-gray-700/30">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Order ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Customer</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-gray-800/30 divide-y divide-gray-700">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center">
                    <div className="flex justify-center">
                      <div className="relative">
                        <div className="w-12 h-12 border-2 border-emerald-500/30 rounded-full"></div>
                        <div className="absolute inset-0 rounded-full border-t-2 border-emerald-500 animate-spin"></div>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Settings size={16} className="text-emerald-400" />
                        </div>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : paginatedOrders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-gray-400">
                    No orders found
                  </td>
                </tr>
              ) : (
                paginatedOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-700/30 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">
                      {order.id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                      {order.customer_name || 'Unknown'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                      {new Date(order.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                      ${(order.total_amount || 0).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-3 py-1 rounded-full text-sm font-medium border ${
                        order.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' :
                        order.status === 'processing' ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' :
                        order.status === 'completed' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' :
                        'bg-red-500/20 text-red-400 border-red-500/30'
                      }`}>
                        {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                      <button
                        onClick={() => {
                          setSelectedOrder(order);
                          setIsModalOpen(true);
                        }}
                        className="text-emerald-400 hover:text-emerald-300 transition-colors"
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-4 flex items-center justify-between border-t border-gray-700">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="relative inline-flex items-center px-4 py-2 border border-gray-700 text-sm font-medium rounded-md text-gray-300 bg-gray-800 hover:bg-gray-700 transition-colors"
              >
                Previous
              </button>
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-700 text-sm font-medium rounded-md text-gray-300 bg-gray-800 hover:bg-gray-700 transition-colors"
              >
                Next
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-400">
                  Showing <span className="font-medium text-white">{startIndex + 1}</span> to{' '}
                  <span className="font-medium text-white">
                    {Math.min(startIndex + 10, filteredOrders.length)}
                  </span>{' '}
                  of <span className="font-medium text-white">{filteredOrders.length}</span> results
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <button
                      key={page}
                      onClick={() => handlePageChange(page)}
                      className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                        currentPage === page
                          ? 'z-10 bg-emerald-500/20 border-emerald-500/50 text-emerald-400'
                          : 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700 transition-colors'
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Order Details Modal */}
      {isModalOpen && selectedOrder && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-gray-700/50">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-medium text-white">Order Details</h3>
                  <p className="text-sm text-gray-400">Order #{selectedOrder.id}</p>
                </div>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="text-gray-400 hover:text-gray-300 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
              
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <h4 className="text-sm font-medium text-gray-400">Customer</h4>
                  <p className="mt-1 text-white">{selectedOrder.customer_name || 'Unknown'}</p>
                  <p className="text-sm text-gray-400">{selectedOrder.customer_phone || 'N/A'}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-400">Order Date</h4>
                  <p className="mt-1 text-white">{new Date(selectedOrder.created_at).toLocaleDateString()}</p>
                </div>
              </div>

              <div className="mb-6">
                <h4 className="text-sm font-medium text-gray-400">Order Items</h4>
                <div className="mt-2 space-y-2">
                  {renderOrderItems(selectedOrder.items)}
                </div>
              </div>

              <div className="flex justify-between items-center">
                <div>
                  <h4 className="text-sm font-medium text-gray-400">Total Amount</h4>
                  <p className="text-lg font-medium text-white">${(selectedOrder.total_amount || 0).toFixed(2)}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-400">Status</h4>
                  <select
                    value={selectedOrder.status || 'pending'}
                    onChange={(e) => handleStatusChange(selectedOrder.id, e.target.value as Order['status'])}
                    className="mt-1 block w-full rounded-xl border-gray-700 bg-gray-800 text-white focus:border-emerald-500 focus:ring-emerald-500 sm:text-sm"
                  >
                    <option value="pending">Pending</option>
                    <option value="processing">Processing</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Add SettingsManager component
const SettingsManager = () => {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Settings</h2>
      <div className="bg-white rounded-lg shadow p-6">
        <p className="text-gray-500">Settings management coming soon...</p>
      </div>
    </div>
  );
};

export default AdminDashboard; 