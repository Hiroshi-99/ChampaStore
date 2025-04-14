import React, { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Store from './pages/Store';

// Lazy load the admin dashboard for performance
const AdminDashboard = lazy(() => import('./pages/Admin'));

// Loading component for lazy-loaded routes
const LazyLoading = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-900">
    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500"></div>
  </div>
);

function App() {
  return (
    <>
      <Toaster position="top-center" />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Store />} />
          <Route path="/admin" element={
            <Suspense fallback={<LazyLoading />}>
              <AdminDashboard />
            </Suspense>
          } />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </>
  );
}

export default App;