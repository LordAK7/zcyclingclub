'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/context/AuthContext'
import { supabase } from '@/lib/supabase'
import { isAdmin } from '@/lib/admin'
import { config } from '@/lib/config'
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
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [paymentTierFilter, setPaymentTierFilter] = useState<string>('all')

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
          const registrationData = (data || []) as Registration[]
          setRegistrations(registrationData)
          
          // Debug logging to understand the data structure
          if (process.env.NODE_ENV === 'development' && registrationData.length > 0) {
            console.log('Sample registration data:', registrationData[0])
            console.log('Payment tiers found:', [...new Set(registrationData.map((r: Registration) => r.payment_tier))])
            console.log('Registration statuses found:', [...new Set(registrationData.map((r: Registration) => r.registration_status))])
          }
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

  const getTotalRevenue = () => {
    return registrations
      .filter(reg => reg.registration_status === 'approved')
      .reduce((total, reg) => {
        const amount = reg.payment_tier === 'basic' ? config.pricing.basic.amount : 
                     reg.payment_tier === 'plus' ? config.pricing.plus.amount : 
                     config.pricing.premium.amount
        return total + amount
      }, 0)
  }

  const getRevenueByTier = (tier: string) => {
    const count = registrations.filter(reg => 
      reg.payment_tier === tier && reg.registration_status === 'approved'
    ).length
    const amount = tier === 'basic' ? config.pricing.basic.amount : 
                  tier === 'plus' ? config.pricing.plus.amount : 
                  config.pricing.premium.amount
    return count * amount
  }

  const getTierDistribution = () => {
    const basic = registrations.filter(reg => 
      reg.payment_tier === 'basic' && reg.registration_status === 'approved'
    ).length
    const plus = registrations.filter(reg => 
      reg.payment_tier === 'plus' && reg.registration_status === 'approved'
    ).length  
    const premium = registrations.filter(reg => 
      reg.payment_tier === 'premium' && reg.registration_status === 'approved'
    ).length
    return { basic, plus, premium }
  }

  const filteredRegistrations = registrations.filter(reg => {
    const matchesSearch = !searchTerm || 
      reg.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      reg.email_address.toLowerCase().includes(searchTerm.toLowerCase()) ||
      reg.mobile_number.includes(searchTerm)
    
    const matchesStatus = statusFilter === 'all' || reg.registration_status === statusFilter
    const matchesTier = paymentTierFilter === 'all' || reg.payment_tier === paymentTierFilter
    
    return matchesSearch && matchesStatus && matchesTier
  })

  const exportToCSV = () => {
    const headers = [
      'Name', 'Email', 'Mobile', 'Gender', 'Address', 'Delivery Address', 
      'Payment Tier', 'T-shirt Size', 'Strava Profile', 'Where Heard', 
      'Status', 'Created At'
    ]
    
    const csvData = filteredRegistrations.map(reg => [
      reg.full_name,
      reg.email_address,
      reg.mobile_number,
      reg.gender,
      reg.full_address,
      reg.delivery_address || '',
      reg.payment_tier,
      reg.tshirt_size || '',
      reg.strava_profile_link,
      reg.where_heard,
      reg.registration_status,
      new Date(reg.created_at).toLocaleDateString('en-IN')
    ])
    
    const csv = [headers, ...csvData].map(row => 
      row.map(field => `"${field}"`).join(',')
    ).join('\n')
    
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `registrations-${new Date().toISOString().split('T')[0]}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
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

      {/* Enhanced Analytics Dashboard */}
      <div className="max-w-7xl mx-auto p-6">
        {/* Primary Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
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

        {/* Revenue Analytics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="card">
            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <span className="text-accent-green">💰</span>
              Revenue Analytics
            </h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Total Revenue (Approved)</span>
                <span className="text-2xl font-bold text-accent-green">₹{getTotalRevenue().toLocaleString('en-IN')}</span>
              </div>
              <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-700">
                <div className="text-center">
                  <div className="text-lg font-bold text-white">₹{getRevenueByTier('basic').toLocaleString('en-IN')}</div>
                  <div className="text-xs text-gray-400">Basic</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-white">₹{getRevenueByTier('plus').toLocaleString('en-IN')}</div>
                  <div className="text-xs text-gray-400">Plus</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-white">₹{getRevenueByTier('premium').toLocaleString('en-IN')}</div>
                  <div className="text-xs text-gray-400">Premium</div>
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <span className="text-accent-blue">📊</span>
              Package Distribution (Approved)
            </h3>
            <div className="space-y-3">
              {(() => {
                const { basic, plus, premium } = getTierDistribution()
                const total = basic + plus + premium
                return (
                  <>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">Basic ({config.pricing.basic.display})</span>
                      <div className="flex items-center gap-2">
                        <span className="text-white font-semibold">{basic}</span>
                        <span className="text-xs text-gray-500">({total > 0 ? Math.round((basic/total)*100) : 0}%)</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">Plus ({config.pricing.plus.display})</span>
                      <div className="flex items-center gap-2">
                        <span className="text-white font-semibold">{plus}</span>
                        <span className="text-xs text-gray-500">({total > 0 ? Math.round((plus/total)*100) : 0}%)</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">Premium ({config.pricing.premium.display})</span>
                      <div className="flex items-center gap-2">
                        <span className="text-white font-semibold">{premium}</span>
                        <span className="text-xs text-gray-500">({total > 0 ? Math.round((premium/total)*100) : 0}%)</span>
                      </div>
                    </div>
                  </>
                )
              })()}
            </div>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="card mb-8">
          <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <span className="text-accent-orange">🔍</span>
              Registration Management
            </h3>
            <button
              onClick={exportToCSV}
              className="btn btn-secondary inline-flex items-center gap-2"
            >
              <span>📥</span>
              Export CSV
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-400">Search</label>
              <input
                type="text"
                placeholder="Search by name, email, or mobile..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="form-field w-full"
              />
            </div>
            
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-400">Status Filter</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="form-field w-full"
              >
                <option value="all">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
            
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-400">Package Filter</label>
              <select
                value={paymentTierFilter}
                onChange={(e) => setPaymentTierFilter(e.target.value)}
                className="form-field w-full"
              >
                <option value="all">All Packages</option>
                <option value="basic">Basic ({config.pricing.basic.display})</option>
                <option value="plus">Plus ({config.pricing.plus.display})</option>
                <option value="premium">Premium ({config.pricing.premium.display})</option>
              </select>
            </div>
          </div>
          
          <div className="mt-4 flex justify-between items-center">
            <div className="text-sm text-gray-400">
              Showing {filteredRegistrations.length} of {registrations.length} registrations
            </div>
            {process.env.NODE_ENV === 'development' && (
              <button
                onClick={() => {
                  console.log('Current registrations data:', registrations)
                  console.log('Filtered registrations:', filteredRegistrations)
                  console.log('Current filters:', { searchTerm, statusFilter, paymentTierFilter })
                  console.log('Revenue calculation debug:', {
                    totalRevenue: getTotalRevenue(),
                    basicRevenue: getRevenueByTier('basic'),
                    plusRevenue: getRevenueByTier('plus'),  
                    premiumRevenue: getRevenueByTier('premium'),
                    tierDistributionApproved: getTierDistribution(),
                    allRegistrationsByTier: {
                      basic: registrations.filter((r: Registration) => r.payment_tier === 'basic').length,
                      plus: registrations.filter((r: Registration) => r.payment_tier === 'plus').length,
                      premium: registrations.filter((r: Registration) => r.payment_tier === 'premium').length
                    }
                  })
                }}
                className="btn btn-secondary text-xs"
              >
                Debug Data
              </button>
            )}
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
        ) : filteredRegistrations.length === 0 ? (
          <div className="card text-center py-12">
            <div className="text-6xl mb-4">🔍</div>
            <h3 className="text-xl font-bold text-white mb-2">No Matching Registrations</h3>
            <p className="text-gray-400">Try adjusting your search or filter criteria.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {filteredRegistrations.map((registration) => (
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
                            registration.payment_tier === 'basic' ? config.pricing.basic.display :
                            registration.payment_tier === 'plus' ? config.pricing.plus.display :
                            config.pricing.premium.display
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