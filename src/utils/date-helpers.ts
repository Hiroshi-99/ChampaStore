/**
 * Format a date string into a readable format
 * @param dateString The date string to format
 * @param options Optional formatting options
 * @returns Formatted date string
 */
export function formatDate(
  dateString: string,
  options: Intl.DateTimeFormatOptions = {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    hour12: true
  }
): string {
  if (!dateString) return '';
  
  try {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', options);
  } catch (error) {
    console.error('Date formatting error:', error);
    return dateString; // Return original string if formatting fails
  }
} 