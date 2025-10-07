import { useEffect, useRef, useCallback, useState } from 'react'
import { useDebounceValue } from './use-debounced-search'

interface AutoSaveOptions {
  key: string
  data: any
  onSave?: (data: any) => Promise<void>
  delay?: number
  enabled?: boolean
  maxRetries?: number
}

export function useAutoSave({
  key,
  data,
  onSave,
  delay = 5000,
  enabled = false, // Disabled by default to prevent caching
  maxRetries = 3
}: AutoSaveOptions) {
  const debouncedData = useDebounceValue(data, delay)
  const lastSavedData = useRef<any>(null)
  const isInitialLoad = useRef(true)
  const retryCount = useRef(0)
  const [isSaving, setIsSaving] = useState(false)

  // Save to localStorage
  const saveToLocalStorage = useCallback((dataToSave: any) => {
    try {
      localStorage.setItem(key, JSON.stringify({
        data: dataToSave,
        timestamp: Date.now(),
        version: '1.0'
      }))
    } catch (error) {
      console.error('Failed to save to localStorage:', error)
    }
  }, [key])

  // Load from localStorage
  const loadFromLocalStorage = useCallback(() => {
    try {
      const saved = localStorage.getItem(key)
      if (saved) {
        const parsed = JSON.parse(saved)
        // Check if data is not too old (24 hours)
        const isRecent = (Date.now() - parsed.timestamp) < 24 * 60 * 60 * 1000
        if (isRecent && parsed.data) {
          return parsed.data
        }
      }
    } catch (error) {
      console.error('Failed to load from localStorage:', error)
    }
    return null
  }, [key])

  // Clear localStorage
  const clearLocalStorage = useCallback(() => {
    try {
      localStorage.removeItem(key)
    } catch (error) {
      console.error('Failed to clear localStorage:', error)
    }
  }, [key])

  // Auto-save with retry logic
  const performSave = useCallback(async (dataToSave: any) => {
    if (!onSave) {
      lastSavedData.current = dataToSave
      return
    }

    setIsSaving(true)
    try {
      await onSave(dataToSave)
      lastSavedData.current = dataToSave
      retryCount.current = 0 // Reset retry count on success
    } catch (error) {
      console.error('Auto-save failed:', error)
      
      // Retry logic
      if (retryCount.current < maxRetries) {
        retryCount.current++
        // Exponential backoff: wait longer for each retry
        const retryDelay = Math.min(1000 * Math.pow(2, retryCount.current), 10000)
        
        setTimeout(() => {
          performSave(dataToSave)
        }, retryDelay)
      } else {
        // Max retries reached, reset counter for next attempt
        retryCount.current = 0
      }
    } finally {
      setIsSaving(false)
    }
  }, [onSave, maxRetries])

  // Auto-save effect (disabled by default)
  useEffect(() => {
    if (!enabled || isInitialLoad.current) {
      isInitialLoad.current = false
      return
    }

    // Skip if currently saving
    if (isSaving) {
      return
    }

    // Check if data has actually changed
    if (JSON.stringify(debouncedData) === JSON.stringify(lastSavedData.current)) {
      return
    }

    // Check if there's meaningful data to save (not just empty fields)
    const hasMeaningfulData = debouncedData && typeof debouncedData === 'object' && Object.values(debouncedData || {}).some(value => {
      if (typeof value === 'string') return value.trim().length > 0
      if (typeof value === 'number') return value !== 0
      if (typeof value === 'boolean') return true
      if (Array.isArray(value)) return value.some(item => 
        typeof item === 'object' && item !== null ? 
          Object.values(item).some(v => v && v.toString().trim()) : 
          item !== null && item !== undefined && item.toString().trim()
      )
      return value !== null && value !== undefined && value !== ''
    })

    if (!hasMeaningfulData) {
      return
    }

    // Save to localStorage immediately
    saveToLocalStorage(debouncedData)

    // Save to server with retry logic
    performSave(debouncedData)
  }, [debouncedData, enabled, saveToLocalStorage, performSave, isSaving])

  return {
    loadFromLocalStorage,
    clearLocalStorage,
    saveToLocalStorage,
    isSaving
  }
}
