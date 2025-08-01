// Configuration utility for environment variables
export const config = {
  // Payment Configuration
  upiId: process.env.NEXT_PUBLIC_UPI_ID || '8999169699@ybl',
  pricing: {
    basic: {
      amount: parseInt(process.env.NEXT_PUBLIC_BASIC_PRICE || '199'),
      display: process.env.NEXT_PUBLIC_BASIC_PRICE_DISPLAY || '₹199',
      tier: 'basic' as const
    },
    plus: {
      amount: parseInt(process.env.NEXT_PUBLIC_PLUS_PRICE || '399'),
      display: process.env.NEXT_PUBLIC_PLUS_PRICE_DISPLAY || '₹399',
      tier: 'plus' as const
    },
    premium: {
      amount: parseInt(process.env.NEXT_PUBLIC_PREMIUM_PRICE || '799'),
      display: process.env.NEXT_PUBLIC_PREMIUM_PRICE_DISPLAY || '₹799',
      tier: 'premium' as const
    }
  },
  
  // App Configuration
  appName: process.env.NEXT_PUBLIC_APP_NAME || 'Someshwar Cycling Club',
  challengeName: process.env.NEXT_PUBLIC_CHALLENGE_NAME || 'Virtual Cycling Challenge',
  
  // Important Dates
  registrationDeadline: '14th August 2025',
  challengeStartDate: '15th August 2025',
  challengeEndDate: '4th September 2025',
} as const

// Helper function to get price by tier
export const getPriceByTier = (tier: 'basic' | 'plus' | 'premium') => {
  return config.pricing[tier]
}

// Helper function to get price display by tier
export const getPriceDisplay = (tier: 'basic' | 'plus' | 'premium') => {
  return config.pricing[tier].display
}

// Helper function to get price amount by tier
export const getPriceAmount = (tier: 'basic' | 'plus' | 'premium') => {
  return config.pricing[tier].amount
}