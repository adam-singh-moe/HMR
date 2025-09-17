/**
 * Utility functions for formatting and displaying report status values
 */

export type ReportStatus = 'draft' | 'submitted' | 'reviewed'

/**
 * Formats a report status for display by capitalizing the first letter
 * @param status - The raw status from the database
 * @returns The formatted status for display
 */
export function formatStatusForDisplay(status: string): string {
  if (!status) return ''
  
  // Capitalize first letter and keep the rest lowercase
  return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase()
}

/**
 * Gets the appropriate badge variant for a given status
 * @param status - The raw status from the database
 * @returns The appropriate badge variant
 */
export function getStatusBadgeVariant(status: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'submitted':
      return 'default'
    case 'reviewed':
      return 'default'
    case 'draft':
      return 'outline'
    default:
      return 'secondary'
  }
}
