"use client"

import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"

export default function HomePage() {
  const router = useRouter()
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval)
          // Direct redirect without any morphing animation
          setTimeout(() => router.replace('/auth'), 300)
          return 100
        }
        return prev + 8
      })
    }, 100)

    return () => clearInterval(interval)
  }, [router])

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Professional Blue Background */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-blue-100" />
        
        {/* Subtle blue overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-blue-400/5 to-blue-600/10" />

        {/* Floating elements */}
        <div className="absolute inset-0 opacity-100 scale-100">
          <div className="absolute top-1/6 left-1/6 w-2 h-2 bg-blue-300 rounded-full animate-float-random opacity-40" style={{ animationDelay: '0s', animationDuration: '4s' }} />
          <div className="absolute top-1/4 right-1/5 w-1.5 h-1.5 bg-blue-400 rounded-full animate-float-random opacity-30" style={{ animationDelay: '1s', animationDuration: '5s' }} />
          <div className="absolute bottom-1/4 left-1/4 w-2.5 h-2.5 bg-blue-200 rounded-full animate-float-random opacity-35" style={{ animationDelay: '2s', animationDuration: '6s' }} />
          <div className="absolute bottom-1/6 right-1/3 w-1 h-1 bg-blue-500 rounded-full animate-float-random opacity-25" style={{ animationDelay: '0.5s', animationDuration: '4.5s' }} />
          <div className="absolute top-1/3 left-1/2 w-2 h-2 bg-blue-300 rounded-full animate-float-random opacity-40" style={{ animationDelay: '1.5s', animationDuration: '5.5s' }} />
          <div className="absolute top-3/4 left-1/5 w-1.5 h-1.5 bg-blue-400 rounded-full animate-float-random opacity-30" style={{ animationDelay: '2.5s', animationDuration: '4.2s' }} />
        </div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 flex items-center justify-center min-h-screen opacity-100 scale-100">
        <div className="text-center space-y-12 px-8">
          
          {/* Logo Section with ripple effects */}
          <div className="relative">
            <div className="relative mx-auto w-32 h-32">
              {/* Ripple rings */}
              <div className="absolute inset-0 border-2 border-blue-400 rounded-full animate-ripple opacity-20" style={{ animationDelay: '0s' }} />
              <div className="absolute inset-0 border-2 border-blue-300 rounded-full animate-ripple opacity-15" style={{ animationDelay: '0.5s' }} />
              <div className="absolute inset-0 border-2 border-blue-500 rounded-full animate-ripple opacity-25" style={{ animationDelay: '1s' }} />
              
              {/* Central logo */}
              <div className="relative w-32 h-32 rounded-full bg-gradient-to-br from-blue-500 via-blue-600 to-blue-700 flex items-center justify-center shadow-2xl animate-glow">
                <div className="w-20 h-20 rounded-full bg-white flex items-center justify-center shadow-inner">
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-blue-700 rounded-full animate-pulse" />
                </div>
              </div>
            </div>
          </div>

          {/* Text Content */}
          <div className="space-y-6">
            <div className="space-y-3">
              <h1 className="text-4xl md:text-5xl font-bold text-blue-800 animate-slide-in-up">
                Ministry of Education
              </h1>
              <h2 className="text-xl md:text-2xl text-blue-600 animate-slide-in-up" style={{ animationDelay: '0.2s' }}>
                School Headteachers' Monthly Report
              </h2>
              <p className="text-lg text-gray-600 animate-slide-in-up" style={{ animationDelay: '0.4s' }}>
                Republic of Guyana
              </p>
            </div>
          </div>

          {/* Progress Section */}
          <div className="space-y-6 animate-slide-in-up" style={{ animationDelay: '0.6s' }}>
            <div className="max-w-md mx-auto">
              <div className="relative h-2 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className="absolute left-0 top-0 h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${progress}%` }}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
                </div>
              </div>
              
              <div className="flex justify-between mt-3 text-sm text-gray-600">
                <span>Loading application...</span>
                <span className="font-mono font-medium text-blue-600">{Math.round(progress)}%</span>
              </div>
            </div>

            {/* Loading dots */}
            <div className="flex justify-center space-x-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-wave" style={{ animationDelay: '0s' }} />
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-wave" style={{ animationDelay: '0.15s' }} />
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-wave" style={{ animationDelay: '0.3s' }} />
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-wave" style={{ animationDelay: '0.45s' }} />
            </div>
          </div>
        </div>
      </div>

      {/* NO morphing overlay - direct redirect to login */}
    </div>
  )
}
