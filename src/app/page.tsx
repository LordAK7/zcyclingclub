'use client'

import Link from 'next/link'
import { useAuth } from '@/context/AuthContext'
import { isAdmin } from '@/lib/admin'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import Image from 'next/image'

function PaymentDetails() {
  const [showQR, setShowQR] = useState(false)

  return (
    <div className="text-center pt-6 border-t border-gray-700">
      <div className="space-y-4">
        <div>
          <p className="text-white font-semibold mb-3">💳 Payment Methods</p>
          <p className="text-gray-300 text-sm mb-4">Pay securely using UPI (Unified Payments Interface)</p>
        </div>
        
        <div className="space-y-3">
          <div className="inline-block px-6 py-3 rounded-lg font-mono text-lg bg-elevated text-accent-blue">
            8999169699@ybl
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
            <button
              onClick={() => setShowQR(!showQR)}
              className="btn btn-secondary inline-flex items-center gap-2"
            >
              <span>📱</span>
              {showQR ? 'Hide QR Code' : 'Show QR Code'}
            </button>
            <p className="text-gray-400 text-sm">or scan QR to pay instantly</p>
          </div>
        </div>

        {showQR && (
          <div className="mt-6 p-4 sm:p-6 bg-elevated rounded-lg inline-block w-full max-w-sm mx-auto">
            <div className="space-y-4">
              <p className="text-white font-medium text-center">Scan with any UPI app</p>
              <div className="bg-white p-4 rounded-lg">
                <Image
                  src="/qr.jpg"
                  alt="UPI Payment QR Code"
                  width={200}
                  height={200}
                  className="mx-auto rounded w-full max-w-[200px] h-auto"
                  priority
                />
              </div>
              <div className="text-center space-y-2">
                <p className="text-gray-400 text-xs">
                  Compatible with PhonePe, Paytm, GPay, and all UPI apps
                </p>
                <p className="text-accent-green text-sm font-medium">
                  📲 Point your camera at the QR code to pay instantly
                </p>
              </div>
            </div>
          </div>
        )}
        
        <div className="text-center pt-2">
          <p className="text-gray-400 text-sm">
            💡 After payment, upload screenshot in registration form
          </p>
        </div>
      </div>
    </div>
  )
}

function LoadingSpinner() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-primary">
      <div className="text-center space-y-6">
        <div className="loading-spinner mx-auto"></div>
        <div className="space-y-2">
          <p className="text-lg font-semibold text-white">Loading...</p>
          <p className="text-sm text-gray-400">Preparing your cycling experience</p>
        </div>
      </div>
    </div>
  )
}

function SignInPrompt() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-primary">
      <div className="text-center space-y-10 px-6 max-w-2xl">
        <div className="space-y-4">
          <h1 className="text-6xl font-bold text-white leading-tight">
            Someshwar Cycling Club
          </h1>
          <p className="text-xl text-gray-300 font-medium max-w-md mx-auto">
            Join cyclists from across the country in the ultimate virtual challenge
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Link 
            href="/auth/signin"
            className="btn btn-primary min-w-[140px]"
          >
            Sign In
          </Link>
          <Link 
            href="/auth/signup"
            className="btn btn-secondary min-w-[140px]"
          >
            Sign Up
          </Link>
        </div>
        <div className="pt-8 text-sm text-gray-400">
          <p>Ready to pedal towards fitness and community?</p>
        </div>
      </div>
    </div>
  )
}

function Dashboard() {
  const { user, signOut } = useAuth()
  const [userProfile, setUserProfile] = useState<{ full_name?: string } | null>(null)

  const handleSignOut = async () => {
    await signOut()
  }

  // Get user's profile name if they have registered
  useEffect(() => {
    const getUserProfile = async () => {
      if (!user) return
      
      try {
        const { data } = await supabase.rpc('check_user_registration')
        if (data && data.length > 0) {
          setUserProfile(data[0])
        }
      } catch {
        // Silent error handling
      }
    }

    getUserProfile()
  }, [user])

  return (
    <div className="min-h-screen bg-primary">
      {/* Header */}
      <header className="text-white py-4 px-6 bg-secondary">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div className="space-y-1">
            <p className="text-sm text-gray-400 font-medium">Welcome back</p>
            <p className="font-semibold text-lg text-white">
              {userProfile?.full_name || user?.email}
            </p>
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
            <button
              onClick={handleSignOut}
              className="btn btn-secondary"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto p-6 space-y-10">
        <div className="text-center space-y-6 py-8">
          <h1 className="text-5xl font-bold text-white leading-tight">
            Shravan Virtual<br/>
            <span className="text-accent-blue">Cycling Challenge</span>
          </h1>
          <p className="text-xl text-gray-300 font-medium max-w-2xl mx-auto">
            Presented by Someshwar Cycling Club, Baramati, Pune
          </p>
        </div>

        <div className="card">
          <h2 className="text-3xl font-bold text-white mb-6">
            Welcome to the Challenge! 🚴‍♂️
          </h2>
          <p className="text-gray-300 text-lg leading-relaxed">
            Join cyclists from across the country this Shravan month and ride towards fitness and fun.
            The Shravan Cycling Challenge is a fitness and spiritual event focused on cycling during the auspicious month of Shravan, often associated with Lord Shiva and religious observances. It combines physical activity with the cultural and spiritual significance of Shravan, encouraging participants to cycle for fitness while connecting with the month&apos;s traditions.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          <div className="card">
            <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
              <span className="text-accent-orange">📅</span>
              Challenge Details
            </h3>
            <div className="space-y-4 text-gray-300">
              <div className="flex items-start gap-3">
                <span className="font-semibold text-white min-w-[140px]">Challenge Dates:</span>
                <span>15/8/2025 to 4/9/2025</span>
              </div>
              <div className="flex items-start gap-3">
                <span className="font-semibold text-white min-w-[140px]">Challenge:</span>
                <span>Ride 525 km in 21 Days</span>
              </div>
              <div className="flex items-start gap-3">
                <span className="font-semibold text-white min-w-[140px]">Rewards:</span>
                <span>Complete the rides and earn a medal, certificate, and Dry fit T shirt. Special trophies for the top male and female riders.</span>
              </div>
            </div>
          </div>

          <div className="card">
            <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
              <span className="text-accent-green">📋</span>
              Registration Info
            </h3>
            <div className="space-y-4 text-gray-300">
              <div className="flex items-start gap-3">
                <span className="font-semibold text-white min-w-[120px]">Start Date:</span>
                <span>1/8/2025</span>
              </div>
              <div className="flex items-start gap-3">
                <span className="font-semibold text-white min-w-[120px]">End Date:</span>
                <span>20/8/2025</span>
              </div>
              <div className="flex items-start gap-3">
                <span className="font-semibold text-white min-w-[120px]">Certificate:</span>
                <span>All participating riders will receive an E Certificate</span>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
            <span className="text-accent-blue">💰</span>
            Registration Fees
          </h3>
          <div className="space-y-6">
            <div className="grid sm:grid-cols-3 gap-4">
              <div className="text-center p-4 rounded-lg bg-elevated hover:bg-gray-800 transition-colors">
                <p className="text-lg font-semibold text-white">Basic</p>
                <p className="text-2xl font-bold text-accent-green">₹199</p>
                <p className="text-sm text-gray-400">Registration only</p>
                <ul className="text-xs text-gray-500 mt-2 space-y-1">
                  <li>• E-Certificate</li>
                  <li>• Challenge participation</li>
                </ul>
              </div>
              <div className="text-center p-4 rounded-lg bg-elevated hover:bg-gray-800 transition-colors">
                <p className="text-lg font-semibold text-white">Plus</p>
                <p className="text-2xl font-bold text-accent-orange">₹399</p>
                <p className="text-sm text-gray-400">Registration + Medal</p>
                <ul className="text-xs text-gray-500 mt-2 space-y-1">
                                        <li>• E-Certificate</li>
                      <li>• Physical Medal</li>
                </ul>
              </div>
              <div className="relative text-center p-4 rounded-lg bg-elevated hover:bg-gray-800 transition-colors border-2 border-accent-blue">
                <div className="absolute -top-2 -right-2 bg-accent-blue text-white text-xs px-2 py-1 rounded-full">Popular</div>
                <p className="text-lg font-semibold text-white">Premium</p>
                <p className="text-2xl font-bold text-accent-blue">₹799</p>
                <p className="text-sm text-gray-400">Complete Package</p>
                <ul className="text-xs text-gray-500 mt-2 space-y-1">
                                        <li>• E-Certificate</li>
                      <li>• Physical Medal</li>
                      <li>• Dry Fit T-Shirt</li>
                </ul>
              </div>
            </div>
            <PaymentDetails />
          </div>
        </div>

        <div className="card">
          <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
            <span className="text-accent-orange">📋</span>
            Terms and Conditions
          </h3>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <span className="text-accent-blue mt-1">•</span>
                <span className="text-gray-300">This entire challenge should be undertaken by riders at their own risk.</span>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-accent-blue mt-1">•</span>
                <span className="text-gray-300">Fake and electric bicycle rides will not be accepted.</span>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-accent-blue mt-1">•</span>
                <span className="text-gray-300">No maximum km limit for cycling per day, only one ride per day will be accepted.</span>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <span className="text-accent-blue mt-1">•</span>
                <span className="text-gray-300">All cycling rules should be followed while riding.</span>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-accent-blue mt-1">•</span>
                <span className="text-gray-300">While saving the ride on Strava, mention &quot;SCC- SHRAVAN CHALLENGE DAY -1&quot;.</span>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-accent-blue mt-1">•</span>
                <span className="text-gray-300">Join Someshwar Cycle Club on Strava and share your daily ride activity.</span>
              </div>
            </div>
          </div>
        </div>

        <div className="text-center space-y-8">
          {/* Call to Action */}
          <div className="space-y-6">
            <Link 
              href="/register"
              className="btn btn-accent text-xl px-12 py-4 inline-flex items-center gap-3"
            >
              <span>🚴‍♂️</span>
              Register Now!
            </Link>
            <p className="text-gray-400">Ready to join the challenge? Let&apos;s ride together!</p>
          </div>

          {/* Community & Support */}
          <div className="grid md:grid-cols-2 gap-6">
            <div className="card text-center">
              <h4 className="text-xl font-bold text-white mb-4">Join Our Community</h4>
              <a 
                href="https://chat.whatsapp.com/Bg0W3eVaqfk4hiaqTO83FQ?mode=ac_t"
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-secondary inline-flex items-center gap-3"
              >
                <span className="text-accent-green">💬</span>
                WhatsApp Group
              </a>
            </div>

            <div className="card text-center">
              <h4 className="text-xl font-bold text-white mb-4">Need Help?</h4>
              <div className="space-y-2">
                <p className="text-gray-300">Contact us for any queries</p>
                <div className="inline-block px-4 py-2 rounded-lg font-mono bg-elevated text-accent-green">
                  7397997608
                </div>
              </div>
            </div>
          </div>

          {/* Thank You Message */}
          <div className="card">
            <div className="text-center space-y-4">
              <h4 className="text-2xl font-bold text-white">Thank You for Joining! 🎉</h4>
              <p className="text-gray-300 text-lg">
                Keep pedaling strong and share your journey using <span className="text-accent-blue">#ShravanChallenge</span> <span className="text-accent-orange">#SomeshwarCyclingClub</span>
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

export default function Home() {
  const { user, loading } = useAuth()

  if (loading) {
    return <LoadingSpinner />
  }

  if (!user) {
    return <SignInPrompt />
  }

  return <Dashboard />
}
