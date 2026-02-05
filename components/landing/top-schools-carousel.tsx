"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
// import { useRouter } from "next/navigation" // Removed unused import
import { getPublicTopSchools } from "@/app/actions/public-reports"
import {
  ChevronLeft,
  ChevronRight,
  Trophy,
  Medal,
  Award,
  MapPin,
  GraduationCap,
  TrendingUp,
  Star
} from "lucide-react"

// Sample data for top schools by region
const SAMPLE_TOP_SCHOOLS = {
  "Region 1": [
    { id: "1", name: "Mabaruma Secondary", score: 412, rating: "A", level: "Secondary", trend: "+15" },
    { id: "2", name: "Port Kaituma Primary", score: 385, rating: "A", level: "Primary", trend: "+8" },
    { id: "3", name: "Matthews Ridge Primary", score: 372, rating: "B", level: "Primary", trend: "+12" },
  ],
  "Region 2": [
    { id: "4", name: "Anna Regina Secondary", score: 418, rating: "A", level: "Secondary", trend: "+20" },
    { id: "5", name: "Charity Primary", score: 395, rating: "A", level: "Primary", trend: "+5" },
    { id: "6", name: "Aurora Primary", score: 368, rating: "B", level: "Primary", trend: "+10" },
  ],
  "Region 3": [
    { id: "7", name: "Leonora Secondary", score: 425, rating: "A", level: "Secondary", trend: "+18" },
    { id: "8", name: "Vreed-en-Hoop Primary", score: 402, rating: "A", level: "Primary", trend: "+7" },
    { id: "9", name: "Wales Primary", score: 378, rating: "B", level: "Primary", trend: "+14" },
  ],
  "Region 4": [
    { id: "10", name: "Queen's College", score: 429, rating: "A", level: "Secondary", trend: "+22" },
    { id: "11", name: "St. Stanislaus College", score: 421, rating: "A", level: "Secondary", trend: "+16" },
    { id: "12", name: "Bishops' High School", score: 415, rating: "A", level: "Secondary", trend: "+11" },
  ],
  "Region 5": [
    { id: "13", name: "Fort Wellington Secondary", score: 408, rating: "A", level: "Secondary", trend: "+13" },
    { id: "14", name: "Rosignol Primary", score: 382, rating: "B", level: "Primary", trend: "+9" },
    { id: "15", name: "Blairmont Primary", score: 365, rating: "B", level: "Primary", trend: "+6" },
  ],
  "Region 6": [
    { id: "16", name: "Skeldon Line Path Secondary", score: 419, rating: "A", level: "Secondary", trend: "+17" },
    { id: "17", name: "New Amsterdam Secondary", score: 411, rating: "A", level: "Secondary", trend: "+14" },
    { id: "18", name: "Corentyne Comprehensive", score: 398, rating: "A", level: "Secondary", trend: "+8" },
  ],
  "Region 7": [
    { id: "19", name: "Bartica Secondary", score: 392, rating: "A", level: "Secondary", trend: "+11" },
    { id: "20", name: "Bartica Primary", score: 375, rating: "B", level: "Primary", trend: "+7" },
    { id: "21", name: "Issano Primary", score: 358, rating: "B", level: "Primary", trend: "+5" },
  ],
  "Region 10": [
    { id: "22", name: "Mackenzie High", score: 416, rating: "A", level: "Secondary", trend: "+19" },
    { id: "23", name: "Linden Foundation Secondary", score: 405, rating: "A", level: "Secondary", trend: "+12" },
    { id: "24", name: "Wismar Hill Primary", score: 388, rating: "B", level: "Primary", trend: "+8" },
  ],
}

const REGIONS = Object.keys(SAMPLE_TOP_SCHOOLS)

const RATING_COLORS = {
  A: "from-emerald-500 to-green-600",
  B: "from-blue-500 to-indigo-600",
  C: "from-amber-500 to-yellow-600",
  D: "from-orange-500 to-red-500",
  E: "from-red-500 to-rose-600",
}

const RANK_ICONS = [Trophy, Medal, Award]
const RANK_COLORS = [
  "text-yellow-400",
  "text-slate-300",
  "text-amber-600"
]

interface TopSchoolsCarouselProps {
  autoPlay?: boolean
  autoPlayInterval?: number
}

export function TopSchoolsCarousel({
  autoPlay = true,
  autoPlayInterval = 8000
}: TopSchoolsCarouselProps) {
  const [currentRegionIndex, setCurrentRegionIndex] = useState(0)
  const [isAnimating, setIsAnimating] = useState(false)
  const [direction, setDirection] = useState<'left' | 'right'>('right')
  const [data, setData] = useState<Record<string, any>>(SAMPLE_TOP_SCHOOLS)
  const [regions, setRegions] = useState<string[]>(Object.keys(SAMPLE_TOP_SCHOOLS))
  const [isLoading, setIsLoading] = useState(true)
  // const router = useRouter() // Removed unused hook

  useEffect(() => {
    async function fetchData() {
      try {
        const result = await getPublicTopSchools()
        if (result.regions.length > 0) {
          setData(result.data)
          setRegions(result.regions)
        }
      } catch (error) {
        console.error("Failed to fetch public rankings:", error)
      } finally {
        setIsLoading(false)
      }
    }
    fetchData()
  }, [])

  const currentRegion = regions[currentRegionIndex] || ""
  const schools = data[currentRegion] || []

  // Fill with placeholders if less than 3 schools
  const displaySchools = [...schools]
  if (schools.length < 3) {
     // logic to add empty placeholders if needed, or handle gracefully
     // For now we just render what we have, but the layout expects 3 grid columns
     // We can just pad with nulls/placeholders
  }

  const goToNext = useCallback(() => {
    if (isAnimating || regions.length === 0) return
    setDirection('right')
    setIsAnimating(true)
    setTimeout(() => {
      setCurrentRegionIndex((prev) => (prev + 1) % regions.length)
      setIsAnimating(false)
    }, 300)
  }, [isAnimating, regions.length])

  const goToPrev = useCallback(() => {
    if (isAnimating || regions.length === 0) return
    setDirection('left')
    setIsAnimating(true)
    setTimeout(() => {
      setCurrentRegionIndex((prev) => (prev - 1 + regions.length) % regions.length)
      setIsAnimating(false)
    }, 300)
  }, [isAnimating, regions.length])

  // Auto-play functionality
  useEffect(() => {
    if (!autoPlay || regions.length === 0) return
    const interval = setInterval(goToNext, autoPlayInterval)
    return () => clearInterval(interval)
  }, [autoPlay, autoPlayInterval, goToNext, regions.length])

  if (isLoading) {
    return <div className="w-full text-center py-20 text-slate-500">Loading rankings...</div>
  }
  
  if (regions.length === 0) {
    return <div className="w-full text-center py-20 text-slate-500">No rankings available for this term yet.</div>
  }

  return (
    <div className="w-full max-w-6xl mx-auto">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20 mb-4">
          <Trophy className="h-4 w-4 text-yellow-500 dark:text-yellow-400" />
          <span className="text-sm font-medium text-blue-600 dark:text-blue-300">Top Performing Schools</span>
        </div>
        <h2 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-700 via-blue-600 to-blue-800 dark:from-white dark:via-blue-100 dark:to-cyan-200 bg-clip-text text-transparent mb-2">
          School Excellence Rankings
        </h2>
        <p className="text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
          Celebrating academic excellence across Guyana's educational regions
        </p>
      </div>

      {/* Region Selector */}
      <div className="flex items-center justify-center gap-4 mb-8">
        <Button
          variant="ghost"
          size="icon"
          onClick={goToPrev}
          className="h-10 w-10 rounded-full bg-white/50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-700/50 border border-slate-300 dark:border-slate-700/50"
        >
          <ChevronLeft className="h-5 w-5 text-slate-600 dark:text-slate-300" />
        </Button>

        <div className="flex items-center gap-3 px-6 py-3 rounded-2xl bg-white dark:bg-gradient-to-r dark:from-slate-800/80 dark:to-slate-900/80 border border-slate-200 dark:border-slate-700/50 backdrop-blur-sm shadow-sm">
          <MapPin className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          <span className="text-lg font-semibold text-slate-900 dark:text-white min-w-[120px] text-center">
            {currentRegion}
          </span>
        </div>

        <Button
          variant="ghost"
          size="icon"
          onClick={goToNext}
          className="h-10 w-10 rounded-full bg-white/50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-700/50 border border-slate-300 dark:border-slate-700/50"
        >
          <ChevronRight className="h-5 w-5 text-slate-600 dark:text-slate-300" />
        </Button>
      </div>

      {/* Region Dots */}
      <div className="flex justify-center gap-2 mb-8">
        {regions.map((region, index) => (
          <button
            key={region}
            onClick={() => {
              setDirection(index > currentRegionIndex ? 'right' : 'left')
              setCurrentRegionIndex(index)
            }}
            className={`h-2 rounded-full transition-all duration-300 ${
              index === currentRegionIndex
                ? 'w-8 bg-gradient-to-r from-blue-500 to-cyan-400'
                : 'w-2 bg-slate-300 dark:bg-slate-600 hover:bg-slate-400 dark:hover:bg-slate-500'
            }`}
            aria-label={`Go to ${region}`}
          />
        ))}
      </div>

      {/* Schools Cards - Display order: 2nd, 1st, 3rd (1st in middle) */}
      <div
        className={`grid gap-6 md:grid-cols-3 transition-all duration-300 ${isAnimating
            ? direction === 'right'
              ? 'opacity-0 translate-x-8'
              : 'opacity-0 -translate-x-8'
            : 'opacity-100 translate-x-0'
        }`}
      >
        {/* We map the indices to the desired visual order: 1 (2nd place), 0 (1st place), 2 (3rd place) */}
        {[1, 0, 2].map((originalIndex) => {
          // Guard against fewer than 3 schools
          const school = schools[originalIndex]
          if (!school) return <div key={`empty-${originalIndex}`} className="hidden md:block" />

          const RankIcon = RANK_ICONS[originalIndex]
          // const rankColor = RANK_COLORS[originalIndex] // Unused variable
          const ratingGradient = RATING_COLORS[school.rating as keyof typeof RATING_COLORS] || RATING_COLORS.A

          // Background colors based on rank position - light and dark mode
          const cardBg = originalIndex === 0
            ? 'bg-gradient-to-br from-yellow-100/80 via-white to-white dark:from-yellow-950/40 dark:via-slate-900/90 dark:to-slate-900/90 border-yellow-400/50 dark:border-yellow-500/30'
            : originalIndex === 2
            ? 'bg-gradient-to-br from-orange-100/80 via-white to-white dark:from-orange-950/40 dark:via-slate-900/90 dark:to-slate-900/90 border-orange-400/50 dark:border-orange-500/30'
            : 'bg-gradient-to-br from-slate-100/80 via-white to-white dark:from-slate-800/90 dark:to-slate-900/90 border-slate-300 dark:border-slate-700/50'

          return (
            <Card
              key={school.id}
              className={`relative overflow-hidden ${cardBg} backdrop-blur-sm border-slate-200/50 dark:border-slate-700/50 transition-all duration-300 hover:scale-[1.02] hover:shadow-xl hover:shadow-blue-500/10`}
            >
              {/* Rank Badge */}
              <div className="absolute top-4 left-4 z-10 flex items-center gap-3">
                <div className={`flex items-center justify-center w-10 h-10 rounded-full ${
                  originalIndex === 0
                    ? 'bg-gradient-to-br from-yellow-400 to-amber-500 shadow-lg shadow-yellow-500/30'
                    : originalIndex === 1
                    ? 'bg-gradient-to-br from-slate-300 to-slate-400 shadow-lg shadow-slate-400/20'
                    : 'bg-gradient-to-br from-amber-600 to-orange-700 shadow-lg shadow-amber-600/20'
                }`}>
                  <RankIcon className={`h-5 w-5 ${originalIndex === 0 ? 'text-yellow-900' : originalIndex === 1 ? 'text-slate-700' : 'text-amber-200'}`} />
                </div>
                <span className={`text-xs font-bold uppercase tracking-wider ${
                  originalIndex === 0 ? 'text-yellow-600 dark:text-yellow-400' : originalIndex === 1 ? 'text-slate-500 dark:text-slate-300' : 'text-amber-600 dark:text-amber-500'
                }`}>
                  {originalIndex === 0 ? '1st' : originalIndex === 1 ? '2nd' : '3rd'} Place
                </span>
              </div>

              {/* Rating Badge */}
              <div className="absolute top-4 right-4 z-10">
                <div className={`px-3 py-1 rounded-full bg-gradient-to-r ${ratingGradient} shadow-lg`}>
                  <span className="text-sm font-bold text-white">{school.rating}</span>
                </div>
              </div>

              {/* Decorative gradient */}
              <div className={`absolute inset-0 bg-gradient-to-br ${ratingGradient} opacity-5`} />

              <CardContent className="pt-16 pb-6">
                {/* School Name */}
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2 pr-12 line-clamp-2 min-h-[3.5rem]">{school.name}</h3>

                {/* School Level */}
                <div className="flex items-center gap-2 mb-4">
                  <GraduationCap className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                  <span className="text-sm text-slate-500 dark:text-slate-400">{school.level}</span>
                </div>

                {/* Score Section */}
                <div className="flex items-end justify-between mt-4 pt-4 border-t border-slate-200 dark:border-slate-700/50">
                  <div>
                    <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Total Score</p>
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-black text-slate-900 dark:text-white">{school.score}</span>
                      <span className="text-sm text-slate-500">/429</span>
                    </div>
                  </div>

                  {/* Trend */}
                  <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                    <TrendingUp className="h-3 w-3 text-emerald-500 dark:text-emerald-400" />
                    <span className="text-xs font-medium text-emerald-500 dark:text-emerald-400">{school.trend}</span>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mt-4">
                  <div className="h-2 bg-slate-200 dark:bg-slate-700/50 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        originalIndex === 0
                          ? 'bg-gradient-to-r from-yellow-500 to-amber-500'
                          : originalIndex === 1
                          ? 'bg-gradient-to-r from-slate-400 to-slate-500'
                          : 'bg-gradient-to-r from-orange-500 to-red-500'
                      }`}
                      style={{ width: `${(school.score / 429) * 100}%` }}
                    />
                  </div>
                </div>
              </CardContent>

              {/* Shine effect for top school */}
              {originalIndex === 0 && (
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full animate-shine pointer-events-none" />
              )}
            </Card>
          )
        })}
      </div>



      {/* Animation keyframes */}
      <style jsx>{`
        @keyframes shine {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }
        .animate-shine {
          animation: shine 3s ease-in-out infinite;
        }
      `}</style>
    </div>
  )
}
