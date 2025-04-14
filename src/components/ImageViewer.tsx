import React, { useState, useEffect, useCallback, useRef } from 'react';
import { X, ZoomIn, ZoomOut, RotateCw, Download } from 'lucide-react';

interface ImageViewerProps {
  imageUrl: string;
  onClose: () => void;
  alt?: string;
  initialScale?: number;
  enableControls?: boolean;
  enableDownload?: boolean;
  enableRotate?: boolean;
  disableAnimation?: boolean;
}

export default function ImageViewer({
  imageUrl,
  onClose,
  alt = 'Image preview',
  initialScale = 1,
  enableControls = true,
  enableDownload = true,
  enableRotate = true,
  disableAnimation = false,
}: ImageViewerProps) {
  // State for image manipulation
  const [scale, setScale] = useState(initialScale);
  const [rotation, setRotation] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  
  // Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  
  // Animation class based on config
  const animationClass = disableAnimation 
    ? '' 
    : 'transition-all duration-300';
  
  // Preload image and handle loading states
  useEffect(() => {
    if (!imageUrl) {
      setError(true);
      setIsLoading(false);
      return;
    }
    
    const img = new Image();
    img.src = imageUrl;
    
    img.onload = () => {
      setIsLoading(false);
    };
    
    img.onerror = () => {
      setError(true);
      setIsLoading(false);
      console.error('Failed to load image:', imageUrl);
    };
    
    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [imageUrl]);

  // Handle zoom
  const handleZoom = useCallback((zoomIn: boolean) => {
    setScale(prevScale => {
      if (zoomIn) {
        return prevScale < 3 ? prevScale + 0.5 : prevScale;
      } else {
        return prevScale > 0.5 ? prevScale - 0.5 : prevScale;
      }
    });
  }, []);

  // Handle rotation
  const handleRotate = useCallback(() => {
    setRotation(prev => (prev + 90) % 360);
  }, []);

  // Handle download
  const handleDownload = useCallback(() => {
    if (!imageUrl) return;
    
    const link = document.createElement('a');
    // Extract file name from URL or use default
    let filename = 'image.jpg';
    try {
      const url = new URL(imageUrl);
      const pathSegments = url.pathname.split('/');
      const lastSegment = pathSegments[pathSegments.length - 1];
      if (lastSegment && lastSegment.includes('.')) {
        filename = lastSegment;
      }
    } catch (e) {
      console.error('Error parsing URL:', e);
    }
    
    link.href = imageUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [imageUrl]);

  // Handle drag operations for panning
  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLImageElement>) => {
    e.preventDefault();
    setIsDragging(true);
    setDragStart({ 
      x: e.clientX - position.x, 
      y: e.clientY - position.y 
    });
  }, [position]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  }, [isDragging, dragStart]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Reset position when scale changes
  useEffect(() => {
    if (scale === 1) {
      setPosition({ x: 0, y: 0 });
    }
  }, [scale]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === '+' || e.key === '=') {
        handleZoom(true);
      } else if (e.key === '-' || e.key === '_') {
        handleZoom(false);
      } else if (e.key === 'r') {
        handleRotate();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose, handleZoom, handleRotate]);

  // Close on background click
  const handleBackgroundClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === containerRef.current) {
      onClose();
    }
  }, [onClose]);

  return (
    <div 
      ref={containerRef}
      className="fixed inset-0 bg-black/95 z-[60] flex items-center justify-center p-4 overflow-hidden"
      onClick={handleBackgroundClick}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      style={{ cursor: isDragging ? 'grabbing' : 'auto' }}
    >
      {/* Close button */}
      <button 
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        className="absolute right-6 top-6 bg-gray-800/80 p-2 rounded-full text-white hover:bg-gray-700/80 transition-colors"
        aria-label="Close image viewer"
      >
        <X size={24} />
      </button>
      
      {/* Controls */}
      {enableControls && (
        <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 bg-gray-800/80 rounded-full px-4 py-2 flex items-center space-x-3">
          <button 
            onClick={(e) => {
              e.stopPropagation();
              handleZoom(false);
            }}
            className="p-2 text-white hover:text-emerald-400 transition-colors"
            aria-label="Zoom out"
            disabled={scale <= 0.5}
          >
            <ZoomOut size={20} />
          </button>
          
          <div className="text-white text-sm px-2">
            {Math.round(scale * 100)}%
          </div>
          
          <button 
            onClick={(e) => {
              e.stopPropagation();
              handleZoom(true);
            }}
            className="p-2 text-white hover:text-emerald-400 transition-colors"
            aria-label="Zoom in"
            disabled={scale >= 3}
          >
            <ZoomIn size={20} />
          </button>
          
          {enableRotate && (
            <button 
              onClick={(e) => {
                e.stopPropagation();
                handleRotate();
              }}
              className="p-2 text-white hover:text-emerald-400 transition-colors"
              aria-label="Rotate image"
            >
              <RotateCw size={20} />
            </button>
          )}
          
          {enableDownload && (
            <button 
              onClick={(e) => {
                e.stopPropagation();
                handleDownload();
              }}
              className="p-2 text-white hover:text-emerald-400 transition-colors"
              aria-label="Download image"
            >
              <Download size={20} />
            </button>
          )}
        </div>
      )}
      
      {/* Loading state */}
      {isLoading && (
        <div className="flex flex-col items-center justify-center">
          <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-white text-sm">Loading image...</p>
        </div>
      )}
      
      {/* Error state */}
      {error && (
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 text-gray-500">
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <p className="text-white mb-2">Failed to load image</p>
          <p className="text-gray-400 text-sm max-w-md">The image could not be loaded due to an error. Please try again or check the image URL.</p>
        </div>
      )}
      
      {/* Image */}
      {!isLoading && !error && (
        <img 
          ref={imageRef}
          src={imageUrl} 
          alt={alt}
          className={`max-h-[90vh] object-contain ${animationClass}`}
          style={{ 
            transform: `translate(${position.x}px, ${position.y}px) scale(${scale}) rotate(${rotation}deg)`,
            cursor: isDragging ? 'grabbing' : (scale > 1 ? 'grab' : 'auto')
          }}
          onMouseDown={scale > 1 ? handleMouseDown : undefined}
          onClick={(e) => e.stopPropagation()}
          draggable={false}
          crossOrigin="anonymous"
        />
      )}
    </div>
  );
}