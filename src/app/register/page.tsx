'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'
// import { useRouter } from 'next/navigation' // Not used currently
import Link from 'next/link'
import { isAdmin } from '@/lib/admin'

interface ExistingRegistration {
  id: string
  full_name: string
  mobile_number: string
  email_address: string
  full_address: string
  gender: string
  strava_profile_link: string
  tshirt_size: string
  delivery_address: string
  where_heard: string
  registration_status: string
  created_at: string
}

export default function Register() {
  const { user } = useAuth()
  // const router = useRouter() // Not used currently
  
  const [formData, setFormData] = useState({
    fullName: '',
    mobileNumber: '',
    emailAddress: user?.email || '',
    fullAddress: '',
    gender: '',
    stravaProfileLink: '',
    tshirtSize: '',
    deliveryAddress: '',
    whereHeard: '',
    paymentTier: '' // basic, plus, premium
  })
  
  const [paymentFile, setPaymentFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [existingRegistration, setExistingRegistration] = useState<ExistingRegistration | null>(null)
  const [checkingRegistration, setCheckingRegistration] = useState(true)

  // Check if user has already registered
  useEffect(() => {
    const checkExistingRegistration = async () => {
      if (!user) {
        setCheckingRegistration(false)
        return
      }
      
      try {
        // Use dedicated function to check registration
        const { data, error } = await supabase.rpc('check_user_registration')

        if (error) {
          console.error('Error checking registration:', error)
          console.error('Error details:', {
            message: error.message || 'No message',
            code: error.code || 'No code', 
            details: error.details || 'No details',
            hint: error.hint || 'No hint',
            full_error: JSON.stringify(error)
          })
          // Don't throw error, just log it and continue
        } else if (data && data.length > 0) {
          // Function returns array, take first result
          setExistingRegistration(data[0])
        }
        // If no data, user hasn't registered yet - this is fine
      } catch (error) {
        console.error('Error checking registration:', error)
        if (error instanceof Error) {
          console.error('Caught error details:', {
            name: error.name,
            message: error.message,
            stack: error.stack
          })
        } else {
          console.error('Non-Error object caught:', typeof error, error)
        }
        // Don't throw error, just log it and continue
      } finally {
        setCheckingRegistration(false)
      }
    }

    checkExistingRegistration()
  }, [user])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Validate file size
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        setError('File size must be less than 10MB')
        return
      }
      
      // Validate file type - only allow images
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
      if (!allowedTypes.includes(file.type)) {
        setError('Please upload an image file (JPEG, PNG, GIF, or WebP)')
        return
      }
      
      setPaymentFile(file)
      setError('')
    }
  }

  const uploadPaymentScreenshot = async (file: File): Promise<{ url: string; fileName: string } | null> => {
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${user?.id}_${Date.now()}.${fileExt}`
      const filePath = `payment-screenshots/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('registrations')
        .upload(filePath, file)

      if (uploadError) {
        console.error('Upload error:', uploadError)
        return null
      }

      const { data: urlData } = supabase.storage
        .from('registrations')
        .getPublicUrl(filePath)

      return {
        url: urlData.publicUrl,
        fileName: fileName
      }
    } catch (error) {
      console.error('File upload error:', error)
      return null
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      // Validate required fields based on payment tier
      const requiredFields = ['fullName', 'mobileNumber', 'emailAddress', 'fullAddress', 'gender', 'stravaProfileLink', 'whereHeard', 'paymentTier']
      
      if (formData.paymentTier === 'plus' || formData.paymentTier === 'premium') {
        requiredFields.push('deliveryAddress')
      }
      
      if (formData.paymentTier === 'premium') {
        requiredFields.push('tshirtSize')
      }
      
      const missingFields = requiredFields.filter(field => !formData[field as keyof typeof formData])
      
      if (missingFields.length > 0) {
        setError('Please fill in all required fields for your selected package')
        setLoading(false)
        return
      }

      if (!paymentFile) {
        setError('Please upload payment confirmation screenshot')
        setLoading(false)
        return
      }

      // Upload payment screenshot
      const uploadResult = await uploadPaymentScreenshot(paymentFile)
      if (!uploadResult) {
        setError('Failed to upload payment screenshot. Please try again.')
        setLoading(false)
        return
      }

      // Submit registration data using dedicated function
      const { error: insertError } = await supabase.rpc('submit_user_registration', {
        p_full_name: formData.fullName,
        p_mobile_number: formData.mobileNumber,
        p_email_address: '', // Email will be fetched from auth.users in the function
        p_full_address: formData.fullAddress,
        p_gender: formData.gender,
        p_strava_profile_link: formData.stravaProfileLink,
        p_tshirt_size: formData.paymentTier === 'premium' ? formData.tshirtSize : '',
        p_delivery_address: (formData.paymentTier === 'plus' || formData.paymentTier === 'premium') ? formData.deliveryAddress : '',
        p_payment_screenshot_url: uploadResult.url,
        p_payment_screenshot_name: uploadResult.fileName,
        p_where_heard: formData.whereHeard,
        p_payment_tier: formData.paymentTier
      })

      if (insertError) {
        console.error('Registration error:', insertError)
        console.error('Registration error details:', {
          message: insertError.message || 'No message',
          code: insertError.code || 'No code',
          details: insertError.details || 'No details',
          hint: insertError.hint || 'No hint'
        })
        setError(`Failed to submit registration: ${insertError.message || 'Please try again.'}`)
        setLoading(false)
        return
      }

      setSuccess(true)
      
    } catch (error) {
      console.error('Submit error:', error)
      setError('An unexpected error occurred. Please try again.')
      setLoading(false)
    }
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="text-center">
          <p className="text-gray-400 mb-4">Please sign in to register for the challenge</p>
          <Link href="/auth/signin" className="text-white hover:opacity-80 transition-opacity duration-200">
            Sign In
          </Link>
        </div>
      </div>
    )
  }

  if (checkingRegistration) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto"></div>
          <p className="mt-2 text-gray-400">Checking registration status...</p>
        </div>
      </div>
    )
  }

  if (existingRegistration) {
    const getStatusColor = (status: string) => {
      switch (status) {
        case 'approved': return 'text-green-600 dark:text-green-400'
        case 'rejected': return 'text-red-600 dark:text-red-400'
        default: return 'text-yellow-600 dark:text-yellow-400'
      }
    }

    // const getStatusBg = (status: string) => { // Commented out as not used
    //   switch (status) {
    //     case 'approved': return 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
    //     case 'rejected': return 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
    //     default: return 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
    //   }
    // }

    return (
      <div className="min-h-screen bg-black">
        {/* Header */}
        <header className="bg-black text-white p-6">
          <div className="max-w-4xl mx-auto flex justify-between items-center">
            <div>
              <h1 className="text-xl font-bold">Registration Status</h1>
              <p className="text-sm opacity-60">{user?.email}</p>
            </div>
            <div className="flex gap-3">
              {isAdmin(user?.email) && (
                <Link
                  href="/admin"
                  className="px-4 py-2 bg-white text-black hover:opacity-80 font-medium transition-opacity duration-200"
                >
                  Admin Panel
                </Link>
              )}
              <Link 
                href="/"
                className="px-4 py-2 text-white hover:opacity-80 transition-opacity duration-200"
              >
                Back to Dashboard
              </Link>
            </div>
          </div>
        </header>

        {/* Registration Details */}
        <main className="max-w-2xl mx-auto p-6">
          <div className="text-center mb-8">
            <div className="text-gray-400 mb-4">
              <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">
              You have already registered!
            </h2>
            <p className="text-gray-400">
              Your registration for the Shravan Virtual Cycling Challenge has been submitted.
            </p>
          </div>

          <div className="bg-gray-900 p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">Registration Status</h3>
              <span className={`px-3 py-1 text-sm font-medium capitalize ${getStatusColor(existingRegistration.registration_status)}`}>
                {existingRegistration.registration_status}
              </span>
            </div>
            <p className="text-sm text-gray-400">
              Submitted on: {new Date(existingRegistration.created_at).toLocaleDateString('en-IN', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </p>
          </div>

          <div className="bg-gray-900 p-6 space-y-4">
            <h3 className="text-lg font-semibold text-white mb-4">Your Registration Details</h3>
            
            <div className="grid md:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-400">Full Name</p>
                <p className="font-medium text-white">{existingRegistration.full_name}</p>
              </div>
              <div>
                <p className="text-gray-400">Mobile Number</p>
                <p className="font-medium text-white">{existingRegistration.mobile_number}</p>
              </div>
              <div>
                <p className="text-gray-400">Email</p>
                <p className="font-medium text-white">{existingRegistration.email_address}</p>
              </div>
              <div>
                <p className="text-gray-400">Gender</p>
                <p className="font-medium text-white">{existingRegistration.gender}</p>
              </div>
              <div>
                <p className="text-gray-400">T-shirt Size</p>
                <p className="font-medium text-white">{existingRegistration.tshirt_size}</p>
              </div>
              <div>
                <p className="text-gray-400">Where did you hear about us</p>
                <p className="font-medium text-white">{existingRegistration.where_heard}</p>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-gray-400">Full Address</p>
              <p className="font-medium text-white">{existingRegistration.full_address}</p>
            </div>

            <div className="space-y-2">
              <p className="text-gray-400">Delivery Address</p>
              <p className="font-medium text-white">{existingRegistration.delivery_address}</p>
            </div>

            <div className="space-y-2">
              <p className="text-gray-400">Strava Profile</p>
              <a 
                href={existingRegistration.strava_profile_link} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-white hover:opacity-80 underline break-all transition-opacity duration-200"
              >
                {existingRegistration.strava_profile_link}
              </a>
            </div>
          </div>

          <div className="text-center mt-6 space-y-4">
            <p className="text-sm text-gray-400">
              {existingRegistration.registration_status === 'pending' && 
                "We're reviewing your registration. You'll be notified once it's approved."
              }
              {existingRegistration.registration_status === 'approved' && 
                "Congratulations! Your registration has been approved. Get ready for the challenge!"
              }
              {existingRegistration.registration_status === 'rejected' && 
                "Your registration needs attention. Please contact us for more information."
              }
            </p>
            
            <div className="text-xs text-gray-400">
              <p><strong>For any queries:</strong></p>
              <p>WhatsApp: 7397997608</p>
            </div>
          </div>
        </main>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6 bg-primary">
        <div className="card text-center space-y-8 max-w-2xl">
          <div className="text-8xl">🎉</div>
          <div className="space-y-4">
            <h2 className="text-4xl font-bold text-white">
              Registration Successful!
            </h2>
            <p className="text-xl text-gray-300 leading-relaxed">
              Thank you for joining the <span className="text-accent-blue">Shravan Virtual Cycling Challenge</span>. 
              We&apos;ll review your submission and get back to you soon.
            </p>
          </div>
          <div className="space-y-4">
            <Link 
              href="/"
              className="btn btn-primary inline-flex items-center gap-3"
            >
              <span>🏠</span>
              Back to Dashboard
            </Link>
            <p className="text-gray-400 text-sm">
              Check your email for confirmation and updates about the challenge
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-primary">
      {/* Header */}
      <header className="text-white py-4 px-6 bg-secondary">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div className="space-y-1">
            <h1 className="text-xl font-bold">Challenge Registration</h1>
            <p className="text-gray-400 font-medium">{user?.email}</p>
          </div>
          <div className="flex gap-3">
            {isAdmin(user?.email) && (
              <Link
                href="/admin"
                className="btn btn-accent"
              >
                Admin Panel
              </Link>
            )}
            <Link 
              href="/"
              className="btn btn-secondary"
            >
              Back to Dashboard
            </Link>
          </div>
        </div>
      </header>

      {/* Form */}
      <main className="max-w-4xl mx-auto p-6">
        <div className="card">
          <div className="text-center space-y-4 mb-10">
            <h2 className="text-4xl font-bold text-white">
              Join the <span className="text-accent-blue">Shravan Challenge</span>
            </h2>
            <p className="text-xl text-gray-300 max-w-2xl mx-auto">
              Complete your registration to participate in the ultimate virtual cycling experience
            </p>
          </div>
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Payment Tier Selection */}
          <div className="space-y-6">
            <h3 className="text-2xl font-semibold text-white flex items-center gap-3">
              <span className="text-accent-blue">💰</span>
              Select Your Package
            </h3>
            
            <div className="grid md:grid-cols-3 gap-4 sm:gap-6">
              <label className="cursor-pointer transform transition-transform hover:scale-105">
                <input
                  type="radio"
                  name="paymentTier"
                  value="basic"
                  checked={formData.paymentTier === 'basic'}
                  onChange={handleInputChange}
                  className="sr-only"
                />
                <div className={`p-4 sm:p-6 rounded-lg border-2 transition-all ${
                  formData.paymentTier === 'basic' 
                    ? 'border-accent-green bg-green-900/20 shadow-lg' 
                    : 'border-gray-600 bg-elevated hover:border-gray-500'
                }`}>
                  <div className="text-center">
                    <p className="text-lg font-semibold text-white">Basic</p>
                    <p className="text-2xl sm:text-3xl font-bold text-accent-green">₹199</p>
                    <p className="text-sm text-gray-400">Registration only</p>
                    <ul className="text-xs text-gray-500 mt-3 space-y-1">
                      <li>• E-Certificate</li>
                      <li>• Challenge participation</li>
                    </ul>
                  </div>
                </div>
              </label>

              <label className="cursor-pointer transform transition-transform hover:scale-105">
                <input
                  type="radio"
                  name="paymentTier"
                  value="plus"
                  checked={formData.paymentTier === 'plus'}
                  onChange={handleInputChange}
                  className="sr-only"
                />
                <div className={`p-4 sm:p-6 rounded-lg border-2 transition-all ${
                  formData.paymentTier === 'plus' 
                    ? 'border-accent-orange bg-orange-900/20 shadow-lg' 
                    : 'border-gray-600 bg-elevated hover:border-gray-500'
                }`}>
                  <div className="text-center">
                    <p className="text-lg font-semibold text-white">Plus</p>
                    <p className="text-2xl sm:text-3xl font-bold text-accent-orange">₹399</p>
                    <p className="text-sm text-gray-400">Registration + Medal</p>
                    <ul className="text-xs text-gray-500 mt-3 space-y-1">
                      <li>• E-Certificate</li>
                      <li>• Physical Medal</li>
                    </ul>
                  </div>
                </div>
              </label>

              <label className="cursor-pointer transform transition-transform hover:scale-105">
                <input
                  type="radio"
                  name="paymentTier"
                  value="premium"
                  checked={formData.paymentTier === 'premium'}
                  onChange={handleInputChange}
                  className="sr-only"
                />
                <div className={`relative p-4 sm:p-6 rounded-lg border-2 transition-all ${
                  formData.paymentTier === 'premium' 
                    ? 'border-accent-blue bg-blue-900/20 shadow-lg' 
                    : 'border-gray-600 bg-elevated hover:border-gray-500'
                }`}>
                  <div className="absolute -top-2 -right-2 bg-accent-blue text-white text-xs px-2 py-1 rounded-full">Popular</div>
                  <div className="text-center">
                    <p className="text-lg font-semibold text-white">Premium</p>
                    <p className="text-2xl sm:text-3xl font-bold text-accent-blue">₹799</p>
                    <p className="text-sm text-gray-400">Complete Package</p>
                    <ul className="text-xs text-gray-500 mt-3 space-y-1">
                      <li>• E-Certificate</li>
                      <li>• Physical Medal</li>
                      <li>• Dry Fit T-Shirt</li>
                    </ul>
                  </div>
                </div>
              </label>
            </div>

            {!formData.paymentTier && (
              <div className="text-center p-4 bg-yellow-900/20 rounded-lg">
                <p className="text-yellow-400 font-medium">Please select a package to continue</p>
              </div>
            )}
          </div>

          {/* Personal Information Section */}
          <div className="space-y-6">
            <h3 className="text-2xl font-semibold text-white flex items-center gap-3">
              <span className="text-accent-orange">👤</span>
              Personal Information
            </h3>
            
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="fullName" className="block text-sm font-semibold text-white mb-3">
                  Full Name *
                </label>
                <input
                  type="text"
                  id="fullName"
                  name="fullName"
                  required
                  value={formData.fullName}
                  onChange={handleInputChange}
                  className="form-field w-full"
                  placeholder="Enter your full name"
                />
              </div>

              <div>
                <label htmlFor="mobileNumber" className="block text-sm font-semibold text-white mb-3">
                  Mobile Number *
                </label>
                <input
                  type="tel"
                  id="mobileNumber"
                  name="mobileNumber"
                  required
                  value={formData.mobileNumber}
                  onChange={handleInputChange}
                  className="form-field w-full"
                  placeholder="Enter your mobile number"
                />
              </div>
            </div>

                          <div>
                <label htmlFor="emailAddress" className="block text-sm font-semibold text-white mb-3">
                  Email Address *
                </label>
                <input
                  type="email"
                  id="emailAddress"
                  name="emailAddress"
                  required
                  value={formData.emailAddress}
                  onChange={handleInputChange}
                  className="form-field w-full bg-gray-700 text-gray-400 cursor-not-allowed"
                  placeholder="Enter your email address"
                  disabled={true}
                  title="Email is automatically set from your account"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Email is locked and automatically set from your authenticated account
                </p>
              </div>
          </div>

          {/* Address Information Section */}
          <div className="space-y-6">
            <h3 className="text-2xl font-semibold text-white flex items-center gap-3">
              <span className="text-accent-green">📍</span>
              Address Information
            </h3>

            <div>
              <label htmlFor="fullAddress" className="block text-sm font-semibold text-white mb-3">
                Full Address *
              </label>
              <textarea
                id="fullAddress"
                name="fullAddress"
                required
                rows={3}
                value={formData.fullAddress}
                onChange={handleInputChange}
                className="form-field w-full"
                placeholder="Enter your complete address"
              />
            </div>

            {(formData.paymentTier === 'plus' || formData.paymentTier === 'premium') && (
              <div>
                <label htmlFor="deliveryAddress" className="block text-sm font-semibold text-white mb-3">
                  Delivery Address (for {formData.paymentTier === 'plus' ? 'medal' : 'medal & t-shirt'}) *
                </label>
                <textarea
                  id="deliveryAddress"
                  name="deliveryAddress"
                  required
                  rows={3}
                  value={formData.deliveryAddress}
                  onChange={handleInputChange}
                  className="form-field w-full"
                  placeholder="Enter delivery address for physical rewards"
                />
                <p className="text-sm text-gray-400 mt-2">
                  📦 Your {formData.paymentTier === 'plus' ? 'medal' : 'medal and t-shirt'} will be delivered to this address
                </p>
              </div>
            )}
          </div>

          {/* Challenge Details Section */}
          <div className="space-y-6">
            <h3 className="text-2xl font-semibold text-white flex items-center gap-3">
              <span className="text-accent-blue">🚴‍♂️</span>
              Challenge Details
            </h3>

            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="gender" className="block text-sm font-semibold text-white mb-3">
                  Gender *
                </label>
                <select
                  id="gender"
                  name="gender"
                  required
                  value={formData.gender}
                  onChange={handleInputChange}
                  className="form-field w-full"
                >
                  <option value="">Select Gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              {formData.paymentTier === 'premium' && (
                <div>
                  <label htmlFor="tshirtSize" className="block text-sm font-semibold text-white mb-3">
                    T-shirt Size (Dry fit) *
                  </label>
                  <select
                    id="tshirtSize"
                    name="tshirtSize"
                    required
                    value={formData.tshirtSize}
                    onChange={handleInputChange}
                    className="form-field w-full"
                  >
                    <option value="">Select Size</option>
                    <option value="S">S (36&quot;)</option>
                    <option value="M">M (38&quot;)</option>
                    <option value="L">L (40&quot;)</option>
                    <option value="XL">XL (42&quot;)</option>
                    <option value="XXL">XXL (44&quot;)</option>
                  </select>
                  <p className="text-sm text-gray-400 mt-2">
                    👕 Premium dry-fit t-shirt included in your package
                  </p>
                </div>
              )}
            </div>

            <div>
              <label htmlFor="stravaProfileLink" className="block text-sm font-semibold text-white mb-3">
                Strava Profile Link *
              </label>
              <input
                type="url"
                id="stravaProfileLink"
                name="stravaProfileLink"
                required
                value={formData.stravaProfileLink}
                onChange={handleInputChange}
                placeholder="https://www.strava.com/athletes/..."
                className="form-field w-full"
              />
              <p className="text-sm text-gray-400 mt-2">
                We need your Strava profile to track your cycling progress
              </p>
            </div>
          </div>

        {/* Payment & Additional Info Section */}
        <div className="space-y-6">
          <h3 className="text-2xl font-semibold text-white flex items-center gap-3">
            <span className="text-accent-orange">💳</span>
            Payment & Additional Information
          </h3>

          {formData.paymentTier && (
            <div className="p-4 sm:p-6 bg-elevated rounded-lg">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                <p className="text-white font-semibold">Selected Package:</p>
                <span className={`px-4 py-2 rounded-lg text-sm font-semibold capitalize text-center ${
                  formData.paymentTier === 'basic' ? 'bg-green-600 text-white' :
                  formData.paymentTier === 'plus' ? 'bg-orange-600 text-white' :
                  'bg-blue-600 text-white'
                }`}>
                  {formData.paymentTier} - {
                    formData.paymentTier === 'basic' ? '₹199' :
                    formData.paymentTier === 'plus' ? '₹399' :
                    '₹799'
                  }
                </span>
              </div>
              <div className="space-y-2">
                <p className="text-gray-400 text-sm">
                  💳 Pay {
                    formData.paymentTier === 'basic' ? '₹199' :
                    formData.paymentTier === 'plus' ? '₹399' :
                    '₹799'
                  } using UPI
                </p>
                <div className="bg-primary p-3 rounded-lg">
                  <p className="font-mono text-accent-blue text-center text-lg">8999169699@ybl</p>
                </div>
                <p className="text-gray-500 text-xs text-center">Compatible with all UPI apps (PhonePe, GPay, Paytm, etc.)</p>
              </div>
            </div>
          )}

          <div>
            <label htmlFor="paymentFile" className="block text-sm font-semibold text-white mb-3">
              Payment Confirmation Screenshot *
            </label>
            <div className="space-y-3">
              <input
                type="file"
                id="paymentFile"
                accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                required
                onChange={handleFileChange}
                className="form-field w-full file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:text-white hover:file:bg-gray-600 transition-all"
              />
              <div className="text-sm text-gray-400 space-y-1">
                <p>• Upload payment screenshot after completing payment</p>
                <p>• Supported formats: JPEG, PNG, GIF, WebP only</p>
                <p>• Maximum file size: 10 MB</p>
              </div>
              {paymentFile && (
                <div className="text-sm font-medium text-accent-green">
                  ✓ File selected: {paymentFile.name}
                </div>
              )}
            </div>
          </div>

          <div>
            <label htmlFor="whereHeard" className="block text-sm font-semibold text-white mb-3">
              Where did you hear about this challenge? *
            </label>
            <select
              id="whereHeard"
              name="whereHeard"
              required
              value={formData.whereHeard}
              onChange={handleInputChange}
              className="form-field w-full"
            >
              <option value="">Select how you discovered us</option>
              <option value="Instagram">Instagram</option>
              <option value="Facebook">Facebook</option>
              <option value="WhatsApp">WhatsApp Group</option>
              <option value="Previous Participants">Previous Participants</option>
              <option value="Cycling Group">Local Cycling Group</option>
              <option value="Friends">Friends & Family</option>
              <option value="Other">Other</option>
            </select>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="p-4 rounded-lg text-center bg-red-900/20 text-accent-orange">
            {error}
          </div>
        )}

        {/* Submit Button */}
        <div className="pt-6 text-center">
          <button
            type="submit"
            disabled={loading}
            className="btn btn-accent text-xl px-16 py-4 inline-flex items-center gap-3"
          >
            {loading ? (
              <>
                <div className="loading-spinner w-5 h-5"></div>
                Submitting Registration...
              </>
            ) : (
              <>
                <span>🚀</span>
                Submit Registration
              </>
            )}
          </button>
          <p className="mt-4 text-gray-400 text-sm">
            By submitting, you agree to participate in the Shravan Virtual Cycling Challenge
          </p>
        </div>
      </form>
      </div>
      </main>
    </div>
  )
}