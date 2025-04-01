import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Store from './pages/Store';
import Admin from './pages/Admin';
import { AuthProvider, useAuth } from './contexts/AuthContext';

function ProtectedAdminRoute({ children }: { children: React.ReactNode }) {
  const { user, isAdmin, loading } = useAuth();
  
  if (loading) {
    return <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white">
      <p>Loading...</p>
    </div>;
  }
  
  if (!user) {
    return <Navigate to="/" replace />;
  }

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }
  
  return <>{children}</>;
}

function App() {
  return (
    <AuthProvider>
      <Toaster position="top-center" />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Store />} />
          <Route 
            path="/admin" 
            element={
              <ProtectedAdminRoute>
                <Admin />
              </ProtectedAdminRoute>
            } 
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;