"use client"

import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { TopSchoolsCarousel } from "@/components/landing/top-schools-carousel"
import {
  ArrowRight,
  ChevronDown,
  Sparkles,
  Moon,
  Sun
} from "lucide-react"
import { useTheme } from "next-themes"

export default function HomePage() {
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [progress, setProgress] = useState(0)
  const [loadingComplete, setLoadingComplete] = useState(false)
  const [showLanding, setShowLanding] = useState(false)
  const { theme, setTheme } = useTheme()

  useEffect(() => {
    setMounted(true)

    // Progress animation for loader
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval)
          setTimeout(() => {
            setLoadingComplete(true)
            setTimeout(() => setShowLanding(true), 500)
          }, 400)
          return 100
        }
        return prev + 4
      })
    }, 80)

    return () => clearInterval(interval)
  }, [])

  const scrollToRankings = () => {
    document.getElementById('rankings')?.scrollIntoView({ behavior: 'smooth' })
  }

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark")
  }

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 overflow-x-hidden transition-colors duration-300">
      {/* Theme Toggle Button */}
      <button
        onClick={toggleTheme}
        className="fixed top-4 right-4 z-[60] p-3 rounded-full bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 transition-all duration-300 shadow-lg hover:shadow-xl border border-slate-300 dark:border-slate-700"
        aria-label="Toggle theme"
      >
        {mounted && (
          theme === "dark" ? (
            <Sun className="h-5 w-5 text-amber-500" />
          ) : (
            <Moon className="h-5 w-5 text-slate-700" />
          )
        )}
      </button>

      {/* Loading Screen */}
      <div
        className={`fixed inset-0 z-50 bg-white dark:bg-slate-950 transition-opacity duration-500 ${
          loadingComplete ? 'opacity-0 pointer-events-none' : 'opacity-100'
        }`}
      >
        {/* Animated gradient mesh background */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-blue-100 to-slate-100 dark:from-slate-900 dark:via-blue-950/50 dark:to-slate-900" />

          {/* Animated orbs */}
          <div
            className={`absolute top-1/4 -left-20 w-96 h-96 rounded-full blur-3xl transition-opacity duration-1000 ${mounted ? 'opacity-30' : 'opacity-0'}`}
            style={{
              background: 'radial-gradient(circle, rgba(59, 130, 246, 0.5) 0%, transparent 70%)',
              animation: 'float1 15s ease-in-out infinite'
            }}
          />
          <div
            className={`absolute -bottom-20 right-1/4 w-80 h-80 rounded-full blur-3xl transition-opacity duration-1000 ${mounted ? 'opacity-25' : 'opacity-0'}`}
            style={{
              background: 'radial-gradient(circle, rgba(147, 51, 234, 0.5) 0%, transparent 70%)',
              animation: 'float2 18s ease-in-out infinite'
            }}
          />
          <div
            className={`absolute top-1/2 right-0 w-64 h-64 rounded-full blur-3xl transition-opacity duration-1000 ${mounted ? 'opacity-20' : 'opacity-0'}`}
            style={{
              background: 'radial-gradient(circle, rgba(6, 182, 212, 0.5) 0%, transparent 70%)',
              animation: 'float3 20s ease-in-out infinite'
            }}
          />

          {/* Grid pattern */}
          <div
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage: `
                linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
              `,
              backgroundSize: '50px 50px'
            }}
          />

          {/* Floating particles */}
          <div className="absolute inset-0">
            {mounted && (
              <>
                <div className="absolute w-1 h-1 bg-blue-400/40 rounded-full opacity-60" style={{ top: '15%', left: '10%', animation: 'particle 5s ease-in-out infinite' }} />
                <div className="absolute w-1 h-1 bg-blue-400/40 rounded-full opacity-40" style={{ top: '25%', left: '85%', animation: 'particle 6s ease-in-out 0.5s infinite' }} />
                <div className="absolute w-1 h-1 bg-cyan-400/40 rounded-full opacity-50" style={{ top: '45%', left: '5%', animation: 'particle 7s ease-in-out 1s infinite' }} />
                <div className="absolute w-1 h-1 bg-blue-400/40 rounded-full opacity-30" style={{ top: '65%', left: '90%', animation: 'particle 5.5s ease-in-out 1.5s infinite' }} />
                <div className="absolute w-1 h-1 bg-purple-400/40 rounded-full opacity-50" style={{ top: '80%', left: '15%', animation: 'particle 6.5s ease-in-out 0.3s infinite' }} />
                <div className="absolute w-1 h-1 bg-blue-400/40 rounded-full opacity-40" style={{ top: '10%', left: '50%', animation: 'particle 5s ease-in-out 0.8s infinite' }} />
                <div className="absolute w-1 h-1 bg-cyan-400/40 rounded-full opacity-60" style={{ top: '35%', left: '70%', animation: 'particle 7s ease-in-out 1.2s infinite' }} />
                <div className="absolute w-1 h-1 bg-blue-400/40 rounded-full opacity-30" style={{ top: '55%', left: '25%', animation: 'particle 6s ease-in-out 0.6s infinite' }} />
                <div className="absolute w-1 h-1 bg-purple-400/40 rounded-full opacity-50" style={{ top: '75%', left: '60%', animation: 'particle 5.5s ease-in-out 1.8s infinite' }} />
                <div className="absolute w-1 h-1 bg-blue-400/40 rounded-full opacity-40" style={{ top: '90%', left: '40%', animation: 'particle 6.5s ease-in-out 0.4s infinite' }} />
              </>
            )}
          </div>
        </div>

        {/* Loader Content */}
        <div className="relative z-10 flex items-center justify-center min-h-screen">
          <div className="text-center space-y-10 px-8 max-w-2xl">
            {/* Logo Section */}
            <div className={`relative transition-all duration-1000 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-8'}`}>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-40 h-40 bg-blue-500/20 rounded-full blur-3xl animate-pulse" />
              </div>

              <div className="relative mx-auto w-32 h-32">
                <div
                  className="absolute -inset-2 rounded-full border-2 border-transparent"
                  style={{
                    background: 'linear-gradient(180deg, transparent 0%, rgba(59, 130, 246, 0.3) 50%, transparent 100%)',
                    animation: 'spin 4s linear infinite'
                  }}
                />
                <div className="absolute inset-0 rounded-full bg-gradient-to-br from-blue-500 via-blue-600 to-purple-600 p-1 shadow-2xl shadow-blue-500/30">
                  <div className="w-full h-full rounded-full bg-white dark:bg-slate-900 flex items-center justify-center overflow-hidden">
                    <Image
                      src="/images/moe-logo.png"
                      alt="Ministry of Education Logo"
                      width={120}
                      height={120}
                      className="w-full h-full object-cover scale-110"
                      priority
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Text Content */}
            <div className={`space-y-4 transition-all duration-1000 delay-200 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
              <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-blue-700 via-blue-600 to-blue-800 dark:from-white dark:via-blue-100 dark:to-cyan-200 bg-clip-text text-transparent">
                Ministry of Education
              </h1>
              <div className="h-1 w-20 mx-auto bg-gradient-to-r from-blue-500 via-cyan-400 to-purple-500 rounded-full" />
              <h2 className="text-xl md:text-2xl text-blue-700 dark:text-blue-300/90 font-medium">
                Headteacher Reporting Portal
              </h2>
              <p className="text-slate-600 dark:text-slate-400">
                Republic of Guyana
              </p>
            </div>

            {/* Progress Section */}
            <div className={`space-y-6 transition-all duration-1000 delay-400 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
              <div className="relative max-w-sm mx-auto">
                <div className="h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-400 rounded-full transition-all duration-300 ease-out relative"
                    style={{ width: `${progress}%` }}
                  >
                    <div
                      className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                      style={{ animation: 'shimmer 1.5s infinite' }}
                    />
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 bg-cyan-400 rounded-full blur-md" />
                  </div>
                </div>

                <div className="flex justify-between items-center mt-4">
                  <span className="text-sm text-slate-600 dark:text-slate-500">Initializing secure connection...</span>
                  <span className="text-sm font-mono font-semibold text-blue-600 dark:text-blue-400">{Math.round(progress)}%</span>
                </div>
              </div>

              <div className="flex justify-center gap-2">
                {[0, 1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="w-2 h-2 rounded-full bg-blue-500"
                    style={{
                      animation: 'pulse-dot 1.4s ease-in-out infinite',
                      animationDelay: `${i * 0.15}s`
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Feature pills */}
            <div className={`flex flex-wrap justify-center gap-3 transition-all duration-1000 delay-600 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
              {['Secure', 'Real-time', 'Analytics'].map((feature) => (
                <span
                  key={feature}
                  className="px-4 py-1.5 text-xs font-medium text-blue-700 dark:text-blue-300/80 bg-blue-500/10 border border-blue-500/20 rounded-full"
                >
                  {feature}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Landing Page Content */}
      <div className={`transition-opacity duration-500 ${showLanding ? 'opacity-100' : 'opacity-0'}`}>
        {/* Hero Section */}
        <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
          {/* Animated gradient mesh background */}
          <div className="absolute inset-0">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-blue-100 to-slate-100 dark:from-slate-900 dark:via-blue-950/50 dark:to-slate-900 transition-colors duration-300" />

            {/* Animated orbs */}
            <div
              className="absolute top-1/4 -left-20 w-96 h-96 rounded-full blur-3xl opacity-30"
              style={{
                background: 'radial-gradient(circle, rgba(59, 130, 246, 0.5) 0%, transparent 70%)',
                animation: 'float1 15s ease-in-out infinite'
              }}
            />
            <div
              className="absolute -bottom-20 right-1/4 w-80 h-80 rounded-full blur-3xl opacity-25"
              style={{
                background: 'radial-gradient(circle, rgba(147, 51, 234, 0.5) 0%, transparent 70%)',
                animation: 'float2 18s ease-in-out infinite'
              }}
            />
            <div
              className="absolute top-1/2 right-0 w-64 h-64 rounded-full blur-3xl opacity-20"
              style={{
                background: 'radial-gradient(circle, rgba(6, 182, 212, 0.5) 0%, transparent 70%)',
                animation: 'float3 20s ease-in-out infinite'
              }}
            />

            {/* Grid pattern */}
            <div
              className="absolute inset-0 opacity-[0.03]"
              style={{
                backgroundImage: `
                  linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                  linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
                `,
                backgroundSize: '50px 50px'
              }}
            />

            {/* Floating particles */}
            <div className="absolute inset-0">
              <div className="absolute w-1 h-1 bg-blue-400/40 rounded-full opacity-60" style={{ top: '15%', left: '10%', animation: 'particle 5s ease-in-out infinite' }} />
              <div className="absolute w-1 h-1 bg-blue-400/40 rounded-full opacity-40" style={{ top: '25%', left: '85%', animation: 'particle 6s ease-in-out 0.5s infinite' }} />
              <div className="absolute w-1 h-1 bg-cyan-400/40 rounded-full opacity-50" style={{ top: '45%', left: '5%', animation: 'particle 7s ease-in-out 1s infinite' }} />
              <div className="absolute w-1 h-1 bg-blue-400/40 rounded-full opacity-30" style={{ top: '65%', left: '90%', animation: 'particle 5.5s ease-in-out 1.5s infinite' }} />
              <div className="absolute w-1 h-1 bg-purple-400/40 rounded-full opacity-50" style={{ top: '80%', left: '15%', animation: 'particle 6.5s ease-in-out 0.3s infinite' }} />
              <div className="absolute w-1 h-1 bg-blue-400/40 rounded-full opacity-40" style={{ top: '10%', left: '50%', animation: 'particle 5s ease-in-out 0.8s infinite' }} />
              <div className="absolute w-1 h-1 bg-cyan-400/40 rounded-full opacity-60" style={{ top: '35%', left: '70%', animation: 'particle 7s ease-in-out 1.2s infinite' }} />
              <div className="absolute w-1 h-1 bg-blue-400/40 rounded-full opacity-30" style={{ top: '55%', left: '25%', animation: 'particle 6s ease-in-out 0.6s infinite' }} />
            </div>
          </div>

          {/* Main Content */}
          <div className="relative z-10 text-center px-4 sm:px-8 max-w-4xl mx-auto">
            {/* Logo Section */}
            <div className={`relative transition-all duration-1000 ${showLanding ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-8'}`}>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-40 h-40 bg-blue-500/20 rounded-full blur-3xl animate-pulse" />
              </div>

              <div className="relative mx-auto w-28 h-28 sm:w-32 sm:h-32 mb-8">
                <div
                  className="absolute -inset-2 rounded-full border-2 border-transparent"
                  style={{
                    background: 'linear-gradient(180deg, transparent 0%, rgba(59, 130, 246, 0.3) 50%, transparent 100%)',
                    animation: 'spin 4s linear infinite'
                  }}
                />
                <div className="absolute inset-0 rounded-full bg-gradient-to-br from-blue-500 via-blue-600 to-purple-600 p-1 shadow-2xl shadow-blue-500/30">
                  <div className="w-full h-full rounded-full bg-white dark:bg-slate-900 flex items-center justify-center overflow-hidden">
                    <Image
                      src="/images/moe-logo.png"
                      alt="Ministry of Education Logo"
                      width={120}
                      height={120}
                      className="w-full h-full object-cover scale-110"
                      priority
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Text Content */}
            <div className={`space-y-4 transition-all duration-1000 delay-200 ${showLanding ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
              <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold bg-gradient-to-r from-blue-700 via-blue-600 to-blue-800 dark:from-white dark:via-blue-100 dark:to-cyan-200 bg-clip-text text-transparent leading-tight">
                Ministry of Education
              </h1>
              <div className="h-1 w-20 mx-auto bg-gradient-to-r from-blue-500 via-cyan-400 to-purple-500 rounded-full" />
              <h2 className="text-xl sm:text-2xl md:text-3xl text-blue-700 dark:text-blue-300/90 font-medium">
                Headteacher Reporting Portal
              </h2>
              <p className="text-slate-600 dark:text-slate-400 text-lg">
                Republic of Guyana
              </p>
            </div>

            {/* CTA Buttons */}
            <div className={`flex flex-col sm:flex-row items-center justify-center gap-4 mt-10 transition-all duration-1000 delay-400 ${showLanding ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
              <Button
                size="lg"
                onClick={() => router.push('/auth')}
                className="group px-8 py-6 text-lg bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-all duration-300"
              >
                Access Portal
                <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={scrollToRankings}
                className="px-8 py-6 text-lg border-slate-300 dark:border-slate-700 bg-white/50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-700/50 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
              >
                View Rankings
                <ChevronDown className="ml-2 h-5 w-5" />
              </Button>
            </div>

            {/* Feature pills */}
            <div className={`flex flex-wrap justify-center gap-3 mt-8 transition-all duration-1000 delay-600 ${showLanding ? 'opacity-100' : 'opacity-0'}`}>
              {['Secure', 'Real-time Analytics', 'AI-Powered Insights'].map((feature) => (
                <span
                  key={feature}
                  className="px-4 py-1.5 text-xs font-medium text-blue-700 dark:text-blue-300/80 bg-blue-500/10 border border-blue-500/20 rounded-full flex items-center gap-2"
                >
                  {feature === 'AI-Powered Insights' && <Sparkles className="h-3 w-3" />}
                  {feature}
                </span>
              ))}
            </div>
          </div>

          {/* Scroll indicator */}
          <div className={`absolute bottom-8 left-1/2 -translate-x-1/2 z-20 transition-all duration-1000 delay-800 ${showLanding ? 'opacity-100' : 'opacity-0'}`}>
            <button
              onClick={scrollToRankings}
              className="flex flex-col items-center gap-2 text-slate-500 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
            >
              <span className="text-xs uppercase tracking-wider">Scroll to explore</span>
              <ChevronDown className="h-5 w-5 animate-bounce" />
            </button>
          </div>
        </section>

        {/* Rankings Section */}
        <section id="rankings" className="relative py-20">
          <div className="absolute inset-0 bg-gradient-to-b from-slate-100 via-blue-50/50 to-slate-100 dark:from-slate-950 dark:via-blue-950/10 dark:to-slate-950 transition-colors duration-300" />

          {/* Decorative elements */}
          <div className="absolute top-0 left-1/4 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-purple-500/5 rounded-full blur-3xl" />

          <div className="relative z-10 px-4 sm:px-8">
            <TopSchoolsCarousel />
          </div>
        </section>

        {/* Footer CTA Section */}
        <section className="relative py-20 border-t border-slate-200 dark:border-slate-800/50">
          <div className="absolute inset-0 bg-gradient-to-t from-blue-100/50 dark:from-blue-950/20 to-transparent transition-colors duration-300" />
          <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-8 text-center">
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white mb-4">
              Ready to Access the Portal?
            </h2>
            <p className="text-slate-600 dark:text-slate-400 mb-8 max-w-2xl mx-auto">
              Sign in to submit reports, view detailed analytics, and track your school's performance over time.
            </p>
            <Button
              size="lg"
              onClick={() => router.push('/auth')}
              className="group px-10 py-6 text-lg bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-all duration-300"
            >
              Sign In to Portal
              <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </Button>
          </div>
        </section>

        {/* Footer */}
        <footer className="relative py-8 border-t border-slate-200 dark:border-slate-800/50">
          <div className="max-w-6xl mx-auto px-4 sm:px-8 text-center">
            <p className="text-sm text-slate-600 dark:text-slate-500">
              &copy; {new Date().getFullYear()} Ministry of Education, Republic of Guyana. All rights reserved.
            </p>
          </div>
        </footer>
      </div>

      {/* Animations */}
      <style jsx>{`
        @keyframes float1 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(50px, -30px) scale(1.1); }
        }
        @keyframes float2 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(-40px, 40px) scale(1.1); }
        }
        @keyframes float3 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(-30px, -50px) scale(1.05); }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }
        @keyframes pulse-dot {
          0%, 80%, 100% {
            transform: scale(0.6);
            opacity: 0.4;
          }
          40% {
            transform: scale(1);
            opacity: 1;
          }
        }
        @keyframes particle {
          0%, 100% {
            transform: translateY(0) translateX(0);
            opacity: 0.3;
          }
          50% {
            transform: translateY(-20px) translateX(10px);
            opacity: 0.6;
          }
        }
      `}</style>
    </div>
  )
}
