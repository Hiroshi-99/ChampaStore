import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { Save, Image, DollarSign, Percent, Settings, LogOut, ShoppingCart, FileText, X, AlertTriangle, Lock, Upload, Shield, Info } from 'lucide-react';
import { toast } from 'react-hot-toast';

// Enhanced authentication with SessionProvider pattern
const useAuth = () => {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const navigate = useNavigate();

  // Session monitoring
  useEffect(() => {
    const fetchSession = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;
        setSession(data.session);
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

  // Login handler with rate limiting and security enhancements
  const login = useCallback(async (email: string, password: string) => {
    if (!email || !password) {
      setAuthError('Please enter both email and password');
      return false;
    }

    setLoading(true);
    setAuthError(null);

    try {
      // Add short delay to prevent brute force
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) throw error;
      return true;
    } catch (error: any) {
      setAuthError(error.message || 'Authentication failed');
      console.error('Login error:', error);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  // Logout handler
  const logout = useCallback(async () => {
    setLoading(true);
    try {
      await supabase.auth.signOut();
      navigate('/admin');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  return { session, loading, authError, login, logout };
};

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
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 to-gray-800">
        <div className="flex flex-col items-center gap-4">
          <div className="relative w-16 h-16">
            <div className="absolute inset-0 rounded-full border-2 border-emerald-500/30"></div>
            <div className="absolute inset-0 rounded-full border-t-2 border-emerald-500 animate-spin"></div>
            <div className="absolute inset-2 rounded-full bg-gray-800 flex items-center justify-center">
              <Settings size={20} className="text-emerald-400" />
            </div>
          </div>
          <p className="text-emerald-400 font-medium">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  // Login screen
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
          
          {authError && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-300 px-4 py-3 rounded-xl mb-6 flex items-start gap-3 backdrop-blur-sm">
              <AlertTriangle className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
              <p className="text-sm">{authError}</p>
            </div>
          )}
          
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
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex">
      {/* Responsive Sidebar */}
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
      </div>
      
      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 inset-x-0 z-10 bg-gray-800 border-b border-gray-700 p-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-lg flex items-center justify-center">
              <Settings size={16} className="text-white" />
            </div>
            <h1 className="text-lg font-bold text-white">Admin Panel</h1>
          </div>
          <button
            onClick={logout}
            className="p-2 rounded-lg bg-gray-700 text-gray-300"
          >
            <LogOut size={18} />
          </button>
        </div>
        
        <div className="mt-4 grid grid-cols-4 gap-1">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-col items-center justify-center p-2 rounded-lg ${
                activeTab === tab.id
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : 'text-gray-400 hover:bg-gray-700'
              }`}
            >
              {tab.icon}
              <span className="text-xs mt-1">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>
      
      {/* Main Content */}
      <div className="flex-1 overflow-x-hidden md:p-0 md:pt-0 pt-28 p-4">
        <div className="container mx-auto p-4 md:p-6 max-w-6xl">
          {/* Page Title */}
          <div className="mb-6 hidden md:block">
            <h1 className="text-2xl font-bold text-white">
              {tabs.find(tab => tab.id === activeTab)?.label}
            </h1>
            <p className="text-gray-400 mt-1">
              Manage your store {tabs.find(tab => tab.id === activeTab)?.label.toLowerCase()} settings
            </p>
          </div>
          
          {/* Tab Content */}
          <div className="transition-all duration-300">
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
  
  useEffect(() => {
    const fetchImages = async () => {
      try {
        // Fetch site configuration
        const { data: configData, error: configError } = await supabase
          .from('site_config')
          .select('*')
          .in('key', ['banner_image', 'logo_image', 'qr_code_image', 'receipt_image', 'receipt_logo_image']);
          
        if (configError) throw configError;
        
        if (configData) {
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
        
        if (rankData && rankData.length > 0) {
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
        setLoading(false);
      }
    };
    
    fetchImages();
  }, []);
  
  const handleSaveImages = async () => {
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
  };
  
  const handleRankImageChange = (value: string) => {
    setRankImages({
      ...rankImages,
      [selectedRank]: value
    });
  };

  // File upload handler for direct uploads
  const handleFileUpload = async (file: File, imageType: string) => {
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
  };
  
  // Image uploader component for reuse
  const ImageUploader = ({ 
    imageType, 
    currentUrl, 
    label 
  }: { 
    imageType: string; 
    currentUrl: string;
    label: string;
  }) => (
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
            if (file) handleFileUpload(file, imageType);
          }}
          disabled={!!uploadLoading}
        />
      </label>
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="relative">
          <div className="w-12 h-12 border-2 border-emerald-500/30 rounded-full"></div>
          <div className="absolute inset-0 rounded-full border-t-2 border-emerald-500 animate-spin"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <Image size={16} className="text-emerald-400" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Floating save button */}
      <div className="fixed bottom-6 right-6 z-40">
        <button
          onClick={handleSaveImages}
          disabled={isSaving || !!uploadLoading}
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
      </div>

      {/* Main store images */}
      <div className="bg-gradient-to-br from-gray-800/80 to-gray-800/40 rounded-2xl p-6 border border-gray-700/50 backdrop-blur-sm shadow-xl">
        <h3 className="text-xl font-semibold text-white mb-5 pb-3 border-b border-gray-700/50 flex items-center gap-2">
          <div className="bg-emerald-500/20 p-1.5 rounded-lg">
            <Image size={18} className="text-emerald-400" />
          </div>
          Main Store Images
        </h3>
          
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
                <ImageUploader imageType="logo" currentUrl={logoImage} label="Logo" />
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
                <ImageUploader imageType="banner" currentUrl={bannerImage} label="Banner" />
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
              <ImageUploader imageType="qr_code" currentUrl={qrCodeImage} label="QR Code" />
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
      </div>
        
      <div className="bg-gradient-to-br from-gray-800/80 to-gray-800/40 rounded-2xl p-6 border border-gray-700/50 backdrop-blur-sm shadow-xl">
        <h3 className="text-xl font-semibold text-white mb-5 pb-3 border-b border-gray-700/50 flex items-center gap-2">
          <div className="bg-emerald-500/20 p-1.5 rounded-lg">
            <FileText size={18} className="text-emerald-400" />
          </div>
          Receipt Images
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-gray-300 mb-2 font-medium">Receipt Background</label>
            <div className="mb-3 bg-gray-900/70 p-4 rounded-xl flex items-center justify-center relative group overflow-hidden border border-gray-700/50 shadow-md hover:shadow-emerald-900/10 transition-shadow">
              <img 
                src={receiptImage} 
                alt="Receipt Background Preview" 
                className="w-full h-40 object-cover rounded-lg"
              />
              <ImageUploader imageType="receipt" currentUrl={receiptImage} label="Background" />
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
              <ImageUploader imageType="receipt_logo" currentUrl={receiptLogoImage} label="Logo" />
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
      </div>
      
      {/* Rank Preview Images Section */}
      <div className="bg-gradient-to-br from-gray-800/80 to-gray-800/40 rounded-2xl p-6 border border-gray-700/50 backdrop-blur-sm shadow-xl">
        <h3 className="text-xl font-semibold text-white mb-5 pb-3 border-b border-gray-700/50 flex items-center gap-2">
          <div className="bg-emerald-500/20 p-1.5 rounded-lg">
            <Shield size={18} className="text-emerald-400" />
          </div>
          Rank Preview Images
        </h3>
        
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
                  src={rankImages[selectedRank]} 
                  alt={`${selectedRank} Rank Preview`} 
                  className="h-48 object-contain relative"
                />
              </div>
              <ImageUploader imageType="rank" currentUrl={rankImages[selectedRank]} label="Image" />
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
                  value={rankImages[selectedRank]}
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
    </div>
  );
};

// Price Manager Component
const PriceManager: React.FC = () => {
  const [products, setProducts] = useState<any[]>([]);
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
        
        setProducts(data || []);
      } catch (error) {
        console.error('Error fetching products:', error);
        alert('Failed to load products');
      } finally {
        setLoading(false);
      }
    };
    
    fetchProducts();
  }, []);
  
  const handlePriceChange = (id: number, newPrice: number) => {
    setProducts(products.map(product => 
      product.id === id ? { ...product, price: newPrice } : product
    ));
  };
  
  const handleOriginalPriceChange = (id: number, newOriginalPrice: number | null) => {
    setProducts(products.map(product => 
      product.id === id ? { ...product, original_price: newOriginalPrice } : product
    ));
  };
  
  const applyDiscount = (id: number, discountPercentage: number) => {
    const product = products.find(p => p.id === id);
    if (!product) return;
    
    const currentPrice = parseFloat(product.price);
    // Set original price to current price if not already set
    const originalPrice = product.original_price ? parseFloat(product.original_price) : currentPrice;
    
    // Calculate new price with discount
    const discountedPrice = (originalPrice * (100 - discountPercentage) / 100).toFixed(2);
    
    setProducts(products.map(p => 
      p.id === id ? { ...p, price: discountedPrice, original_price: originalPrice } : p
    ));
  };
  
  const removeDiscount = (id: number) => {
    const product = products.find(p => p.id === id);
    if (!product || !product.original_price) return;
    
    // Reset price to original price
    setProducts(products.map(p => 
      p.id === id ? { ...p, price: product.original_price, original_price: null } : p
    ));
  };
  
  const handleSavePrices = async () => {
    setIsSaving(true);
    
    try {
      // Update each product
      for (const product of products) {
        await supabase
          .from('products')
          .update({ 
            price: product.price,
            original_price: product.original_price
          })
          .eq('id', product.id);
      }
      
      alert('Prices updated successfully!');
    } catch (error) {
      console.error('Error saving prices:', error);
      alert('Failed to save prices. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };
  
  if (loading) {
    return <div className="text-white">Loading products...</div>;
  }
  
  return (
    <div>
      <h2 className="text-2xl font-bold text-white mb-6">Price & Discount Management</h2>
      
      {products.length === 0 ? (
        <div className="bg-gray-800 p-6 rounded-xl">
          <p className="text-gray-300">No products found. Please add products first.</p>
        </div>
      ) : (
        <div className="bg-gray-800 p-6 rounded-xl">
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
                        onChange={(e) => handlePriceChange(product.id, parseFloat(e.target.value))}
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
                          const value = e.target.value ? parseFloat(e.target.value) : null;
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
                              const value = parseInt(e.target.value);
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
            <button 
              onClick={handleSavePrices}
              disabled={isSaving}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-2 px-6 rounded-lg transition-colors flex items-center gap-2"
            >
              {isSaving ? (
                <>
                  <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save size={18} />
                  <span>Save Prices</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// Orders Manager Component
const OrdersManager: React.FC = () => {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [showModal, setShowModal] = useState(false);
  const [orderActionLoading, setOrderActionLoading] = useState<number | null>(null);
  
  useEffect(() => {
    const fetchOrders = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('orders')
          .select('*')
          .order('created_at', { ascending: false });
          
        if (error) throw error;
        
        setOrders(data || []);
      } catch (error) {
        console.error('Error fetching orders:', error);
        toast.error('Failed to load orders');
      } finally {
        setLoading(false);
      }
    };
    
    fetchOrders();
  }, []);
  
  const handleStatusChange = async (id: number, status: string) => {
    setOrderActionLoading(id);
    
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status })
        .eq('id', id);
        
      if (error) throw error;
      
      setOrders(orders.map(order => 
        order.id === id ? { ...order, status } : order
      ));
      
      toast.success(`Order #${id} status updated to: ${status}`);
    } catch (error) {
      console.error('Error updating order status:', error);
      toast.error('Failed to update order status');
    } finally {
      setOrderActionLoading(null);
    }
  };
  
  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-500/20 text-yellow-300';
      case 'completed':
        return 'bg-green-500/20 text-green-300';
      case 'cancelled':
        return 'bg-red-500/20 text-red-300';
      default:
        return 'bg-gray-500/20 text-gray-300';
    }
  };

  const viewOrderDetails = (order: any) => {
    setSelectedOrder(order);
    setShowModal(true);
  };
  
  if (loading) {
    return (
      <div className="bg-gray-800 p-8 rounded-xl flex flex-col items-center justify-center min-h-[300px]">
        <div className="relative w-16 h-16 mb-4">
          <div className="absolute inset-0 rounded-full border-2 border-emerald-500/30"></div>
          <div className="absolute inset-0 rounded-full border-t-2 border-emerald-500 animate-spin"></div>
          <div className="absolute inset-2 rounded-full bg-gray-800 flex items-center justify-center">
            <ShoppingCart size={20} className="text-emerald-400" />
          </div>
        </div>
        <p className="text-emerald-400 font-medium">Loading orders...</p>
      </div>
    );
  }
  
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-white">Order Management</h2>
        <button 
          onClick={() => window.location.reload()} 
          className="bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 px-4 py-2 rounded-lg text-sm flex items-center gap-2 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh
        </button>
      </div>
      
      {orders.length === 0 ? (
        <div className="bg-gray-800 p-8 rounded-xl text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-700/50 mb-4">
            <ShoppingCart size={24} className="text-gray-400" />
          </div>
          <p className="text-gray-300 text-lg mb-2">No orders found</p>
          <p className="text-gray-500 text-sm max-w-md mx-auto">When customers place orders, they will appear here for you to manage.</p>
        </div>
      ) : (
        <div className="bg-gray-800 p-6 rounded-xl">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left py-3 px-4 text-gray-300">Order ID</th>
                  <th className="text-left py-3 px-4 text-gray-300">Username</th>
                  <th className="text-left py-3 px-4 text-gray-300">Platform</th>
                  <th className="text-left py-3 px-4 text-gray-300">Rank</th>
                  <th className="text-left py-3 px-4 text-gray-300">Price</th>
                  <th className="text-left py-3 px-4 text-gray-300">Date</th>
                  <th className="text-left py-3 px-4 text-gray-300">Status</th>
                  <th className="text-left py-3 px-4 text-gray-300">Actions</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id} className="border-b border-gray-700 hover:bg-gray-700/30 transition-colors">
                    <td className="py-3 px-4 text-gray-300">#{order.id}</td>
                    <td className="py-3 px-4 text-white">{order.username}</td>
                    <td className="py-3 px-4 text-gray-300 capitalize">{order.platform}</td>
                    <td className="py-3 px-4 text-gray-300">{order.rank}</td>
                    <td className="py-3 px-4 text-gray-300">${parseFloat(order.price).toFixed(2)}</td>
                    <td className="py-3 px-4 text-gray-300">{new Date(order.created_at).toLocaleDateString()}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 rounded text-xs ${getStatusBadgeClass(order.status)}`}>
                        {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex gap-2">
                        <button 
                          onClick={() => viewOrderDetails(order)}
                          className="bg-gray-600 hover:bg-gray-500 text-white px-2 py-1 rounded text-xs"
                        >
                          Details
                        </button>
                        <button 
                          onClick={() => handleStatusChange(order.id, 'completed')}
                          disabled={orderActionLoading === order.id || order.status === 'completed'}
                          className="bg-green-600 hover:bg-green-700 text-white px-2 py-1 rounded text-xs disabled:opacity-50 flex items-center"
                        >
                          {orderActionLoading === order.id ? (
                            <><span className="h-3 w-3 mr-1 rounded-full border-2 border-white border-t-transparent animate-spin"></span>Wait</>
                          ) : (
                            'Complete'
                          )}
                        </button>
                        <button 
                          onClick={() => handleStatusChange(order.id, 'cancelled')}
                          disabled={orderActionLoading === order.id || order.status === 'cancelled'}
                          className="bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded text-xs disabled:opacity-50"
                        >
                          Cancel
                        </button>
                        {order.payment_proof && (
                          <button 
                            onClick={() => window.open(order.payment_proof, '_blank')}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded text-xs flex items-center"
                          >
                            <FileText size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Order Details Modal */}
      {showModal && selectedOrder && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 flex items-center justify-center p-4">
          <div className="bg-gray-800 rounded-xl max-w-2xl w-full relative border border-gray-700 shadow-xl animate-fadeIn">
            <button 
              onClick={() => setShowModal(false)}
              className="absolute right-4 top-4 text-gray-400 hover:text-white"
            >
              <X size={20} />
            </button>
            
            <div className="p-6">
              <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-700">
                <h3 className="text-xl font-bold text-white">Order Details</h3>
                <span className={`px-3 py-1 rounded-full text-xs ${getStatusBadgeClass(selectedOrder.status)}`}>
                  {selectedOrder.status.charAt(0).toUpperCase() + selectedOrder.status.slice(1)}
                </span>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                  <div className="flex flex-col space-y-4">
                    <div>
                      <p className="text-gray-400 text-sm">Order ID</p>
                      <p className="text-white font-medium">#{selectedOrder.id}</p>
                    </div>
                    <div>
                      <p className="text-gray-400 text-sm">Date</p>
                      <p className="text-white">{new Date(selectedOrder.created_at).toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-gray-400 text-sm">Username</p>
                      <p className="text-white font-medium">{selectedOrder.username}</p>
                    </div>
                  </div>
                </div>
                
                <div>
                  <div className="flex flex-col space-y-4">
                    <div>
                      <p className="text-gray-400 text-sm">Platform</p>
                      <p className="text-white capitalize">{selectedOrder.platform}</p>
                    </div>
                    <div>
                      <p className="text-gray-400 text-sm">Rank</p>
                      <p className="text-white font-medium">{selectedOrder.rank}</p>
                    </div>
                    <div>
                      <p className="text-gray-400 text-sm">Price</p>
                      <p className="text-emerald-400 font-bold">${parseFloat(selectedOrder.price).toFixed(2)}</p>
                    </div>
                  </div>
                </div>
              </div>

              {selectedOrder.payment_proof && (
                <div className="mb-6">
                  <p className="text-gray-400 text-sm mb-2">Payment Proof</p>
                  <div className="bg-gray-900 p-2 rounded-lg border border-gray-700">
                    <img 
                      src={selectedOrder.payment_proof} 
                      alt="Payment Proof" 
                      className="w-full h-auto max-h-64 object-contain rounded"
                      onError={(e) => {
                        e.currentTarget.src = 'https://via.placeholder.com/300x200?text=Image+Not+Available';
                      }}
                    />
                  </div>
                </div>
              )}
              
              <div className="flex justify-between items-center pt-4 border-t border-gray-700">
                <button
                  onClick={() => setShowModal(false)}
                  className="bg-gray-600 hover:bg-gray-500 text-white px-4 py-2 rounded"
                >
                  Close
                </button>
                <div className="flex gap-2">
                  <button 
                    onClick={() => {
                      handleStatusChange(selectedOrder.id, 'completed');
                      setShowModal(false);
                    }}
                    disabled={orderActionLoading === selectedOrder.id || selectedOrder.status === 'completed'}
                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded disabled:opacity-50"
                  >
                    Mark Completed
                  </button>
                  <button 
                    onClick={() => {
                      handleStatusChange(selectedOrder.id, 'cancelled');
                      setShowModal(false);
                    }}
                    disabled={orderActionLoading === selectedOrder.id || selectedOrder.status === 'cancelled'}
                    className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded disabled:opacity-50"
                  >
                    Cancel Order
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Settings Manager Component
const SettingsManager: React.FC = () => {
  const [settings, setSettings] = useState({
    site_title: 'CHAMPA STORE',
    discord_webhook_url: '',
    maintenance_mode: false,
    background_video_url: '/videos/background.mp4'
  });
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const { data, error } = await supabase
          .from('site_config')
          .select('*');
          
        if (error) throw error;
        
        if (data && data.length > 0) {
          const configObj = data.reduce((acc: any, item: any) => {
            acc[item.key] = item.value;
            return acc;
          }, {});
          
          setSettings({
            site_title: configObj.site_title || 'CHAMPA STORE',
            discord_webhook_url: configObj.discord_webhook_url || '',
            maintenance_mode: configObj.maintenance_mode === 'true',
            background_video_url: configObj.background_video_url || '/videos/background.mp4'
          });
        }
      } catch (error) {
        console.error('Error fetching settings:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchSettings();
  }, []);
  
  const handleSaveSettings = async () => {
    setIsSaving(true);
    
    try {
      // Convert settings to array format for supabase
      const settingsArray = Object.entries(settings).map(([key, value]) => ({
        key,
        value: typeof value === 'boolean' ? value.toString() : value
      }));
      
      await supabase
        .from('site_config')
        .upsert(settingsArray);
      
      alert('Settings saved successfully!');
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Failed to save settings. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };
  
  if (loading) {
    return <div className="text-white">Loading settings...</div>;
  }
  
  return (
    <div>
      <h2 className="text-2xl font-bold text-white mb-6">Site Settings</h2>
      
      <div className="bg-gray-800 p-6 rounded-xl">
        <div className="grid grid-cols-1 gap-4 mb-6">
          <div>
            <label className="block text-gray-300 mb-2">Site Title</label>
            <input
              type="text"
              value={settings.site_title}
              onChange={(e) => setSettings({ ...settings, site_title: e.target.value })}
              className="w-full bg-gray-700 text-white border border-gray-600 rounded px-3 py-2 focus:outline-none focus:border-emerald-500"
            />
          </div>
          
          <div>
            <label className="block text-gray-300 mb-2">Discord Webhook URL</label>
            <input
              type="text"
              value={settings.discord_webhook_url}
              onChange={(e) => setSettings({ ...settings, discord_webhook_url: e.target.value })}
              className="w-full bg-gray-700 text-white border border-gray-600 rounded px-3 py-2 focus:outline-none focus:border-emerald-500"
              placeholder="https://discord.com/api/webhooks/..."
            />
          </div>
          
          <div>
            <label className="block text-gray-300 mb-2">Background Video URL</label>
            <input
              type="text"
              value={settings.background_video_url}
              onChange={(e) => setSettings({ ...settings, background_video_url: e.target.value })}
              className="w-full bg-gray-700 text-white border border-gray-600 rounded px-3 py-2 focus:outline-none focus:border-emerald-500"
            />
          </div>
          
          <div className="flex items-center mt-2">
            <input
              id="maintenance_mode"
              type="checkbox"
              checked={settings.maintenance_mode}
              onChange={(e) => setSettings({ ...settings, maintenance_mode: e.target.checked })}
              className="h-4 w-4 bg-gray-700 border-gray-600 rounded focus:ring-emerald-500 text-emerald-500"
            />
            <label htmlFor="maintenance_mode" className="ml-2 text-gray-300">
              Enable Maintenance Mode
            </label>
          </div>
        </div>
        
        <div className="flex justify-end">
          <button 
            onClick={handleSaveSettings}
            disabled={isSaving}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-2 px-6 rounded-lg transition-colors flex items-center gap-2"
          >
            {isSaving ? (
              <>
                <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Save size={18} />
                <span>Save Settings</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard; 