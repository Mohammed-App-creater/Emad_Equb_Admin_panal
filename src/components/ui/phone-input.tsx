import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDown, Check, Search, Globe, AlertCircle } from 'lucide-react';
import { COUNTRIES, Country } from '@/constants/phone-number';
import { ETHIOPIA_DIAL_CODE, isValidEthiopianPhone } from '@/lib/validators';

// Whether a national number is complete & valid for the given country.
// Ethiopia additionally requires the number to start with 9 or 7.
const isNumberValid = (national: string, country: Country) =>
  country.dialCode === ETHIOPIA_DIAL_CODE
    ? isValidEthiopianPhone(`${country.dialCode}${national}`)
    : national.length === country.maxLength;

// Reduce any pasted/stored value to the bare national number for the country:
// strips an international "00" prefix, the dial code ("+251"/"251") and a local
// trunk "0" so "+251911…", "00251911…", "251911…", "0911…" and "911…" all
// normalise to "911…" (a 9/7-leading national number for Ethiopia).
const toNationalDigits = (raw: string, country: Country): string => {
  let digits = (raw || '').replace(/\D/g, '');
  const cc = country.dialCode.replace(/\D/g, '');
  digits = digits.replace(/^00/, ''); // international call prefix (00 + cc)
  if (cc && digits.startsWith(cc)) digits = digits.slice(cc.length); // dial code
  digits = digits.replace(/^0+/, ''); // local trunk 0
  return digits;
};

const ETHIOPIA_PREFIX_ERROR =
  'Ethiopian numbers must start with 9 or 7 (after +251).';

export interface PhoneInputProps {
  value: string;
  onChange: (value: string, isValid: boolean) => void;
  label?: string;
  error?: string;
  className?: string;
  disabled?: boolean;
}

export const PhoneInput: React.FC<PhoneInputProps> = ({
  value,
  onChange,
  label = 'Phone Number',
  error,
  className = '',
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCountry, setSelectedCountry] = useState<Country>(
    COUNTRIES.find((c) => c.code === 'ET') || COUNTRIES[0]
  );
  const [phoneNumber, setPhoneNumber] = useState('');
  // Leading-digit / format error surfaced from typing or pasting, shown so the
  // user understands *why* an entry was rejected instead of it silently failing.
  const [internalError, setInternalError] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Initialise / sync the national number from the incoming value. Tolerant of
  // every stored format ("+251…", "251…", "0…", bare national).
  useEffect(() => {
    if (!value) {
      if (phoneNumber !== '') setPhoneNumber('');
      return;
    }
    const national = toNationalDigits(value, selectedCountry).slice(
      0,
      selectedCountry.maxLength
    );
    if (national !== phoneNumber) setPhoneNumber(national);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  const filteredCountries = useMemo(() => {
    return COUNTRIES.filter(
      (country) =>
        country.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        country.dialCode.includes(searchTerm) ||
        country.code.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [searchTerm]);

  const handleCountrySelect = (country: Country) => {
    setSelectedCountry(country);
    setIsOpen(false);
    setSearchTerm('');
    setInternalError('');

    let newNumber = phoneNumber.replace(/\D/g, '');
    if (newNumber.length > country.maxLength) {
      newNumber = newNumber.slice(0, country.maxLength);
    }
    setPhoneNumber(newNumber);

    const fullValue = `${country.dialCode}${newNumber}`;
    onChange(fullValue, isNumberValid(newNumber, country));
  };

  // Shared entry point for both typing and pasting. Normalises the raw text to a
  // national number, enforces the length cap, and — for Ethiopia — surfaces a
  // visible error when the leading digit isn't 9 or 7 (rather than silently
  // swallowing the keystroke / paste).
  const applyValue = (raw: string) => {
    let national = toNationalDigits(raw, selectedCountry);
    if (national.length > selectedCountry.maxLength) {
      national = national.slice(0, selectedCountry.maxLength);
    }

    if (
      selectedCountry.dialCode === ETHIOPIA_DIAL_CODE &&
      national.length > 0 &&
      !/^[79]/.test(national)
    ) {
      setInternalError(ETHIOPIA_PREFIX_ERROR);
      return;
    }

    setInternalError('');
    setPhoneNumber(national);

    const fullValue = `${selectedCountry.dialCode}${national}`;
    onChange(fullValue, isNumberValid(national, selectedCountry));
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    applyValue(e.target.value);
  };

  // Intercept paste so country-code / trunk-0 prefixes are normalised and an
  // invalid pasted number reports the same error a typed one would.
  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    applyValue(e.clipboardData.getData('text'));
  };

  const displayError = error || internalError;

  return (
    <div className={`w-full font-sans ${className}`}>
      {label && (
        <label className="block text-sm font-medium text-foreground mb-1 ml-1">
          {label}
        </label>
      )}

      <div className="relative" ref={dropdownRef}>
        <div
          className={`
            flex items-center w-full radius border bg-background transition-all duration-200 ease-in-out shadow-sm
            ${disabled ? 'opacity-60 cursor-not-allowed' : ''}
            ${
              displayError
                ? 'border-destructive/50 ring-4 ring-destructive/10 focus-within:ring-destructive/20 focus-within:border-destructive'
                : 'border-border focus-within:ring-4 focus-within:ring-primary/20 focus-within:border-primary hover:border-muted-foreground/30'
            }
          `}
        >
          {/* Country Selector Trigger */}
          <button
            type="button"
            disabled={disabled}
            onClick={() => !disabled && setIsOpen(!isOpen)}
            className="flex items-center gap-1.5 pl-2.5 pr-2 py-2 border-r border-border hover:bg-muted rounded-l-xl transition-colors min-w-22.5 disabled:cursor-not-allowed"
          >
            <span className="text-2xl pb-1 leading-none">{selectedCountry.flag}</span>
            <div className="flex flex-col items-start mr-0.5">
              <span className="text-md font-bold text-foreground leading-tight">
                {selectedCountry.dialCode}
              </span>
            </div>
            <ChevronDown
              className={`w-3.5 h-3.5 text-muted-foreground transition-transform duration-200 ${
                isOpen ? 'rotate-180' : ''
              }`}
            />
          </button>

          {/* Phone Number Input */}
          <input
            type="tel"
            value={phoneNumber}
            onChange={handlePhoneChange}
            onPaste={handlePaste}
            disabled={disabled}
            placeholder={`000 000 ${'0'.repeat(
              Math.max(0, selectedCountry.maxLength - 6)
            )}`}
            className="flex-1 w-full h-full py-2 px-3 text-foreground placeholder:text-muted-foreground/40 bg-transparent border-none focus:ring-0 focus:outline-none font-medium tabular-nums disabled:cursor-not-allowed"
          />

          {/* Validation Status Indicator */}
          <div className="pr-3">
            {phoneNumber.length === selectedCountry.maxLength ? (
              <div className="w-5 h-5 rounded-full bg-success/10 flex items-center justify-center text-success animate-in zoom-in duration-200">
                <Check className="w-3 h-3 stroke-3" />
              </div>
            ) : phoneNumber.length > 0 ? (
              <div className="text-xs font-medium text-muted-foreground/50">
                {phoneNumber.length}/{selectedCountry.maxLength}
              </div>
            ) : null}
          </div>
        </div>

        {/* Dropdown Menu */}
        {isOpen && (
          <div className="absolute z-50 top-[calc(100%+6px)] left-0 w-80 max-h-80 overflow-hidden bg-popover rounded-xl shadow-card border border-border animate-in fade-in slide-in-from-top-2 duration-200">
            {/* Search Header */}
            <div className="p-2 border-b border-border bg-muted/30 sticky top-0">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search countries..."
                  className="w-full pl-9 pr-4 py-1.5 text-sm bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all placeholder:text-muted-foreground/50"
                />
              </div>
            </div>

            {/* Country List */}
            <div className="overflow-y-auto max-h-60 scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent p-1">
              {filteredCountries.length > 0 ? (
                filteredCountries.map((country) => (
                  <button
                    key={country.code}
                    onClick={() => handleCountrySelect(country)}
                    className={`
                      w-full flex items-center justify-between px-3 py-2 rounded-lg text-left transition-colors text-sm group
                      ${
                        selectedCountry.code === country.code
                          ? 'bg-primary/10 text-primary'
                          : 'hover:bg-muted text-foreground'
                      }
                    `}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{country.flag}</span>
                      <div>
                        <div className="font-medium">{country.name}</div>
                        <div
                          className={`text-xs ${
                            selectedCountry.code === country.code
                              ? 'text-primary/70'
                              : 'text-muted-foreground'
                          }`}
                        >
                          {country.dialCode}
                        </div>
                      </div>
                    </div>
                    {selectedCountry.code === country.code && (
                      <Check className="w-4 h-4 text-primary" />
                    )}
                  </button>
                ))
              ) : (
                <div className="py-8 text-center text-muted-foreground flex flex-col items-center gap-2">
                  <Globe className="w-8 h-8 opacity-20" />
                  <span className="text-sm">No countries found</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Error Message */}
      {displayError && (
        <div className="flex items-center gap-1.5 mt-2 text-destructive text-sm animate-in slide-in-from-top-1">
          <AlertCircle className="w-4 h-4" />
          <span>{displayError}</span>
        </div>
      )}

      {/* Helper Text */}
      {!displayError && (
        <p className="mt-2 text-xs text-muted-foreground ml-1">
          {selectedCountry.dialCode === ETHIOPIA_DIAL_CODE
            ? `${selectedCountry.maxLength} digits, starting with 9 or 7 (after ${selectedCountry.dialCode}).`
            : `Maximum ${selectedCountry.maxLength} digits allowed for ${selectedCountry.name}.`}
        </p>
      )}
    </div>
  );
};