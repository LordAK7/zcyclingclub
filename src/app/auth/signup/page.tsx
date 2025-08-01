'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function SignUp() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const router = useRouter()

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setMessage('')

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      setLoading(false)
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long')
      setLoading(false)
      return
    }

    const { error } = await supabase.auth.signUp({
      email,
      password,
    })

    if (error) {
      setError(error.message)
    } else {
      setMessage('Check your email for the confirmation link!')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6 bg-primary">
      <div className="max-w-md w-full">
        <div className="card">
          <div className="text-center space-y-4 mb-8">
            <h2 className="text-4xl font-bold text-white">
              Join the Club
            </h2>
            <p className="text-gray-400 text-lg">
              Create your Someshwar Cycling Club account
            </p>
          </div>

          <form className="space-y-6" onSubmit={handleSignUp}>
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
                  autoComplete="new-password"
                  required
                  className="form-field w-full"
                  placeholder="Create a strong password (min. 6 characters)"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-semibold text-white mb-3">
                  Confirm Password
                </label>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  required
                  className="form-field w-full"
                  placeholder="Confirm your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
            </div>

            {error && (
              <div className="p-4 rounded-lg text-center bg-red-900/20 text-accent-orange">
                {error}
              </div>
            )}

            {message && (
              <div className="p-4 rounded-lg text-center bg-green-900/20 text-accent-green">
                {message}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn btn-accent w-full text-lg"
            >
              {loading ? (
                <div className="flex items-center justify-center gap-3">
                  <div className="loading-spinner w-5 h-5"></div>
                  Creating account...
                </div>
              ) : (
                'Create Account'
              )}
            </button>

            <div className="text-center pt-4 border-t border-gray-700">
              <p className="text-gray-400">
                Already have an account?{' '}
                <Link href="/auth/signin" className="font-semibold hover:underline text-accent-blue">
                  Sign in
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