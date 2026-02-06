import { supabaseAdmin } from './supabase'

interface LogActivityParams {
  userId: string
  action: string
  details?: Record<string, any>
  ipAddress?: string
  userAgent?: string
  page?: string
}

export async function logActivity({
  userId,
  action,
  details = {},
  ipAddress,
  userAgent,
  page,
}: LogActivityParams) {
  try {
    const { error } = await supabaseAdmin.from('activity_logs').insert({
      user_id: userId,
      action,
      details,
      ip_address: ipAddress,
      user_agent: userAgent,
      page,
    })

    if (error) {
      console.error('Failed to log activity:', error)
    }
  } catch (err) {
    console.error('Error in logActivity:', err)
  }
}

export async function logAdminAction({
  adminId,
  action,
  targetType,
  targetId,
  details = {},
  ipAddress,
}: {
  adminId: string
  action: string
  targetType?: string
  targetId?: string
  details?: Record<string, any>
  ipAddress?: string
}) {
  try {
    const { error } = await supabaseAdmin.from('admin_actions').insert({
      admin_id: adminId,
      action,
      target_type: targetType,
      target_id: targetId,
      details,
      ip_address: ipAddress,
    })

    if (error) {
      console.error('Failed to log admin action:', error)
    }
  } catch (err) {
    console.error('Error in logAdminAction:', err)
  }
}

export function getClientIp(request: Request): string {
  const forwarded = (request.headers.get('x-forwarded-for') ?? '').split(',')[0].trim()
  const realIp = request.headers.get('x-real-ip')
  return forwarded || realIp || 'unknown'
}

export function getUserAgent(request: Request): string {
  return request.headers.get('user-agent') || 'unknown'
}
