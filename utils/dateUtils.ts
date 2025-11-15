
/**
 * Parses a date string from various formats into a Date object.
 * Returns null if the date is invalid.
 * Handles 'YYYY-MM-DD' and 'DD/MM/YYYY' formats to prevent ambiguity.
 */
export const parseDate = (dateString: string | null | undefined): Date | null => {
    if (!dateString || !dateString.trim()) {
        return null;
    }
    const trimmedDate = dateString.trim();

    // Manually parse common formats to avoid the ambiguity of `new Date(string)`.
    const parts = trimmedDate.split(/[-/]/);
    if (parts.length === 3) {
        const [p1, p2, p3] = parts.map(p => parseInt(p, 10));
        if (!isNaN(p1) && !isNaN(p2) && !isNaN(p3)) {
            let year, month, day;
            
            // Case 1: YYYY-MM-DD or YYYY/MM/DD
            if (p1 > 1000) { 
                year = p1; month = p2; day = p3;
            } 
            // Case 2: DD-MM-YYYY or DD/MM/YYYY (fixes CSV import bug)
            else if (p3 > 1000) { 
                day = p1; month = p2; year = p3;
            }

            if (year && month && day) {
                // Date constructor month is 0-indexed (0=Jan, 1=Feb, etc.)
                const manualDate = new Date(year, month - 1, day);
                
                // Verify that the created date is valid and wasn't rolled over by the Date constructor.
                // e.g., new Date(2024, 1, 30) would become March 1, 2024, which we want to prevent.
                if (!isNaN(manualDate.getTime()) && manualDate.getFullYear() === year && manualDate.getMonth() === month - 1 && manualDate.getDate() === day) {
                    return manualDate;
                }
            }
        }
    }
    
    // Fallback for other potential formats that `new Date` might handle correctly (e.g., ISO with time).
    // This is less reliable for ambiguous formats but is a useful catch-all.
    try {
        const fallbackDate = new Date(trimmedDate);
        if (!isNaN(fallbackDate.getTime())) {
            const year = fallbackDate.getFullYear();
            if (year > 1900 && year < 2100) {
                return fallbackDate;
            }
        }
    } catch (e) {
        // new Date can throw an error for invalid formats, ignore it.
    }

    return null; // Return null if all parsing attempts fail
};


/**
 * Formats a date string or Date object into a readable format like "Jan 1, 2024".
 * Returns 'N/A' if the date is invalid.
 */
export const formatDate = (date: string | Date | null | undefined): string => {
    if (!date) return 'N/A';
    
    const dateObj = typeof date === 'string' ? parseDate(date) : date;

    if (!dateObj || isNaN(dateObj.getTime())) {
        return 'N/A';
    }
    
    return dateObj.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    });
};

/**
 * Checks if a given date is in the past or is today.
 */
export const isPastOrToday = (date: string | Date | null | undefined): boolean => {
    if (!date) return false;

    const dateObj = typeof date === 'string' ? parseDate(date) : date;

    if (!dateObj || isNaN(dateObj.getTime())) {
        return false;
    }
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return dateObj <= today;
};

/**
 * Normalizes a date string from various formats into 'YYYY-MM-DD' format.
 * Returns an empty string if parsing fails.
 */
export const normalizeDateStringToYMD = (dateString: string | null | undefined): string => {
    const dateObj = parseDate(dateString);
    if (!dateObj) {
        return '';
    }
    
    return formatToYMD(dateObj);
};

/**
 * Formats an ISO-like date string into a readable time format like "05:30 PM".
 * Works with both UTC and local ISO-like strings.
 */
export const formatTime = (isoString: string | null | undefined): string => {
    if (!isoString) return 'N/A';
    try {
        // new Date() will correctly parse both '...Z' and '...' as UTC and local respectively.
        return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
    } catch {
        return 'N/A';
    }
};

/**
 * Gets today's date as a string in 'YYYY-MM-DD' format, respecting the local timezone.
 */
export const getTodayYMD = (): string => {
    return formatToYMD(new Date());
};

/**
 * Generates an ISO-like timestamp string based on the user's local time.
 * e.g., "2024-10-26T14:30:05". This is not a true ISO 8601 string as it lacks
 * timezone info, but it's compatible with the app's string-based date filtering
 * and correctly reflects the local date.
 */
export const getLocalISOString = (): string => {
    const d = new Date();
    const year = d.getFullYear();
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const day = d.getDate().toString().padStart(2, '0');
    const hours = d.getHours().toString().padStart(2, '0');
    const minutes = d.getMinutes().toString().padStart(2, '0');
    const seconds = d.getSeconds().toString().padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
};

/**
 * Adds a specified number of months to a date.
 */
export const addMonths = (date: Date, months: number): Date => {
    const newDate = new Date(date);
    newDate.setMonth(newDate.getMonth() + months);
    return newDate;
};

/**
 * Adds a specified number of days to a date.
 */
export const addDays = (date: Date, days: number): Date => {
    const newDate = new Date(date);
    newDate.setDate(newDate.getDate() + days);
    return newDate;
};

/**
 * Adds one year to a date.
 */
export const addYear = (date: Date): Date => {
    const newDate = new Date(date);
    newDate.setFullYear(newDate.getFullYear() + 1);
    return newDate;
};

/**
 * Formats a Date object into 'YYYY-MM-DD' string format.
 */
export const formatToYMD = (date: Date): string => {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
};
