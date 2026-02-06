'use server'

import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function getProductAnalytics(productId: string) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return { error: 'Unauthorized' }
    }

    // Verify user owns the product
    const product = await prisma.product.findUnique({
      where: { id: productId },
    })

    if (!product || product.userId !== session.user.id) {
      return { error: 'Unauthorized' }
    }

    // Get analytics data
    const analytics = await prisma.analytics.findMany({
      where: { productId },
      orderBy: { timestamp: 'desc' },
    })

    // Get total clicks
    const totalClicks = analytics.length

    // Get unique visitors (based on IP)
    const uniqueVisitors = new Set(analytics.map((a) => a.ip)).size

    // Get device type breakdown
    const deviceTypes = analytics.reduce((acc, curr) => {
      const device = curr.deviceType || 'unknown'
      acc[device] = (acc[device] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    // Get country breakdown
    const countries = analytics.reduce((acc, curr) => {
      const country = curr.country || 'unknown'
      acc[country] = (acc[country] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    // Get completed purchases
    const completedPurchases = await prisma.payment.count({
      where: {
        productId,
        status: 'completed',
      },
    })

    // Get recent activity (last 30 days)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const recentClicks = await prisma.analytics.findMany({
      where: {
        productId,
        timestamp: {
          gte: thirtyDaysAgo,
        },
      },
      orderBy: { timestamp: 'asc' },
    })

    // Group by day
    const clicksByDay = recentClicks.reduce((acc, curr) => {
      const date = curr.timestamp.toISOString().split('T')[0]
      acc[date] = (acc[date] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    return {
      totalClicks,
      uniqueVisitors,
      deviceTypes,
      countries,
      completedPurchases,
      clicksByDay,
    }
  } catch (error) {
    console.error('Error fetching analytics:', error)
    return { error: 'Failed to fetch analytics' }
  }
}
