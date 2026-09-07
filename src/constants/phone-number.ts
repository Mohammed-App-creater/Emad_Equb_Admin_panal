export interface Country {
  name: string;
  code: string; // ISO 2-letter
  dialCode: string;
  maxLength: number; // Max digits for the national number (excluding country code)
  flag: string; // Emoji flag
}

// A curated list of countries with their dial codes and typical max mobile lengths.
// Ethiopia is set to 9 based on standard NSN (e.g. 911 234 567), but can be adjusted.
export const COUNTRIES: Country[] = [
  { name: "United States", code: "US", dialCode: "+1", maxLength: 10, flag: "🇺🇸" },
  { name: "Ethiopia", code: "ET", dialCode: "+251", maxLength: 9, flag: "🇪🇹" },
  { name: "United Kingdom", code: "GB", dialCode: "+44", maxLength: 10, flag: "🇬🇧" },
  { name: "Canada", code: "CA", dialCode: "+1", maxLength: 10, flag: "🇨🇦" },
  { name: "Australia", code: "AU", dialCode: "+61", maxLength: 9, flag: "🇦🇺" },
  { name: "Germany", code: "DE", dialCode: "+49", maxLength: 11, flag: "🇩🇪" },
  { name: "France", code: "FR", dialCode: "+33", maxLength: 9, flag: "🇫🇷" },
  { name: "India", code: "IN", dialCode: "+91", maxLength: 10, flag: "🇮🇳" },
  { name: "Japan", code: "JP", dialCode: "+81", maxLength: 10, flag: "🇯🇵" },
  { name: "China", code: "CN", dialCode: "+86", maxLength: 11, flag: "🇨🇳" },
  { name: "Brazil", code: "BR", dialCode: "+55", maxLength: 11, flag: "🇧🇷" },
  { name: "South Africa", code: "ZA", dialCode: "+27", maxLength: 9, flag: "🇿🇦" },
  { name: "Nigeria", code: "NG", dialCode: "+234", maxLength: 10, flag: "🇳🇬" },
  { name: "Kenya", code: "KE", dialCode: "+254", maxLength: 9, flag: "🇰🇪" },
  { name: "UAE", code: "AE", dialCode: "+971", maxLength: 9, flag: "🇦🇪" },
  { name: "Saudi Arabia", code: "SA", dialCode: "+966", maxLength: 9, flag: "🇸🇦" },
  { name: "Singapore", code: "SG", dialCode: "+65", maxLength: 8, flag: "🇸🇬" },
  { name: "South Korea", code: "KR", dialCode: "+82", maxLength: 10, flag: "🇰🇷" },
  { name: "Russia", code: "RU", dialCode: "+7", maxLength: 10, flag: "🇷🇺" },
  { name: "Mexico", code: "MX", dialCode: "+52", maxLength: 10, flag: "🇲🇽" },
];