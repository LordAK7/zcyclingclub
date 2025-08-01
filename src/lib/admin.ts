// Admin utility functions
export const ADMIN_EMAIL = 'rohidaskore34@gmail.com'

export const isAdmin = (userEmail: string | undefined): boolean => {
  return userEmail === ADMIN_EMAIL
}