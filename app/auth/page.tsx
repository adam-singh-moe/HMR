"use client"

import { AuthForm } from "@/components/auth-form"
import { useEffect, useState } from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { useTheme } from "next-themes"
import { Moon, Sun, ArrowLeft } from "lucide-react"

export default function AuthPage() {
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const { theme, setTheme } = useTheme()

  useEffect(() => {
    setMounted(true)
  }, [])

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark")
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row overflow-hidden bg-white dark:bg-slate-950 transition-colors duration-300">
      {/* Back Button */}
      <button
        onClick={() => router.push('/')}
        className="fixed top-4 left-4 z-50 p-3 rounded-full bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 transition-all duration-300 shadow-lg hover:shadow-xl border border-slate-300 dark:border-slate-700 flex items-center gap-2"
        aria-label="Back to landing"
      >
        <ArrowLeft className="h-5 w-5 text-slate-700 dark:text-slate-300" />
      </button>

      {/* Theme Toggle Button */}
      <button
        onClick={toggleTheme}
        className="fixed top-4 right-4 z-50 p-3 rounded-full bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 transition-all duration-300 shadow-lg hover:shadow-xl border border-slate-300 dark:border-slate-700"
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

      {/* Left Side - Animated Hero Section */}
      <div className="relative lg:w-[55%] min-h-[40vh] lg:min-h-screen overflow-hidden">
        {/* Animated gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-blue-100 to-slate-100 dark:from-slate-900 dark:via-blue-950 dark:to-slate-900 transition-colors duration-300" />
        
        {/* Animated mesh gradient overlay */}
        <div className="absolute inset-0 opacity-60">
          <div 
            className="absolute inset-0 animate-gradient-shift"
            style={{
              background: `
                radial-gradient(circle at 20% 20%, rgba(59, 130, 246, 0.4) 0%, transparent 50%),
                radial-gradient(circle at 80% 80%, rgba(147, 51, 234, 0.3) 0%, transparent 50%),
                radial-gradient(circle at 40% 70%, rgba(6, 182, 212, 0.25) 0%, transparent 40%)
              `
            }}
          />
        </div>

        {/* Floating geometric shapes */}
        <div className="absolute inset-0 overflow-hidden">
          {/* Large rotating hexagon */}
          <div 
            className={`absolute top-1/4 left-1/4 w-64 h-64 transition-all duration-1000 ${mounted ? 'opacity-20 rotate-0' : 'opacity-0 rotate-45'}`}
            style={{ animationDelay: '0.2s' }}
          >
            <svg viewBox="0 0 100 100" className="w-full h-full animate-spin-slow">
              <polygon 
                points="50,5 95,27.5 95,72.5 50,95 5,72.5 5,27.5" 
                fill="none" 
                stroke="rgba(59, 130, 246, 0.5)" 
                strokeWidth="0.5"
              />
            </svg>
          </div>
          
          {/* Floating circles */}
          <div className={`absolute top-1/6 right-1/4 w-4 h-4 rounded-full bg-cyan-400/40 animate-float-slow ${mounted ? 'opacity-100' : 'opacity-0'} transition-opacity duration-1000`} style={{ animationDelay: '0s' }} />
          <div className={`absolute top-1/3 right-1/6 w-2 h-2 rounded-full bg-blue-400/50 animate-float-slow ${mounted ? 'opacity-100' : 'opacity-0'} transition-opacity duration-1000`} style={{ animationDelay: '0.5s' }} />
          <div className={`absolute bottom-1/4 left-1/6 w-3 h-3 rounded-full bg-purple-400/40 animate-float-slow ${mounted ? 'opacity-100' : 'opacity-0'} transition-opacity duration-1000`} style={{ animationDelay: '1s' }} />
          <div className={`absolute bottom-1/3 right-1/3 w-2 h-2 rounded-full bg-cyan-300/50 animate-float-slow ${mounted ? 'opacity-100' : 'opacity-0'} transition-opacity duration-1000`} style={{ animationDelay: '1.5s' }} />
          
          {/* Animated lines */}
          <svg className="absolute inset-0 w-full h-full" style={{ opacity: mounted ? 0.15 : 0, transition: 'opacity 1s' }}>
            <line x1="0%" y1="30%" x2="100%" y2="60%" stroke="url(#lineGradient1)" strokeWidth="1" className="animate-draw-line" />
            <line x1="20%" y1="0%" x2="80%" y2="100%" stroke="url(#lineGradient2)" strokeWidth="1" className="animate-draw-line-delayed" />
            <defs>
              <linearGradient id="lineGradient1" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="rgba(59, 130, 246, 0)" />
                <stop offset="50%" stopColor="rgba(59, 130, 246, 0.8)" />
                <stop offset="100%" stopColor="rgba(59, 130, 246, 0)" />
              </linearGradient>
              <linearGradient id="lineGradient2" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="rgba(147, 51, 234, 0)" />
                <stop offset="50%" stopColor="rgba(147, 51, 234, 0.6)" />
                <stop offset="100%" stopColor="rgba(147, 51, 234, 0)" />
              </linearGradient>
            </defs>
          </svg>
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-center items-center h-full px-8 py-12 lg:py-0">
          {/* Logo with glow effect */}
          <div className={`relative mb-8 transition-all duration-1000 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <div className="absolute inset-0 blur-2xl bg-blue-500/30 rounded-full scale-150" />
            <div className="relative w-28 h-28 lg:w-36 lg:h-36 rounded-full bg-gradient-to-br from-blue-500 via-blue-600 to-purple-600 p-1 shadow-2xl shadow-blue-500/30">
              <div className="w-full h-full rounded-full bg-white flex items-center justify-center overflow-hidden">
                <Image
                  src="/images/moe-logo.png"
                  alt="Ministry of Education Logo"
                  width={140}
                  height={140}
                  className="w-full h-full object-cover scale-110"
                  priority
                />
              </div>
            </div>
          </div>

          {/* Title with staggered animation */}
          <div className="text-center max-w-lg">
            <h1 
              className={`text-3xl lg:text-5xl font-bold bg-gradient-to-r from-blue-700 via-blue-600 to-blue-800 dark:from-white dark:via-blue-100 dark:to-cyan-200 bg-clip-text text-transparent mb-4 tracking-tight transition-all duration-1000 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
              style={{ transitionDelay: '0.2s' }}
            >
              Ministry of Education
            </h1>
            <div 
              className={`h-1 w-24 mx-auto bg-gradient-to-r from-blue-500 via-cyan-400 to-purple-500 rounded-full mb-6 transition-all duration-1000 ${mounted ? 'opacity-100 scale-x-100' : 'opacity-0 scale-x-0'}`}
              style={{ transitionDelay: '0.4s' }}
            />
            <h2 
              className={`text-lg lg:text-xl text-blue-700 dark:text-blue-200/90 font-medium mb-3 transition-all duration-1000 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
              style={{ transitionDelay: '0.5s' }}
            >
              School Headteacher's Reporting Portal
            </h2>
            <p 
              className={`text-sm lg:text-base text-slate-600 dark:text-slate-400 transition-all duration-1000 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
              style={{ transitionDelay: '0.6s' }}
            >
              Republic of Guyana
            </p>
          </div>

          {/* Feature highlights */}
          <div className={`mt-12 hidden lg:flex gap-8 transition-all duration-1000 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`} style={{ transitionDelay: '0.8s' }}>
            <div className="flex items-center gap-3 text-slate-700 dark:text-slate-300">
              <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center border border-blue-500/30">
                <svg className="w-5 h-5 text-blue-500 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <span className="text-sm font-medium">Secure Reporting</span>
            </div>
            <div className="flex items-center gap-3 text-slate-700 dark:text-slate-300">
              <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center border border-purple-500/30">
                <svg className="w-5 h-5 text-purple-500 dark:text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <span className="text-sm font-medium">Real-time Analytics</span>
            </div>
            <div className="flex items-center gap-3 text-slate-700 dark:text-slate-300">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/20 flex items-center justify-center border border-cyan-500/30">
                <svg className="w-5 h-5 text-cyan-500 dark:text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <span className="text-sm font-medium">School Management</span>
            </div>
          </div>
        </div>

        {/* Bottom decorative wave */}
        <div className="absolute bottom-0 left-0 right-0 h-16 lg:hidden">
          <svg viewBox="0 0 1200 120" preserveAspectRatio="none" className="w-full h-full">
            <path 
              d="M0,0V46.29c47.79,22.2,103.59,32.17,158,28,70.36-5.37,136.33-33.31,206.8-37.5C438.64,32.43,512.34,53.67,583,72.05c69.27,18,138.3,24.88,209.4,13.08,36.15-6,69.85-17.84,104.45-29.34C989.49,25,1113-14.29,1200,52.47V0Z" 
              className="fill-white dark:fill-slate-950"
              opacity="1"
            />
          </svg>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="lg:w-[45%] flex items-center justify-center p-6 lg:p-12 bg-white dark:bg-slate-950 transition-colors duration-300">
        <div className={`w-full max-w-md transition-all duration-1000 ${mounted ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-8'}`} style={{ transitionDelay: '0.3s' }}>
          <AuthForm />
        </div>
      </div>

      {/* Custom styles */}
      <style jsx>{`
        @keyframes gradient-shift {
          0%, 100% { transform: scale(1) rotate(0deg); }
          50% { transform: scale(1.1) rotate(3deg); }
        }
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes float-slow {
          0%, 100% { transform: translateY(0) translateX(0); }
          33% { transform: translateY(-15px) translateX(8px); }
          66% { transform: translateY(8px) translateX(-8px); }
        }
        @keyframes draw-line {
          0% { stroke-dashoffset: 2000; }
          100% { stroke-dashoffset: 0; }
        }
        .animate-gradient-shift {
          animation: gradient-shift 15s ease-in-out infinite;
        }
        .animate-spin-slow {
          animation: spin-slow 30s linear infinite;
        }
        .animate-float-slow {
          animation: float-slow 6s ease-in-out infinite;
        }
        .animate-draw-line {
          stroke-dasharray: 2000;
          animation: draw-line 3s ease-in-out infinite alternate;
        }
        .animate-draw-line-delayed {
          stroke-dasharray: 2000;
          animation: draw-line 4s ease-in-out 1s infinite alternate;
        }
      `}</style>
    </div>
  )
}
