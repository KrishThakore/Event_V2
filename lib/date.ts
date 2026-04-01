/**
 * Date and Time utilities for Indian Standard Time (IST)
 * All dates should be stored in UTC in the database but displayed in IST
 */

/**
 * Formats a date string to Indian Standard Time
 * @param dateString - ISO date string or Date object
 * @returns Formatted date string in IST (e.g., "20 Jan 2026, 07:00 PM IST")
 */
export function formatToIST(dateString: string | Date): string {
  const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
  
  if (isNaN(date.getTime())) {
    return 'Invalid Date';
  }

  return date.toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "short", 
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true
  }) + ' IST';
}

/**
 * Formats a date string to IST with short format (no IST suffix)
 * @param dateString - ISO date string or Date object
 * @returns Formatted date string in IST (e.g., "20 Jan 2026, 07:00 PM")
 */
export function formatToISTShort(dateString: string | Date): string {
  const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
  
  if (isNaN(date.getTime())) {
    return 'Invalid Date';
  }

  return date.toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "short",
    year: "numeric", 
    hour: "2-digit",
    minute: "2-digit",
    hour12: true
  });
}

/**
 * Formats only the date part in IST
 * @param dateString - ISO date string or Date object
 * @returns Formatted date in IST (e.g., "20 Jan 2026")
 */
export function formatDateIST(dateString: string | Date): string {
  const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
  
  if (isNaN(date.getTime())) {
    return 'Invalid Date';
  }

  return date.toLocaleDateString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
}

/**
 * Formats only the time part in IST
 * @param dateString - ISO date string or Date object
 * @returns Formatted time in IST (e.g., "07:00 PM")
 */
export function formatTimeIST(dateString: string | Date): string {
  const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
  
  if (isNaN(date.getTime())) {
    return 'Invalid Date';
  }

  return date.toLocaleTimeString("en-IN", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true
  }).toUpperCase();
}

/**
 * Formats date for input fields (YYYY-MM-DD format) in IST
 * @param dateString - ISO date string or Date object
 * @returns Date string in YYYY-MM-DD format
 */
export function formatDateForInput(dateString: string | Date): string {
  const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
  
  if (isNaN(date.getTime())) {
    return '';
  }

  // Convert to IST date to avoid date shift issues
  const istDate = new Date(date.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
  
  return istDate.toISOString().split('T')[0];
}

/**
 * Formats time for input fields (HH:MM format) in IST
 * @param dateString - ISO date string or Date object
 * @returns Time string in HH:MM format
 */
export function formatTimeForInput(dateString: string | Date): string {
  const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
  
  if (isNaN(date.getTime())) {
    return '';
  }

  const istDate = new Date(date.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
  
  return istDate.toTimeString().slice(0, 5);
}

export function getISTDateYYYYMMDD(date: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(date);

  const year = parts.find((p) => p.type === 'year')?.value;
  const month = parts.find((p) => p.type === 'month')?.value;
  const day = parts.find((p) => p.type === 'day')?.value;

  if (!year || !month || !day) return '';
  return `${year}-${month}-${day}`;
}

export function getISTStartOfDayUTCISOString(date: Date = new Date()): string {
  const ymd = getISTDateYYYYMMDD(date);
  if (!ymd) return '';
  return new Date(`${ymd}T00:00:00+05:30`).toISOString();
}

/**
 * Parses a time string (HH:MM) into a Date object for Prisma @db.Time() columns.
 * @param timeString - Time string in HH:MM format
 * @returns Date object with the specified time
 */
export function parseTimeToDate(timeString: string | Date): Date {
  if (timeString instanceof Date) return timeString;
  // Use a fixed date part as Postgres @db.Time() only cares about the time
  const date = new Date(`2000-01-01T${timeString}:00`);
  if (isNaN(date.getTime())) {
    throw new Error(`Invalid time format: ${timeString}`);
  }
  return date;
}

