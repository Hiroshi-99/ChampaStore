// Application configuration
export const APP_CONFIG = {
  storeName: 'Champa Store',
  logoUrl: 'https://i.imgur.com/ArKEQz1.png',
  primaryColor: 'emerald',
  secondaryColor: 'gray',
  
  // Theme configuration with color mappings
  colors: {
    primary: {
      light: 'from-emerald-400 to-emerald-600',
      main: 'from-emerald-500 to-emerald-600',
      dark: 'from-emerald-600 to-emerald-700',
      solid: 'emerald-500',
      text: 'emerald-400',
      border: 'emerald-500',
      hover: 'emerald-600',
    },
    secondary: {
      main: 'gray-700',
      dark: 'gray-800',
      light: 'gray-600',
    },
    background: {
      main: 'gray-800',
      dark: 'gray-900',
      light: 'gray-700',
    }
  },

  // Rate limiting configuration
  rateLimiting: {
    duration: 60 * 1000, // 1 minute,
    maxAttempts: 3,
    blockDuration: 10 * 60 * 1000, // 10 minutes
  },

  // Payment methods configuration
  payment: {
    qrCodePath: '/images/qr/qrcode.jpg',
    proofRequirements: {
      acceptedTypes: ['image/jpeg', 'image/png', 'image/webp'],
      maxSize: 3 * 1024 * 1024, // 3MB
    },
  },

  // Default form values
  defaults: {
    platform: 'java',
    rank: 'VIP',
  },

  // Error message templates
  errorMessages: {
    invalidUsername: 'Invalid Minecraft username format. Use only letters, numbers, and underscores.',
    fileTooLarge: 'Image size should be less than 3MB',
    invalidFileType: 'Please upload a JPG, PNG, or WebP image',
    uploadFailed: 'Failed to upload payment proof. Please try again.',
    rateLimited: 'Too many attempts. Please try again later.',
  },

  // Animation settings
  animations: {
    duration: {
      fast: 200,
      normal: 300,
      slow: 500,
    },
    timing: {
      bounce: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
      ease: 'ease-in-out',
      linear: 'linear',
    },
  },

  // API endpoints
  api: {
    webhookUrl: '/.netlify/functions/discord-webhook',
    imageProxyUrl: '/.netlify/functions/image-proxy',
  },

  // Feature flags
  features: {
    enableAnimations: true,
    enableFormSteps: true,
    enableLocalStorage: true,
    showPaymentProof: true,
    debugMode: false,
  },
}; 