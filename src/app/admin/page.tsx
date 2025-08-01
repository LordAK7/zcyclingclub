'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'
import { isAdmin } from '@/lib/admin'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface Registration {
  id: string
  user_id: string
  full_name: string
  mobile_number: string
  email_address: string
  full_address: string
  gender: string
  strava_profile_link: string
  tshirt_size: string
  delivery_address: string
  payment_screenshot_url: string
  payment_screenshot_name: string
  where_heard: string
  payment_tier: string
  registration_status: 'pending' | 'approved' | 'rejected'
  created_at: string
  updated_at: string
}

export default function AdminPanel() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [registrations, setRegistrations] = useState<Registration[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [updatingIds, setUpdatingIds] = useState<Set<string>>(new Set())

  // Check if user is admin and redirect if not
  useEffect(() => {
    if (!authLoading && (!user || !isAdmin(user.email))) {
      router.push('/')
    }
  }, [user, authLoading, router])

  // Fetch all registrations
  useEffect(() => {
    const fetchRegistrations = async () => {
      if (!user || !isAdmin(user.email)) return

      try {
        // Use raw SQL query for admin to bypass RLS restrictions
        const { data, error } = await supabase.rpc('get_all_registrations_admin')

        if (error) {
          console.error('Error fetching registrations:', error)
          setError(`Failed to load registrations: ${error.message || JSON.stringify(error)}`)
        } else {
          setRegistrations(data || [])
        }
      } catch (error) {
        console.error('Error fetching registrations:', error)
        setError(`Failed to load registrations: ${error instanceof Error ? error.message : 'Unknown error'}`)
      } finally {
        setLoading(false)
      }
    }

    fetchRegistrations()
  }, [user])

  const updateRegistrationStatus = async (id: string, status: 'approved' | 'rejected') => {
    if (!isAdmin(user?.email)) return

    setUpdatingIds(prev => new Set([...prev, id]))
    
    try {
      const { error } = await supabase.rpc('update_registration_status_admin', {
        registration_id: id,
        new_status: status
      })

      if (error) {
        console.error('Error updating registration:', error)
        setError(`Failed to update registration status: ${error.message || JSON.stringify(error)}`)
      } else {
        // Update local state
        setRegistrations(prev => 
          prev.map(reg => 
            reg.id === id 
              ? { ...reg, registration_status: status }
              : reg
          )
        )
        setError('') // Clear any previous errors
      }
    } catch (error) {
      console.error('Error updating registration:', error)
      setError(`Failed to update registration status: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setUpdatingIds(prev => {
        const newSet = new Set(prev)
        newSet.delete(id)
        return newSet
      })
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'text-accent-green bg-green-900/20'
      case 'rejected': return 'text-accent-orange bg-red-900/20'
      default: return 'text-yellow-400 bg-yellow-900/20'
    }
  }

  const getStatsCount = (status: string) => {
    return registrations.filter(reg => reg.registration_status === status).length
  }

  if (authLoading || !user || !isAdmin(user.email)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-primary">
        <div className="text-center space-y-6">
          <div className="loading-spinner mx-auto"></div>
          <div className="space-y-2">
            <p className="text-lg font-semibold text-white">Loading...</p>
            <p className="text-sm text-gray-400">Verifying admin access</p>
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
            <h1 className="text-2xl font-bold flex items-center gap-3">
              <span className="text-accent-blue">⚙️</span>
              Admin Panel
            </h1>
            <p className="text-gray-400 font-medium">Shravan Challenge Registrations</p>
          </div>
          <Link 
            href="/"
            className="btn btn-secondary"
          >
            Back to Dashboard
          </Link>
        </div>
      </header>

      {/* Stats */}
      <div className="max-w-6xl mx-auto p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
          <div className="card text-center">
            <div className="text-3xl font-bold text-white mb-2">{registrations.length}</div>
            <div className="text-sm text-gray-400 font-medium">Total Registrations</div>
          </div>
          <div className="card text-center">
            <div className="text-3xl font-bold text-yellow-400 mb-2">{getStatsCount('pending')}</div>
            <div className="text-sm text-gray-400 font-medium">Pending Review</div>
          </div>
          <div className="card text-center">
            <div className="text-3xl font-bold text-accent-green mb-2">{getStatsCount('approved')}</div>
            <div className="text-sm text-gray-400 font-medium">Approved</div>
          </div>
          <div className="card text-center">
            <div className="text-3xl font-bold text-accent-orange mb-2">{getStatsCount('rejected')}</div>
            <div className="text-sm text-gray-400 font-medium">Rejected</div>
          </div>
        </div>

        {error && (
          <div className="card mb-6 bg-red-900/20">
            <p className="text-accent-orange font-medium">{error}</p>
          </div>
        )}

        {loading ? (
          <div className="text-center py-12">
            <div className="loading-spinner mx-auto mb-4"></div>
            <p className="text-gray-400 text-lg">Loading registrations...</p>
          </div>
        ) : registrations.length === 0 ? (
          <div className="card text-center py-12">
            <div className="text-6xl mb-4">📋</div>
            <h3 className="text-xl font-bold text-white mb-2">No Registrations Yet</h3>
            <p className="text-gray-400">Registration data will appear here once users start signing up.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {registrations.map((registration) => (
              <div 
                key={registration.id} 
                className="card"
              >
                <div className="flex justify-between items-start mb-6">
                  <div className="space-y-2">
                    <h3 className="text-2xl font-bold text-white">
                      {registration.full_name}
                    </h3>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                      <p className="text-sm text-gray-400 font-medium">
                        Submitted: {new Date(registration.created_at).toLocaleDateString('en-IN', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                      {registration.payment_tier && (
                        <span className={`px-2 py-1 rounded text-xs font-semibold capitalize ${
                          registration.payment_tier === 'basic' ? 'bg-green-600 text-white' :
                          registration.payment_tier === 'plus' ? 'bg-orange-600 text-white' :
                          'bg-blue-600 text-white'
                        }`}>
                          {registration.payment_tier} - {
                            registration.payment_tier === 'basic' ? '₹199' :
                            registration.payment_tier === 'plus' ? '₹399' :
                            '₹799'
                          }
                        </span>
                      )}
                    </div>
                  </div>
                  <span className={`px-4 py-2 rounded-lg text-sm font-semibold capitalize ${getStatusColor(registration.registration_status)}`}>
                    {registration.registration_status}
                  </span>
                </div>

                <div className="grid md:grid-cols-3 gap-6 text-sm mb-6">
                  <div className="space-y-1">
                    <p className="text-gray-400 font-medium">Email</p>
                    <p className="font-semibold text-white">{registration.email_address}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-gray-400 font-medium">Mobile</p>
                    <p className="font-semibold text-white">{registration.mobile_number}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-gray-400 font-medium">Gender</p>
                    <p className="font-semibold text-white">{registration.gender}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-gray-400 font-medium">T-shirt Size</p>
                    <p className="font-semibold text-white">{registration.tshirt_size || 'Not applicable'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-gray-400 font-medium">Source</p>
                    <p className="font-semibold text-white">{registration.where_heard}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-gray-400 font-medium">Strava Profile</p>
                    <a 
                      href={registration.strava_profile_link} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-accent-blue hover:underline transition-all inline-flex items-center gap-2"
                    >
                      <span>🔗</span>
                      View Profile
                    </a>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6 text-sm mb-6">
                  <div className="space-y-1">
                    <p className="text-gray-400 font-medium">Full Address</p>
                    <p className="font-semibold text-white leading-relaxed">{registration.full_address}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-gray-400 font-medium">Delivery Address</p>
                    <p className="font-semibold text-white leading-relaxed">
                      {registration.delivery_address || 'Not required for this package'}
                    </p>
                  </div>
                </div>

                {registration.payment_screenshot_url && (
                  <div className="mb-6 p-4 bg-elevated rounded-lg">
                    <p className="text-gray-400 font-medium mb-3">Payment Screenshot</p>
                    <a 
                      href={registration.payment_screenshot_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="btn btn-secondary inline-flex items-center gap-2"
                    >
                      <span>🖼️</span>
                      View Payment Screenshot
                    </a>
                  </div>
                )}

                {registration.registration_status === 'pending' && (
                  <div className="flex gap-4 pt-6 border-t border-gray-700">
                    <button
                      onClick={() => updateRegistrationStatus(registration.id, 'approved')}
                      disabled={updatingIds.has(registration.id)}
                      className="btn bg-green-600 hover:bg-green-700 text-white font-semibold disabled:opacity-50 inline-flex items-center gap-2"
                    >
                      {updatingIds.has(registration.id) ? (
                        <>
                          <div className="loading-spinner w-4 h-4"></div>
                          Updating...
                        </>
                      ) : (
                        <>
                          <span>✅</span>
                          Approve
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => updateRegistrationStatus(registration.id, 'rejected')}
                      disabled={updatingIds.has(registration.id)}
                      className="btn bg-red-600 hover:bg-red-700 text-white font-semibold disabled:opacity-50 inline-flex items-center gap-2"
                    >
                      {updatingIds.has(registration.id) ? (
                        <>
                          <div className="loading-spinner w-4 h-4"></div>
                          Updating...
                        </>
                      ) : (
                        <>
                          <span>❌</span>
                          Reject
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}