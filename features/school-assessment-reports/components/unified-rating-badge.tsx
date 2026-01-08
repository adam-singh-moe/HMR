"use client"

import { Badge } from "@/components/ui/badge"
import { 
  RatingLevel, 
  TAPSRatingGrade, 
  RATING_THRESHOLDS 
} from "../types"
import { getRatingGrade, assignTAPSRatingGrade } from "../actions/scoring"

// ============================================================================
// CONSTANTS
// ============================================================================

export const RATING_DISPLAY_LABELS: Record<RatingLevel, string> = {
  'outstanding': 'Outstanding',
  'very_good': 'Very Good',
  'good': 'Good',
  'satisfactory': 'Satisfactory',
  'needs_improvement': 'Needs Improvement',
}

export const RATING_BADGE_COLORS: Record<RatingLevel, string> = {
  'outstanding': 'bg-emerald-100 text-emerald-800 border-emerald-200',
  'very_good': 'bg-blue-100 text-blue-800 border-blue-200',
  'good': 'bg-amber-100 text-amber-800 border-amber-200',
  'satisfactory': 'bg-orange-100 text-orange-800 border-orange-200',
  'needs_improvement': 'bg-red-100 text-red-800 border-red-200',
}

export const TAPS_GRADE_BADGE_COLORS: Record<TAPSRatingGrade, string> = {
  'A': 'bg-green-100 text-green-800 border-green-200',
  'B': 'bg-blue-100 text-blue-800 border-blue-200',
  'C': 'bg-amber-100 text-amber-800 border-amber-200',
  'D': 'bg-orange-100 text-orange-800 border-orange-200',
  'E': 'bg-red-100 text-red-800 border-red-200',
}

export const TAPS_GRADE_DISPLAY_LABELS: Record<TAPSRatingGrade, string> = {
  'A': 'Grade A - Outstanding',
  'B': 'Grade B - High Achieving',
  'C': 'Grade C - Standard',
  'D': 'Grade D - Struggling',
  'E': 'Grade E - Critical',
}

// ============================================================================
// COMPONENT
// ============================================================================

interface UnifiedRatingBadgeProps {
  ratingLevel?: RatingLevel | null
  tapsRatingGrade?: TAPSRatingGrade | null
  totalScore?: number | null
  isTAPS?: boolean
  showLabel?: boolean
  className?: string
}

export function UnifiedRatingBadge({ 
  ratingLevel, 
  tapsRatingGrade, 
  totalScore,
  isTAPS = false,
  showLabel = true,
  className = ""
}: UnifiedRatingBadgeProps) {
  let grade: TAPSRatingGrade | null = null;
  let label: string = '-';
  let colorClass: string = '';

  // Normalize totalScore to a number if it's a string
  const numericScore = typeof totalScore === 'string' ? parseFloat(totalScore) : totalScore;
  const hasScore = numericScore !== null && numericScore !== undefined && !isNaN(numericScore);

  // 1. Try to use TAPS grade if it exists
  if (isTAPS && tapsRatingGrade) {
    grade = tapsRatingGrade;
    label = TAPS_GRADE_DISPLAY_LABELS[grade] || `Grade ${grade}`;
    colorClass = TAPS_GRADE_BADGE_COLORS[grade] || 'bg-gray-100 text-gray-800';
  } 
  // 2. Try to use rating level (Primary/Nursery)
  if (!grade && ratingLevel) {
    const normalizedLevel = ratingLevel.toLowerCase().replace(' ', '_') as RatingLevel;
    const levelKey = normalizedLevel.toUpperCase() as keyof typeof RATING_THRESHOLDS;
    
    const possibleGrade = RATING_THRESHOLDS[levelKey]?.grade as TAPSRatingGrade;
    if (possibleGrade) {
      grade = possibleGrade;
      label = RATING_DISPLAY_LABELS[normalizedLevel] || ratingLevel;
      colorClass = RATING_BADGE_COLORS[normalizedLevel] || 'bg-gray-100 text-gray-800';
    }
  }

  // 3. Fallback to calculating from score if provided
  if (!grade && hasScore) {
    if (isTAPS) {
      grade = assignTAPSRatingGrade(numericScore);
      label = TAPS_GRADE_DISPLAY_LABELS[grade] || `Grade ${grade}`;
      colorClass = TAPS_GRADE_BADGE_COLORS[grade] || 'bg-gray-100 text-gray-800';
    } else {
      const calculatedGrade = getRatingGrade(numericScore);
      grade = calculatedGrade as TAPSRatingGrade;
      
      // Find the rating level that matches this grade for Primary
      const levelEntry = Object.entries(RATING_THRESHOLDS).find(([_, val]) => val.grade === calculatedGrade);
      if (levelEntry) {
        const key = levelEntry[0].toLowerCase() as RatingLevel;
        label = RATING_DISPLAY_LABELS[key] || levelEntry[1].label;
        colorClass = RATING_BADGE_COLORS[key] || 'bg-gray-100 text-gray-800';
      } else {
        label = `Grade ${calculatedGrade}`;
        colorClass = 'bg-gray-100 text-gray-800';
      }
    }
  }

  if (!grade) {
    return <span className="text-muted-foreground">-</span>;
  }

  const bgClass = colorClass.split(' ')[0] || '';
  const textClass = colorClass.split(' ')[1] || '';

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className={`h-6 w-6 rounded flex items-center justify-center text-[10px] font-bold shrink-0 ${bgClass} ${textClass}`}>
        {grade}
      </div>
      {showLabel && (
        <Badge 
          variant="outline" 
          className={`${bgClass} ${textClass} border-0 font-medium whitespace-nowrap`}
        >
          {label}
        </Badge>
      )}
    </div>
  );
}
