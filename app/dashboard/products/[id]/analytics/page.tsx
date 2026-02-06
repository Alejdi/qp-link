import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { getProduct } from '@/actions/products'
import { getProductAnalytics } from '@/actions/analytics'
import { formatPrice } from '@/lib/utils'
import { redirect } from 'next/navigation'

export default async function ProductAnalyticsPage({
  params,
}: {
  params: { id: string }
}) {
  const productResult = await getProduct(params.id)
  const analyticsResult = await getProductAnalytics(params.id)

  if (productResult.error || analyticsResult.error) {
    redirect('/dashboard')
  }

  const product = productResult.product!
  const analytics = analyticsResult as any

  return (
    <DashboardLayout>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">{product.name}</h1>
        <p className="text-gray-600 mt-1">
          {formatPrice(Number(product.price))} • Analytics Overview
        </p>
      </div>

      {/* Summary Stats */}
      <div className="grid md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-gray-600">Total Clicks</p>
            <p className="text-3xl font-bold text-gray-900 mt-2">
              {analytics.totalClicks || 0}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-gray-600">Unique Visitors</p>
            <p className="text-3xl font-bold text-gray-900 mt-2">
              {analytics.uniqueVisitors || 0}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-gray-600">Purchases</p>
            <p className="text-3xl font-bold text-green-600 mt-2">
              {analytics.completedPurchases || 0}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-gray-600">Conversion Rate</p>
            <p className="text-3xl font-bold text-primary-600 mt-2">
              {analytics.totalClicks > 0
                ? ((analytics.completedPurchases / analytics.totalClicks) * 100).toFixed(1)
                : 0}%
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Device Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Device Types</CardTitle>
          </CardHeader>
          <CardContent>
            {Object.entries(analytics.deviceTypes || {}).length > 0 ? (
              <div className="space-y-4">
                {Object.entries(analytics.deviceTypes).map(([device, count]) => (
                  <div key={device}>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm text-gray-600 capitalize">{device}</span>
                      <span className="text-sm font-medium">{count as number}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-primary-600 h-2 rounded-full"
                        style={{
                          width: `${((count as number) / analytics.totalClicks) * 100}%`,
                        }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-600 text-center py-8">No device data yet</p>
            )}
          </CardContent>
        </Card>

        {/* Country Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Top Countries</CardTitle>
          </CardHeader>
          <CardContent>
            {Object.entries(analytics.countries || {}).length > 0 ? (
              <div className="space-y-4">
                {Object.entries(analytics.countries)
                  .sort(([, a], [, b]) => (b as number) - (a as number))
                  .slice(0, 5)
                  .map(([country, count]) => (
                    <div key={country}>
                      <div className="flex justify-between mb-1">
                        <span className="text-sm text-gray-600">
                          {country === 'unknown' ? 'Unknown' : country}
                        </span>
                        <span className="text-sm font-medium">{count as number}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-green-600 h-2 rounded-full"
                          style={{
                            width: `${((count as number) / analytics.totalClicks) * 100}%`,
                          }}
                        ></div>
                      </div>
                    </div>
                  ))}
              </div>
            ) : (
              <p className="text-gray-600 text-center py-8">No country data yet</p>
            )}
          </CardContent>
        </Card>

        {/* Clicks Over Time */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Clicks Over Time (Last 30 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            {Object.entries(analytics.clicksByDay || {}).length > 0 ? (
              <div className="space-y-2">
                {Object.entries(analytics.clicksByDay)
                  .sort(([a], [b]) => a.localeCompare(b))
                  .map(([date, count]) => (
                    <div key={date} className="flex items-center">
                      <span className="text-sm text-gray-600 w-32">{date}</span>
                      <div className="flex-1 ml-4">
                        <div className="w-full bg-gray-200 rounded-full h-6">
                          <div
                            className="bg-primary-600 h-6 rounded-full flex items-center justify-end pr-2"
                            style={{
                              width: `${Math.max(
                                ((count as number) / Math.max(...Object.values(analytics.clicksByDay))) * 100,
                                5
                              )}%`,
                            }}
                          >
                            <span className="text-xs text-white font-medium">{count as number}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            ) : (
              <p className="text-gray-600 text-center py-8">No click data yet</p>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
