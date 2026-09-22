// Shared validation helpers used across the app's forms.

export const ETHIOPIA_DIAL_CODE = "+251";

/**
 * Ethiopian phone numbers: the national number (after the +251 dial code, or a
 * leading 0 trunk prefix) must be 9 digits long and start with 9 or 7.
 *
 * Tolerant of every format used across the forms in this app:
 *   "+2519XXXXXXXX", "2519XXXXXXXX", "09XXXXXXXX" and the bare "9XXXXXXXX".
 */
export function isValidEthiopianPhone(raw: string): boolean {
  const digits = (raw || "").replace(/\D/g, "");
  let national = digits;
  if (national.startsWith("251")) national = national.slice(3);
  else if (national.startsWith("0")) national = national.slice(1);
  return /^[79]\d{8}$/.test(national);
}

export const ETHIOPIAN_PHONE_MESSAGE =
  "Phone number must start with 9 or 7 after +251 (9 digits)";

/** National ID must be exactly 16 digits. */
export const NATIONAL_ID_REGEX = /^\d{16}$/;

export function isValidNationalId(value: string): boolean {
  return NATIONAL_ID_REGEX.test((value || "").trim());
}

export const NATIONAL_ID_MESSAGE = "National ID must be exactly 16 digits";
