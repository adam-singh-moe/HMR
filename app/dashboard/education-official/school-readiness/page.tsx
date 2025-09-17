"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { getSchoolReadinessDetailedStats } from "@/app/actions/school-readiness-detailed-stats"
import { getRegionalReadinessStats } from "@/app/actions/regional-readiness-stats"
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts'
import Link from "next/link"
import { ChevronLeft, MapPin } from "lucide-react"
import { Button } from "@/components/ui/button"

interface ReadinessStats {
  readyToReopen: number
  notReady: number
  noStatusUpdate: number
  totalSchools: number
  readyPercentage: number
  notReadyPercentage: number
  noStatusPercentage: number
}

interface RegionalReadinessStats {
  regionId: string
  regionName: string
  totalSchools: number
  readySchools: number
  notReadySchools: number
  noStatusSchools: number
  readyPercentage: number
  notReadyPercentage: number
  noStatusPercentage: number
}

export default function SchoolReadinessDashboard() {
  const [stats, setStats] = useState<ReadinessStats | null>(null)
  const [regionalStats, setRegionalStats] = useState<RegionalReadinessStats[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showRegionalView, setShowRegionalView] = useState(false)

  useEffect(() => {
    async function fetchStats() {
      try {
        const [overallResult, regionalResult] = await Promise.all([
          getSchoolReadinessDetailedStats(),
          getRegionalReadinessStats()
        ])
        
        if (overallResult.error) {
          setError(overallResult.error)
        } else if (overallResult.data) {
          setStats(overallResult.data)
        }

        if (regionalResult.success && regionalResult.data) {
          setRegionalStats(regionalResult.data)
        }
      } catch (err) {
        setError("Failed to load readiness statistics")
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [])

  if (loading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-8"></div>
          <div className="h-96 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  if (error || !stats) {
    return (
      <div className="container mx-auto py-8 px-4">
        <Card>
          <CardContent className="py-8">
            <div className="text-center text-red-600">
              {error || "Failed to load statistics"}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const pieData = [
    {
      name: 'Ready to Reopen',
      value: stats.readyToReopen,
      percentage: stats.readyPercentage,
      color: '#22c55e'
    },
    {
      name: 'Not Ready to Reopen',
      value: stats.notReady,
      percentage: stats.notReadyPercentage,
      color: '#ef4444'
    },
    {
      name: 'No Status Update',
      value: stats.noStatusUpdate,
      percentage: stats.noStatusPercentage,
      color: '#6b7280'
    }
  ]

  const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
    if (percent === 0) return null
    const RADIAN = Math.PI / 180
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5
    const x = cx + radius * Math.cos(-midAngle * RADIAN)
    const y = cy + radius * Math.sin(-midAngle * RADIAN)

    return (
      <text
        x={x}
        y={y}
        fill="white"
        textAnchor={x > cx ? 'start' : 'end'}
        dominantBaseline="central"
        className="text-sm font-medium"
      >
        {`${(percent * 100).toFixed(1)}%`}
      </text>
    )
  }

  return (
    <div className="container mx-auto py-8 px-4 focus:outline-none" tabIndex={-1}>
      <style jsx global>{`
        * {
          outline: none !important;
        }
        *:focus {
          outline: none !important;
          box-shadow: none !important;
        }
        svg {
          outline: none !important;
        }
        .recharts-wrapper {
          outline: none !important;
        }
        .recharts-pie {
          outline: none !important;
        }
        .recharts-sector {
          outline: none !important;
        }
        .card {
          outline: none !important;
        }
        .card:focus {
          outline: none !important;
          box-shadow: none !important;
        }
        div {
          outline: none !important;
        }
        div:focus {
          outline: none !important;
          box-shadow: none !important;
        }
        div:focus-visible {
          outline: none !important;
          box-shadow: none !important;
        }
        .container {
          outline: none !important;
        }
        .container:focus {
          outline: none !important;
          box-shadow: none !important;
        }
      `}</style>
      
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Link href="/dashboard/education-official">
          <Button variant="ghost" size="sm">
            <ChevronLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">School Readiness Overview</h1>
          <p className="text-gray-600 mt-2">
            View the current status of school readiness for reopening across all schools
          </p>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="text-2xl font-bold text-center">{stats.totalSchools}</div>
            <div className="text-sm text-gray-600 text-center mt-2">Total Schools</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="text-2xl font-bold text-center text-green-600">{stats.readyToReopen}</div>
            <div className="text-sm text-gray-600 text-center mt-2">Ready to Reopen</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="text-2xl font-bold text-center text-red-600">{stats.notReady}</div>
            <div className="text-sm text-gray-600 text-center mt-2">Not Ready</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="text-2xl font-bold text-center text-gray-600">{stats.noStatusUpdate}</div>
            <div className="text-sm text-gray-600 text-center mt-2">No Status Update</div>
          </CardContent>
        </Card>
      </div>

      {/* Pie Chart */}
      <Card className="focus:outline-none focus:ring-0 focus:shadow-none">
        <CardHeader className="focus:outline-none">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>School Readiness Distribution</CardTitle>
              <CardDescription>
                Click on any section to view the list of schools in that category
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowRegionalView(!showRegionalView)}
            >
              <MapPin className="h-4 w-4 mr-2" />
              {showRegionalView ? 'Hide' : 'Show'} Regional Charts
            </Button>
          </div>
        </CardHeader>
        <CardContent className="focus:outline-none focus:ring-0 focus:shadow-none">
          {!showRegionalView ? (
            // Overall pie chart
            <div className="h-96 focus:outline-none focus:ring-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart className="focus:outline-none">
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={renderCustomLabel}
                    outerRadius={120}
                    fill="#8884d8"
                    dataKey="value"
                    onClick={(data) => {
                      // Navigate to the appropriate school list
                      let status = 'no-status'
                      if (data.name === 'Ready to Reopen') status = 'ready'
                      if (data.name === 'Not Ready to Reopen') status = 'not-ready'
                      window.location.href = `/dashboard/education-official/school-readiness/schools/${status}`
                    }}
                    className="cursor-pointer focus:outline-none"
                    style={{ outline: 'none' }}
                  >
                    {pieData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={entry.color}
                        className="hover:opacity-80 transition-opacity focus:outline-none"
                        style={{ outline: 'none' }}
                      />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value, name) => [
                      `${value} schools (${pieData.find(d => d.name === name)?.percentage.toFixed(1)}%)`,
                      name
                    ]}
                  />
                  <Legend 
                    verticalAlign="bottom" 
                    height={36}
                    formatter={(value, entry: any) => (
                      <Link 
                        href={`/dashboard/education-official/school-readiness/schools/${
                          value === 'Ready to Reopen' ? 'ready' : 
                          value === 'Not Ready to Reopen' ? 'not-ready' : 'no-status'
                        }`}
                        className="hover:underline cursor-pointer"
                      >
                        <span style={{ color: entry.color }}>{value}</span>
                      </Link>
                    )}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            // Regional mini pie charts
            <div>
              <h3 className="text-lg font-semibold mb-4 text-center">School Readiness by Region</h3>
              {regionalStats.length === 0 ? (
                <div className="text-center text-gray-500 py-8">
                  <p>No regional data available</p>
                  <p className="text-sm">Loading regional statistics...</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                  {regionalStats
                    .filter(region => region.totalSchools > 0)
                    .map((region) => {
                      const regionPieData = [
                        {
                          name: 'Ready',
                          value: region.readySchools,
                          percentage: region.readyPercentage,
                          color: '#22c55e'
                        },
                        {
                          name: 'Not Ready',
                          value: region.notReadySchools,
                          percentage: region.notReadyPercentage,
                          color: '#ef4444'
                        },
                        {
                          name: 'No Status',
                          value: region.noStatusSchools,
                          percentage: region.noStatusPercentage,
                          color: '#6b7280'
                        }
                      ].filter(item => item.value > 0)

                      return (
                        <Link 
                          key={region.regionId} 
                          href={`/dashboard/region/${region.regionId}`}
                          className="text-center block hover:bg-gray-50 p-3 rounded-lg transition-colors duration-200 cursor-pointer"
                        >
                          <div className="h-32 w-32 mx-auto mb-2">
                            <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                <Pie
                                  data={regionPieData}
                                  cx="50%"
                                  cy="50%"
                                  outerRadius={55}
                                  fill="#8884d8"
                                  dataKey="value"
                                  className="focus:outline-none"
                                  style={{ outline: 'none' }}
                                >
                                  {regionPieData.map((entry, index) => (
                                    <Cell 
                                      key={`cell-${index}`} 
                                      fill={entry.color}
                                      className="focus:outline-none"
                                      style={{ outline: 'none' }}
                                    />
                                  ))}
                                </Pie>
                                <Tooltip 
                                  formatter={(value, name) => [
                                    `${value} schools (${regionPieData.find(d => d.name === name)?.percentage.toFixed(1)}%)`,
                                    name
                                  ]}
                                />
                              </PieChart>
                            </ResponsiveContainer>
                          </div>
                          
                          <div className="text-sm font-semibold truncate mb-1" title={region.regionName}>
                            {region.regionName}
                          </div>
                          <div className="text-sm text-gray-600 mb-2">
                            {region.totalSchools} school{region.totalSchools !== 1 ? 's' : ''}
                          </div>
                          
                          <div className="mt-2 space-y-1 text-sm">
                            {region.readySchools > 0 && (
                              <div className="flex items-center justify-center gap-2">
                                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                                <span>{region.readySchools} Ready</span>
                              </div>
                            )}
                            {region.notReadySchools > 0 && (
                              <div className="flex items-center justify-center gap-2">
                                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                                <span>{region.notReadySchools} Not Ready</span>
                              </div>
                            )}
                            {region.noStatusSchools > 0 && (
                              <div className="flex items-center justify-center gap-2">
                                <div className="w-3 h-3 bg-gray-500 rounded-full"></div>
                                <span>{region.noStatusSchools} No Status</span>
                              </div>
                            )}
                          </div>
                        </Link>
                      )
                    })}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link href="/dashboard/education-official/school-readiness/schools/ready">
          <Card className="cursor-pointer hover:bg-green-50 transition-colors border-green-200">
            <CardContent className="p-6 text-center">
              <div className="text-lg font-semibold text-green-700">View Ready Schools</div>
              <div className="text-sm text-green-600 mt-2">
                {stats.readyToReopen} schools ({stats.readyPercentage.toFixed(1)}%)
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/dashboard/education-official/school-readiness/schools/not-ready">
          <Card className="cursor-pointer hover:bg-red-50 transition-colors border-red-200">
            <CardContent className="p-6 text-center">
              <div className="text-lg font-semibold text-red-700">View Not Ready Schools</div>
              <div className="text-sm text-red-600 mt-2">
                {stats.notReady} schools ({stats.notReadyPercentage.toFixed(1)}%)
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/dashboard/education-official/school-readiness/schools/no-status">
          <Card className="cursor-pointer hover:bg-gray-50 transition-colors border-gray-200">
            <CardContent className="p-6 text-center">
              <div className="text-lg font-semibold text-gray-700">View Schools Without Status</div>
              <div className="text-sm text-gray-600 mt-2">
                {stats.noStatusUpdate} schools ({stats.noStatusPercentage.toFixed(1)}%)
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  )
}
