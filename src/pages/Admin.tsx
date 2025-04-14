import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { Save, Image, DollarSign, Percent, Settings, LogOut } from 'lucide-react';

const AdminDashboard: React.FC = () => {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('images');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    
    try {
      setLoading(true);
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
    } catch (error: any) {
      setLoginError(error.message || 'An error occurred during login');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/admin');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="bg-gray-800 p-8 rounded-xl shadow-xl max-w-md w-full">
          <h1 className="text-2xl font-bold text-white mb-6 text-center">Admin Login</h1>
          
          {loginError && (
            <div className="bg-red-500/20 border border-red-500 text-red-200 px-4 py-3 rounded mb-4">
              {loginError}
            </div>
          )}
          
          <form onSubmit={handleLogin}>
            <div className="mb-4">
              <label className="block text-gray-300 mb-2" htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-gray-700 text-white border border-gray-600 rounded px-3 py-2 focus:outline-none focus:border-emerald-500"
                required
              />
            </div>
            
            <div className="mb-6">
              <label className="block text-gray-300 mb-2" htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-gray-700 text-white border border-gray-600 rounded px-3 py-2 focus:outline-none focus:border-emerald-500"
                required
              />
            </div>
            
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-2 px-4 rounded transition-colors"
            >
              {loading ? 'Loading...' : 'Login'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 flex">
      {/* Sidebar */}
      <div className="w-64 bg-gray-800 border-r border-gray-700">
        <div className="p-4 border-b border-gray-700">
          <h1 className="text-xl font-bold text-white">Admin Dashboard</h1>
        </div>
        
        <nav className="mt-4">
          <button
            onClick={() => setActiveTab('images')}
            className={`w-full text-left px-4 py-3 flex items-center gap-3 ${
              activeTab === 'images' ? 'bg-gray-700 text-emerald-400' : 'text-gray-300 hover:bg-gray-700/50'
            }`}
          >
            <Image size={18} />
            <span>Images</span>
          </button>
          
          <button
            onClick={() => setActiveTab('prices')}
            className={`w-full text-left px-4 py-3 flex items-center gap-3 ${
              activeTab === 'prices' ? 'bg-gray-700 text-emerald-400' : 'text-gray-300 hover:bg-gray-700/50'
            }`}
          >
            <DollarSign size={18} />
            <span>Prices</span>
          </button>
          
          <button
            onClick={() => setActiveTab('discounts')}
            className={`w-full text-left px-4 py-3 flex items-center gap-3 ${
              activeTab === 'discounts' ? 'bg-gray-700 text-emerald-400' : 'text-gray-300 hover:bg-gray-700/50'
            }`}
          >
            <Percent size={18} />
            <span>Discounts</span>
          </button>
          
          <button
            onClick={() => setActiveTab('settings')}
            className={`w-full text-left px-4 py-3 flex items-center gap-3 ${
              activeTab === 'settings' ? 'bg-gray-700 text-emerald-400' : 'text-gray-300 hover:bg-gray-700/50'
            }`}
          >
            <Settings size={18} />
            <span>Settings</span>
          </button>
        </nav>
        
        <div className="absolute bottom-0 left-0 w-64 p-4 border-t border-gray-700">
          <button
            onClick={handleLogout}
            className="w-full bg-gray-700 hover:bg-gray-600 text-gray-200 font-medium py-2 px-4 rounded transition-colors flex items-center justify-center gap-2"
          >
            <LogOut size={18} />
            <span>Logout</span>
          </button>
        </div>
      </div>
      
      {/* Main Content */}
      <div className="flex-1 p-8">
        {activeTab === 'images' && <ImageManager />}
        {activeTab === 'prices' && <PriceManager />}
        {activeTab === 'discounts' && <DiscountManager />}
        {activeTab === 'settings' && <SettingsManager />}
      </div>
    </div>
  );
};

// Image Manager Component
const ImageManager: React.FC = () => {
  const [bannerImage, setBannerImage] = useState('/images/banner.gif');
  const [logoImage, setLogoImage] = useState('https://i.imgur.com/ArKEQz1.png');
  const [isSaving, setIsSaving] = useState(false);
  
  const handleSaveImages = async () => {
    setIsSaving(true);
    
    try {
      // Save to Supabase table for site configuration
      await supabase
        .from('site_config')
        .upsert([
          { key: 'banner_image', value: bannerImage },
          { key: 'logo_image', value: logoImage }
        ]);
      
      alert('Images saved successfully!');
    } catch (error) {
      console.error('Error saving images:', error);
      alert('Failed to save images. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };
  
  return (
    <div>
      <h2 className="text-2xl font-bold text-white mb-6">Image Management</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-gray-800 p-6 rounded-xl">
          <h3 className="text-xl font-semibold text-white mb-4">Banner Image</h3>
          
          <div className="mb-4 bg-gray-900 p-2 rounded-lg">
            <img 
              src={bannerImage} 
              alt="Banner Preview" 
              className="w-full h-40 object-cover rounded-lg"
            />
          </div>
          
          <div className="mb-4">
            <label className="block text-gray-300 mb-2">Image URL</label>
            <input
              type="text"
              value={bannerImage}
              onChange={(e) => setBannerImage(e.target.value)}
              className="w-full bg-gray-700 text-white border border-gray-600 rounded px-3 py-2 focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>
        
        <div className="bg-gray-800 p-6 rounded-xl">
          <h3 className="text-xl font-semibold text-white mb-4">Logo Image</h3>
          
          <div className="mb-4 bg-gray-900 p-2 rounded-lg flex items-center justify-center">
            <img 
              src={logoImage} 
              alt="Logo Preview" 
              className="w-20 h-20 object-cover rounded-full border-2 border-emerald-500"
            />
          </div>
          
          <div className="mb-4">
            <label className="block text-gray-300 mb-2">Image URL</label>
            <input
              type="text"
              value={logoImage}
              onChange={(e) => setLogoImage(e.target.value)}
              className="w-full bg-gray-700 text-white border border-gray-600 rounded px-3 py-2 focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>
      </div>
      
      <div className="mt-8 flex justify-end">
        <button 
          onClick={handleSaveImages}
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
              <span>Save Changes</span>
            </>
          )}
        </button>
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
  
  const handleSavePrices = async () => {
    setIsSaving(true);
    
    try {
      // Update each product
      for (const product of products) {
        await supabase
          .from('products')
          .update({ price: product.price })
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
      <h2 className="text-2xl font-bold text-white mb-6">Price Management</h2>
      
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
                  <th className="text-left py-3 px-4 text-gray-300">Product Name</th>
                  <th className="text-left py-3 px-4 text-gray-300">Description</th>
                  <th className="text-left py-3 px-4 text-gray-300">Price ($)</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => (
                  <tr key={product.id} className="border-b border-gray-700">
                    <td className="py-3 px-4 text-white">{product.name}</td>
                    <td className="py-3 px-4 text-gray-300">{product.description}</td>
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

// Discount Manager Component
const DiscountManager: React.FC = () => {
  const [discounts, setDiscounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [newDiscount, setNewDiscount] = useState({
    code: '',
    percentage: 10,
    active: true,
    expiry_date: ''
  });
  
  useEffect(() => {
    const fetchDiscounts = async () => {
      try {
        const { data, error } = await supabase
          .from('discounts')
          .select('*')
          .order('id');
          
        if (error) throw error;
        
        setDiscounts(data || []);
      } catch (error) {
        console.error('Error fetching discounts:', error);
        alert('Failed to load discounts');
      } finally {
        setLoading(false);
      }
    };
    
    fetchDiscounts();
  }, []);
  
  const handleAddDiscount = async () => {
    if (!newDiscount.code) {
      alert('Please enter a discount code');
      return;
    }
    
    setIsSaving(true);
    
    try {
      const { data, error } = await supabase
        .from('discounts')
        .insert([newDiscount])
        .select();
        
      if (error) throw error;
      
      setDiscounts([...discounts, data[0]]);
      setNewDiscount({
        code: '',
        percentage: 10,
        active: true,
        expiry_date: ''
      });
      
      alert('Discount added successfully!');
    } catch (error) {
      console.error('Error adding discount:', error);
      alert('Failed to add discount. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleToggleDiscount = async (id: number, active: boolean) => {
    try {
      await supabase
        .from('discounts')
        .update({ active })
        .eq('id', id);
        
      setDiscounts(discounts.map(discount => 
        discount.id === id ? { ...discount, active } : discount
      ));
    } catch (error) {
      console.error('Error toggling discount:', error);
      alert('Failed to update discount status');
    }
  };
  
  if (loading) {
    return <div className="text-white">Loading discounts...</div>;
  }
  
  return (
    <div>
      <h2 className="text-2xl font-bold text-white mb-6">Discount Management</h2>
      
      <div className="grid grid-cols-1 gap-8">
        <div className="bg-gray-800 p-6 rounded-xl">
          <h3 className="text-xl font-semibold text-white mb-4">Add New Discount</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-gray-300 mb-2">Discount Code</label>
              <input
                type="text"
                value={newDiscount.code}
                onChange={(e) => setNewDiscount({ ...newDiscount, code: e.target.value.toUpperCase() })}
                className="w-full bg-gray-700 text-white border border-gray-600 rounded px-3 py-2 focus:outline-none focus:border-emerald-500"
                placeholder="SUMMER20"
              />
            </div>
            
            <div>
              <label className="block text-gray-300 mb-2">Discount Percentage</label>
              <input
                type="number"
                min="1"
                max="100"
                value={newDiscount.percentage}
                onChange={(e) => setNewDiscount({ ...newDiscount, percentage: parseInt(e.target.value) })}
                className="w-full bg-gray-700 text-white border border-gray-600 rounded px-3 py-2 focus:outline-none focus:border-emerald-500"
              />
            </div>
            
            <div>
              <label className="block text-gray-300 mb-2">Expiry Date (Optional)</label>
              <input
                type="date"
                value={newDiscount.expiry_date}
                onChange={(e) => setNewDiscount({ ...newDiscount, expiry_date: e.target.value })}
                className="w-full bg-gray-700 text-white border border-gray-600 rounded px-3 py-2 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>
          
          <div className="flex justify-end">
            <button 
              onClick={handleAddDiscount}
              disabled={isSaving}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-2 px-6 rounded-lg transition-colors flex items-center gap-2"
            >
              {isSaving ? 'Adding...' : 'Add Discount'}
            </button>
          </div>
        </div>
        
        <div className="bg-gray-800 p-6 rounded-xl">
          <h3 className="text-xl font-semibold text-white mb-4">Active Discounts</h3>
          
          {discounts.length === 0 ? (
            <p className="text-gray-300">No discounts found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="text-left py-3 px-4 text-gray-300">Code</th>
                    <th className="text-left py-3 px-4 text-gray-300">Percentage</th>
                    <th className="text-left py-3 px-4 text-gray-300">Expiry Date</th>
                    <th className="text-left py-3 px-4 text-gray-300">Status</th>
                    <th className="text-left py-3 px-4 text-gray-300">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {discounts.map((discount) => (
                    <tr key={discount.id} className="border-b border-gray-700">
                      <td className="py-3 px-4 text-white">{discount.code}</td>
                      <td className="py-3 px-4 text-gray-300">{discount.percentage}%</td>
                      <td className="py-3 px-4 text-gray-300">
                        {discount.expiry_date ? new Date(discount.expiry_date).toLocaleDateString() : 'No expiry'}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded text-xs ${discount.active ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'}`}>
                          {discount.active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <button
                          onClick={() => handleToggleDiscount(discount.id, !discount.active)}
                          className={`text-xs px-3 py-1 rounded ${
                            discount.active 
                              ? 'bg-red-600 hover:bg-red-700 text-white' 
                              : 'bg-green-600 hover:bg-green-700 text-white'
                          }`}
                        >
                          {discount.active ? 'Deactivate' : 'Activate'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
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