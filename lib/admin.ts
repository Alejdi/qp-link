import { getServerSession } from 'next-auth'
import { authOptions, ADMIN_EMAIL } from './auth'
import { supabaseAdmin } from './supabase'
import { NextResponse } from 'next/server'

// Check if user is admin by email or role
export function isAdminUser(email: string | null | undefined, role: string | null | undefined): boolean {
  if (!email) return false
  // Check if email matches admin email or user has admin role
  return email === ADMIN_EMAIL || role === 'admin'
}

// Get session and verify admin access
export async function getAdminSession() {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    return { session: null, isAdmin: false, error: 'Unauthorized' }
  }

  const isAdmin = isAdminUser(session.user.email, session.user.role)

  return { session, isAdmin, error: isAdmin ? null : 'Admin access required' }
}

// Middleware helper for API routes - returns error response or null
export async function requireAdmin() {
  const { session, isAdmin, error } = await getAdminSession()

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!isAdmin) {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
  }

  return null // No error, proceed
}

// Log admin action
export async function logAdminAction(
  adminId: string,
  action: string,
  targetType?: string,
  targetId?: string,
  details?: Record<string, any>,
  ipAddress?: string
) {
  try {
    await supabaseAdmin.from('admin_actions').insert({
      admin_id: adminId,
      action,
      target_type: targetType,
      target_id: targetId,
      details: details || {},
      ip_address: ipAddress,
    })
  } catch (error) {
    console.error('Failed to log admin action:', error)
  }
}

// Log user activity
export async function logActivity(
  userId: string,
  action: string,
  details?: Record<string, any>,
  ipAddress?: string,
  userAgent?: string,
  page?: string
) {
  try {
    await supabaseAdmin.from('activity_logs').insert({
      user_id: userId,
      action,
      details: details || {},
      ip_address: ipAddress,
      user_agent: userAgent,
      page,
    })
  } catch (error) {
    console.error('Failed to log activity:', error)
  }
}

// Update user's last active status
export async function updateUserActivity(userId: string, currentPage?: string) {
  try {
    await supabaseAdmin
      .from('users')
      .update({
        last_active: new Date().toISOString(),
        current_page: currentPage,
      })
      .eq('id', userId)
  } catch (error) {
    console.error('Failed to update user activity:', error)
  }
}

// Check if IP is banned
export async function isIPBanned(ipAddress: string): Promise<boolean> {
  try {
    const { data } = await supabaseAdmin
      .from('banned_ips')
      .select('id')
      .eq('ip_address', ipAddress)
      .single()

    return !!data
  } catch {
    return false
  }
}

// Ban a user
export async function banUser(
  adminId: string,
  userId: string,
  reason: string,
  ipAddress?: string
) {
  try {
    // Update user record
    await supabaseAdmin
      .from('users')
      .update({
        is_banned: true,
        banned_at: new Date().toISOString(),
        ban_reason: reason,
      })
      .eq('id', userId)

    // Log the action
    await logAdminAction(adminId, 'ban_user', 'user', userId, { reason }, ipAddress)

    return { success: true }
  } catch (error) {
    console.error('Failed to ban user:', error)
    return { success: false, error: 'Failed to ban user' }
  }
}

// Unban a user
export async function unbanUser(adminId: string, userId: string, ipAddress?: string) {
  try {
    await supabaseAdmin
      .from('users')
      .update({
        is_banned: false,
        banned_at: null,
        ban_reason: null,
      })
      .eq('id', userId)

    await logAdminAction(adminId, 'unban_user', 'user', userId, {}, ipAddress)

    return { success: true }
  } catch (error) {
    console.error('Failed to unban user:', error)
    return { success: false, error: 'Failed to unban user' }
  }
}

// Ban an IP address
export async function banIP(
  adminId: string,
  ipAddress: string,
  reason: string,
  adminIP?: string
) {
  try {
    await supabaseAdmin.from('banned_ips').insert({
      ip_address: ipAddress,
      reason,
      banned_by: adminId,
    })

    await logAdminAction(adminId, 'ban_ip', 'ip', ipAddress, { reason }, adminIP)

    return { success: true }
  } catch (error) {
    console.error('Failed to ban IP:', error)
    return { success: false, error: 'Failed to ban IP' }
  }
}

// Unban an IP address
export async function unbanIP(adminId: string, ipAddress: string, adminIP?: string) {
  try {
    await supabaseAdmin
      .from('banned_ips')
      .delete()
      .eq('ip_address', ipAddress)

    await logAdminAction(adminId, 'unban_ip', 'ip', ipAddress, {}, adminIP)

    return { success: true }
  } catch (error) {
    console.error('Failed to unban IP:', error)
    return { success: false, error: 'Failed to unban IP' }
  }
}

// Get platform statistics
export async function getPlatformStats() {
  try {
    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
    const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

    // Fetch all stats in parallel
    const [
      usersTotal,
      usersToday,
      usersThisWeek,
      usersThisMonth,
      productsTotal,
      activeUsersNow,
      bannedUsers,
    ] = await Promise.all([
      supabaseAdmin.from('users').select('id', { count: 'exact', head: true }),
      supabaseAdmin.from('users').select('id', { count: 'exact', head: true }).gte('created_at', todayStart),
      supabaseAdmin.from('users').select('id', { count: 'exact', head: true }).gte('created_at', weekStart),
      supabaseAdmin.from('users').select('id', { count: 'exact', head: true }).gte('created_at', monthStart),
      supabaseAdmin.from('products').select('id', { count: 'exact', head: true }),
      supabaseAdmin.from('users').select('id', { count: 'exact', head: true }).gte('last_active', new Date(now.getTime() - 5 * 60 * 1000).toISOString()),
      supabaseAdmin.from('users').select('id', { count: 'exact', head: true }).eq('is_banned', true),
    ])

    return {
      totalUsers: usersTotal.count || 0,
      usersToday: usersToday.count || 0,
      usersThisWeek: usersThisWeek.count || 0,
      usersThisMonth: usersThisMonth.count || 0,
      totalProducts: productsTotal.count || 0,
      activeUsersNow: activeUsersNow.count || 0,
      bannedUsers: bannedUsers.count || 0,
    }
  } catch (error) {
    console.error('Failed to get platform stats:', error)
    return null
  }
}

// Format date for display
export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// Format time ago
export function timeAgo(date: string | Date): string {
  const seconds = Math.floor((new Date().getTime() - new Date(date).getTime()) / 1000)

  if (seconds < 60) return 'Just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`

  return formatDate(date)
}
