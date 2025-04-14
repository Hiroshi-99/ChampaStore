import React, { lazy, Suspense } from 'react';
import { RouterProvider, createBrowserRouter } from 'react-router-dom';
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

// Create router with future flags enabled
const router = createBrowserRouter(
  [
    { path: "/", element: <Store /> },
    { 
      path: "/admin", 
      element: (
        <Suspense fallback={<LazyLoading />}>
          <AdminDashboard />
        </Suspense>
      )
    },
    { path: "*", element: <Navigate to="/" /> }
  ],
  {
    // Enable React Router v7 behavior for relative paths in splat routes
    future: {
      v7_relativeSplatPath: true
    }
  }
);

// Import Navigate separately to avoid any issues
import { Navigate } from 'react-router-dom';

function App() {
  return (
    <>
      <Toaster position="top-center" />
      <RouterProvider 
        router={router} 
        future={{
          v7_startTransition: true
        }}
      />
    </>
  );
}

export default App;