
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merge class names with clsx + tailwind-merge so conflicting Tailwind
 * utilities (e.g. two `max-w-*`) resolve to the last one instead of both
 * being emitted. Drop-in compatible with the previous naive implementation.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}


// lib/utils.ts or utils/format.ts

/**
 * Format a date string into a readable format
 * @param dateString - ISO date string or any valid date string
 * @param options - Intl.DateTimeFormatOptions for customization
 * @returns Formatted date string (e.g., "May 14, 1990")
 */
export function formatDate(
  dateString?: string | null, 
  options?: Intl.DateTimeFormatOptions
): string {
  if (!dateString) return '—';
  
  try {
    const date = new Date(dateString);
    
    // Check if date is valid
    if (isNaN(date.getTime())) {
      return 'Invalid date';
    }
    
    const defaultOptions: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      ...options
    };
    
    return new Intl.DateTimeFormat('en-US', defaultOptions).format(date);
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'Invalid date';
  }
}

/**
 * Format a date to YYYY-MM-DD for input fields
 * @param dateString - ISO date string or any valid date string
 * @returns Formatted date string (e.g., "1990-05-14")
 */
export function formatDateForInput(dateString?: string | null): string {
  if (!dateString) return '';
  
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    return `${year}-${month}-${day}`;
  } catch (error) {
    return '';
  }
}

/**
 * Format a phone number to a readable format
 * Supports Ethiopian phone numbers by default but can be customized
 * @param phoneNumber - Raw phone number string
 * @param countryCode - Country code prefix (default: '+251' for Ethiopia)
 * @returns Formatted phone number (e.g., "+251 911 234 567")
 */
export function formatPhoneNumber(
  phoneNumber?: string | null,
  countryCode: string = '+251'
): string {
  if (!phoneNumber) return '—';
  
  try {
    // Remove all non-digit characters except the leading '+'
    const cleaned = phoneNumber.replace(/[^\d+]/g, '');
    
    // Check if it's an Ethiopian number (starts with 0 or +251)
    if (cleaned.startsWith('+251')) {
      // Format: +251 91 123 4567
      const match = cleaned.match(/^(\+251)(\d{1})(\d{3})(\d{4})$/);
      if (match) {
        return `${match[1]} ${match[2]}${match[3]} ${match[4]}`;
      }
    } else if (cleaned.startsWith('0')) {
      // Local format: 0 91 123 4567
      const match = cleaned.match(/^(0)(\d{1})(\d{3})(\d{4})$/);
      if (match) {
        return `${match[1]} ${match[2]}${match[3]} ${match[4]}`;
      }
    } else if (cleaned.startsWith('9')) {
      // Just the 9xxxxxxxx format
      const match = cleaned.match(/^(\d{3})(\d{3})(\d{4})$/);
      if (match) {
        return `${match[1]} ${match[2]} ${match[3]}`;
      }
    }
    
    // If no pattern matches, return the original cleaned number with basic grouping
    return cleaned.replace(/(\d{3})(?=\d)/g, '$1 ').trim();
  } catch (error) {
    return phoneNumber || '—';
  }
}

/**
 * Format phone number for international format
 * @param phoneNumber - Raw phone number string
 * @param defaultCountryCode - Default country code to add if missing
 * @returns International format (e.g., "+251911234567")
 */
export function formatPhoneNumberInternational(
  phoneNumber?: string | null,
  defaultCountryCode: string = '+251'
): string {
  if (!phoneNumber) return '';
  
  try {
    // Remove all non-digit characters
    const digits = phoneNumber.replace(/\D/g, '');
    
    // If it's an Ethiopian number starting with 0, replace with country code
    if (digits.startsWith('0') && digits.length === 10) {
      return defaultCountryCode + digits.slice(1);
    }
    
    // If it's just 9 digits (9xxxxxxxx), add country code
    if (digits.length === 9 && digits.startsWith('9')) {
      return defaultCountryCode + digits;
    }
    
    // If it already has country code format, return as is
    if (phoneNumber.startsWith('+')) {
      return phoneNumber.replace(/\s/g, '');
    }
    
    return phoneNumber;
  } catch (error) {
    return phoneNumber || '';
  }
}

/**
 * Mask a phone number for privacy (show only last 4 digits)
 * @param phoneNumber - Raw phone number string
 * @returns Masked phone number (e.g., "+251 *** *** 567")
 */
export function maskPhoneNumber(phoneNumber?: string | null): string {
  if (!phoneNumber) return '—';
  
  try {
    const cleaned = phoneNumber.replace(/\D/g, '');
    const last4 = cleaned.slice(-4);
    
    if (cleaned.startsWith('251') || cleaned.startsWith('0')) {
      return `+251 *** *** ${last4}`;
    }
    
    return `*** *** ${last4}`;
  } catch (error) {
    return '*** ***';
  }
}

// Additional date utilities that might be useful

/**
 * Get relative time (e.g., "2 days ago", "in 3 months")
 * @param dateString - ISO date string
 * @returns Relative time string
 */
export function getRelativeTime(dateString?: string | null): string {
  if (!dateString) return '';
  
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
    
    const intervals: [Intl.RelativeTimeFormatUnit, number][] = [
      ['year', 31536000],
      ['month', 2592000],
      ['week', 604800],
      ['day', 86400],
      ['hour', 3600],
      ['minute', 60],
      ['second', 1],
    ];
    
    for (const [unit, secondsInUnit] of intervals) {
      const difference = diffInSeconds / secondsInUnit;
      if (Math.abs(difference) >= 1) {
        return rtf.format(-Math.round(difference), unit);
      }
    }
    
    return 'just now';
  } catch (error) {
    return '';
  }
}

/**
 * Format date with time
 * @param dateString - ISO date string
 * @returns Formatted date and time (e.g., "May 14, 1990 at 10:30 AM")
 */
export function formatDateTime(dateString?: string | null): string {
  if (!dateString) return '—';
  
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Invalid date';
    
    const dateFormatted = formatDate(dateString);
    const timeFormatted = date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
    
    return `${dateFormatted} at ${timeFormatted}`;
  } catch (error) {
    return '—';
  }
}


/**
 * Format a numeric amount as a currency string with thousand separators
 * and 2 decimal places, prefixed by the currency code.
 * @param amount - Numeric amount
 * @param currency - Currency code (default: "ETB")
 * @returns Formatted currency string (e.g., "ETB 1,000,000.00") or "—" if null/undefined
 */
export function formatCurrency(
  amount?: number | null,
  currency: string = "ETB"
): string {
  if (amount === null || amount === undefined || Number.isNaN(amount)) return "—";

  const formatted = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);

  return `${currency} ${formatted}`;
}

// Helper to build query string from params object
export const buildQueryString = (params: object): string => {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      searchParams.append(key, String(value));
    }
  });
  return searchParams.toString();
};

/**
 * Extract a human-readable message from an unknown error.
 *
 * Priority order:
 *   1. `error.response.data.details.reason` (specific backend reason — e.g.
 *      "insufficient contribution balance")
 *   2. `error.response.data.message` (generic backend message — e.g.
 *      "Invalid request parameters")
 *   3. `error.message` (axios/JS error message)
 *   4. provided fallback
 *
 * When `details` is present, any additional scalar fields (numbers/strings,
 * excluding `reason`) are appended as context — e.g.
 * "Insufficient contribution balance — current balance: 108000.00;
 *  required contribution: 150000.00".
 */
export function getErrorMessage(error: unknown, fallback: string): string {
  if (!error || typeof error !== "object") return fallback;

  const e = error as {
    response?: {
      data?: {
        message?: unknown;
        details?: unknown;
      };
    };
    message?: unknown;
  };

  const data = e.response?.data;
  const details =
    data?.details && typeof data.details === "object"
      ? (data.details as Record<string, unknown>)
      : undefined;

  // Prefer the most specific human-readable text. Backends put it in
  // `details.reason` or `details.message` (e.g. "A member with this
  // identification method and number already exists"); fall back to the
  // top-level `message` ("This operation has already been processed") and
  // finally the raw Error message.
  let main: string | undefined;
  if (details && typeof details.reason === "string") {
    main = details.reason;
  } else if (details && typeof details.message === "string") {
    main = details.message;
  } else if (data?.message) {
    main = String(data.message);
  } else if (e.message) {
    main = String(e.message);
  }
  if (!main) return fallback;

  // Capitalize first letter so user-facing strings read naturally regardless
  // of whether the backend sent "insufficient balance" or "Insufficient balance".
  main = main.charAt(0).toUpperCase() + main.slice(1);

  if (details) {
    const extras: string[] = [];
    for (const [key, value] of Object.entries(details)) {
      // Skip the keys already surfaced as the main message above.
      if (key === "reason" || key === "message") continue;
      if (typeof value !== "string" && typeof value !== "number") continue;
      const label = key.replace(/_/g, " ");
      extras.push(`${label}: ${value}`);
    }
    if (extras.length > 0) {
      main += ` — ${extras.join("; ")}`;
    }
  }

  return main;
}

/**
 * Collect EVERY human-readable error message out of an unknown error, so a form
 * can surface all backend validation problems at once instead of just the first.
 *
 * Handles the shapes this app's backend + axios interceptor produce:
 *   - Network / timeout: a plain `Error` with no `response` → its `.message`.
 *   - `response.data.message`: the top-level summary.
 *   - `response.data.details` / `errors` / `error`: a string, an array of
 *     strings, or a field → message(s) map (e.g. `{ phone_number: ["taken"] }`),
 *     possibly nested. Field keys are humanized into labels ("Phone number: …").
 *
 * Messages are de-duplicated and sentence-cased. Returns `[fallback]` when
 * nothing usable is found.
 */
export function getErrorMessages(error: unknown, fallback: string): string[] {
  if (!error || typeof error !== "object") return [fallback];

  const e = error as {
    response?: {
      data?: {
        message?: unknown;
        error?: unknown;
        errors?: unknown;
        details?: unknown;
      };
    };
    message?: unknown;
  };

  const data = e.response?.data;

  // No response body → network / CORS / timeout error surfaced by the axios
  // interceptor as a plain Error.
  if (!data) {
    return [e.message ? String(e.message) : fallback];
  }

  const messages: string[] = [];

  // Walk any string | number | array | field->message map, labelling fields.
  const walk = (value: unknown, label?: string) => {
    if (value == null) return;
    if (typeof value === "string" || typeof value === "number") {
      const text = String(value).trim();
      if (text) messages.push(label ? `${label}: ${text}` : text);
      return;
    }
    if (Array.isArray(value)) {
      value.forEach((v) => walk(v, label));
      return;
    }
    if (typeof value === "object") {
      for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
        // `reason`/`message` are the human summary, not a field — no label.
        if (key === "reason" || key === "message") {
          walk(child);
          continue;
        }
        const fieldLabel = key.replace(/_/g, " ");
        walk(child, label ? `${label} ${fieldLabel}` : fieldLabel);
      }
    }
  };

  if (data.message) walk(data.message);
  walk(data.details);
  walk(data.errors);
  walk(data.error);

  // De-duplicate (exact matches) while preserving order, then sentence-case.
  const unique = Array.from(new Set(messages)).map(
    (m) => m.charAt(0).toUpperCase() + m.slice(1)
  );

  return unique.length > 0 ? unique : [fallback];
}
