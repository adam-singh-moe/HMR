import { useState, useCallback, useEffect } from 'react'

interface ProgressState {
  currentSection: number
  completedSections: number[]
  lastActiveSection: number
  sectionProgress: Record<number, number> // percentage completion for each section
}

export function useReportProgress(reportId: string | null, totalSections: number) {
  const [progressState, setProgressState] = useState<ProgressState>({
    currentSection: 0,
    completedSections: [],
    lastActiveSection: 0,
    sectionProgress: {}
  })

  const progressKey = `report-progress-${reportId || 'draft'}`

  // Load progress from localStorage
  const loadProgress = useCallback(() => {
    try {
      const saved = localStorage.getItem(progressKey)
      if (saved) {
        const parsed = JSON.parse(saved)
        const isRecent = (Date.now() - parsed.timestamp) < 24 * 60 * 60 * 1000
        if (isRecent && parsed.progress) {
          setProgressState(parsed.progress)
          return parsed.progress
        }
      }
    } catch (error) {
      console.error('Failed to load progress:', error)
    }
    return null
  }, [progressKey])

  // Save progress to localStorage
  const saveProgress = useCallback((newProgress: Partial<ProgressState>) => {
    try {
      setProgressState(prevState => {
        const updatedProgress = { ...prevState, ...newProgress }
        
        localStorage.setItem(progressKey, JSON.stringify({
          progress: updatedProgress,
          timestamp: Date.now(),
          version: '1.0'
        }))
        
        return updatedProgress
      })
    } catch (error) {
      console.error('Failed to save progress:', error)
    }
  }, [progressKey])

  // Mark section as completed
  const markSectionComplete = useCallback((sectionIndex: number) => {
    setProgressState(prevState => {
      const newCompletedSections = [...prevState.completedSections]
      if (!newCompletedSections.includes(sectionIndex)) {
        newCompletedSections.push(sectionIndex)
      }
      
      const updatedProgress = {
        ...prevState,
        completedSections: newCompletedSections,
        lastActiveSection: sectionIndex,
        sectionProgress: {
          ...prevState.sectionProgress,
          [sectionIndex]: 100
        }
      }
      
      try {
        localStorage.setItem(progressKey, JSON.stringify({
          progress: updatedProgress,
          timestamp: Date.now(),
          version: '1.0'
        }))
      } catch (error) {
        console.error('Failed to save progress:', error)
      }
      
      return updatedProgress
    })
  }, [progressKey])

  // Update section progress (0-100)
  const updateSectionProgress = useCallback((sectionIndex: number, progress: number) => {
    setProgressState(prevState => {
      const updatedProgress = {
        ...prevState,
        sectionProgress: {
          ...prevState.sectionProgress,
          [sectionIndex]: Math.max(0, Math.min(100, progress))
        }
      }
      
      try {
        localStorage.setItem(progressKey, JSON.stringify({
          progress: updatedProgress,
          timestamp: Date.now(),
          version: '1.0'
        }))
      } catch (error) {
        console.error('Failed to save progress:', error)
      }
      
      return updatedProgress
    })
  }, [progressKey])

  // Set current section
  const setCurrentSection = useCallback((sectionIndex: number) => {
    setProgressState(prevState => {
      const updatedProgress = {
        ...prevState,
        currentSection: sectionIndex,
        lastActiveSection: sectionIndex
      }
      
      try {
        localStorage.setItem(progressKey, JSON.stringify({
          progress: updatedProgress,
          timestamp: Date.now(),
          version: '1.0'
        }))
      } catch (error) {
        console.error('Failed to save progress:', error)
      }
      
      return updatedProgress
    })
  }, [progressKey])

  // Get next incomplete section
  const getNextIncompleteSection = useCallback(() => {
    for (let i = 0; i < totalSections; i++) {
      if (!progressState.completedSections.includes(i)) {
        return i
      }
    }
    return totalSections - 1 // Return last section if all are complete
  }, [progressState.completedSections, totalSections])

  // Calculate overall progress
  const getOverallProgress = useCallback(() => {
    const totalProgress = Object.values(progressState.sectionProgress).reduce((sum, progress) => sum + progress, 0)
    return Math.round(totalProgress / totalSections)
  }, [progressState.sectionProgress, totalSections])

  // Clear progress (when report is submitted)
  const clearProgress = useCallback(() => {
    try {
      localStorage.removeItem(progressKey)
      setProgressState({
        currentSection: 0,
        completedSections: [],
        lastActiveSection: 0,
        sectionProgress: {}
      })
    } catch (error) {
      console.error('Failed to clear progress:', error)
    }
  }, [progressKey])

  // Resume from last position
  const resumeFromLastPosition = useCallback(() => {
    const savedProgress = loadProgress()
    if (savedProgress) {
      setProgressState(savedProgress)
      return true
    }
    return false
  }, [loadProgress])

  // Initialize progress on component mount
  useEffect(() => {
    loadProgress()
  }, [loadProgress])

  return {
    progressState,
    markSectionComplete,
    updateSectionProgress,
    setCurrentSection,
    getNextIncompleteSection,
    getOverallProgress,
    clearProgress,
    resumeFromLastPosition,
    loadProgress
  }
}
