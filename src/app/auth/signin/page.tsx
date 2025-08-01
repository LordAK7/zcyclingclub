'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function SignIn() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setError(error.message)
    } else {
      router.push('/')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6 bg-primary">
      <div className="max-w-md w-full">
        <div className="card">
          <div className="text-center space-y-4 mb-8">
            <h2 className="text-4xl font-bold text-white">
              Welcome Back
            </h2>
            <p className="text-gray-400 text-lg">
              Sign in to your Someshwar Cycling Club account
            </p>
          </div>

          <form className="space-y-6" onSubmit={handleSignIn}>
            <div className="space-y-5">
              <div>
                <label htmlFor="email" className="block text-sm font-semibold text-white mb-3">
                  Email Address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="form-field w-full"
                  placeholder="Enter your email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="password" className="block text-sm font-semibold text-white mb-3">
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  className="form-field w-full"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            {error && (
              <div className="p-4 rounded-lg text-center bg-red-900/20 text-accent-orange">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary w-full text-lg"
            >
              {loading ? (
                <div className="flex items-center justify-center gap-3">
                  <div className="loading-spinner w-5 h-5"></div>
                  Signing in...
                </div>
              ) : (
                'Sign In'
              )}
            </button>

            <div className="text-center pt-4 border-t border-gray-700">
              <p className="text-gray-400">
                Don't have an account?{' '}
                <Link href="/auth/signup" className="font-semibold hover:underline text-accent-blue">
                  Sign up
                </Link>
              </p>
            </div>

            <div className="text-center">
              <Link href="/" className="text-gray-400 hover:text-white inline-flex items-center gap-2 transition-colors">
                <span>←</span>
                Back to home
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}