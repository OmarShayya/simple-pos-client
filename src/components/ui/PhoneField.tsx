import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Autocomplete,
  Box,
  ButtonBase,
  InputAdornment,
  Popover,
  TextField,
  Typography,
  type PopperProps,
} from "@mui/material";
import { ArrowDropDownRounded, SearchRounded } from "@mui/icons-material";
import { AsYouType, parsePhoneNumberFromString } from "libphonenumber-js";
import CountryFlag from "./CountryFlag";
import { COUNTRIES, countryForCallingCode, getCountry, searchCountries, type Country } from "@/data/countries";
import { asCountryCode, dialCode, normalizePhone, type CountryCode } from "@/utils/phone";

export interface PhoneValue {
  /** "+96170123456" — empty string when the field is empty. Send this to the API. */
  e164: string;
  /** ISO-2 country of the number ("LB"). Send as `phoneCountry`. */
  country: CountryCode;
  /** National digits as typed ("70123456"). */
  national: string;
  isValid: boolean;
}

export interface PhoneFieldProps {
  label?: string;
  /** Stored phone: E.164 ("+96170123456") or a legacy local format ("70123456", "03 555 777"). */
  value: string | null | undefined;
  /** Stored `phoneCountry` (ISO-2). Used for legacy local numbers; default Lebanon. */
  country?: string | null;
  onChange: (value: PhoneValue) => void;
  helperText?: React.ReactNode;
  /** Force the error state (e.g. server validation). Invalid numbers are flagged automatically after blur. */
  error?: boolean;
  required?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  size?: "small" | "medium";
  name?: string;
  autoFocus?: boolean;
  onBlur?: () => void;
}

const digitsOf = (s: string) => s.replace(/\D/g, "");

const fromStored = (value: string | null | undefined, country?: string | null) => {
  const fallback = asCountryCode(country);
  const n = normalizePhone(value ?? "", fallback);
  if (!n) return { country: fallback, text: value ? digitsOf(value) : "" };
  const parsed = parsePhoneNumberFromString(n.e164);
  return { country: n.country, text: parsed ? parsed.formatNational() : n.national };
};

const buildValue = (digits: string, country: CountryCode): PhoneValue => {
  if (!digits) return { e164: "", country, national: "", isValid: false };
  const parsed = parsePhoneNumberFromString(digits, country);
  return {
    e164: parsed?.number ?? `${dialCode(country)}${digits.replace(/^0+/, "")}`,
    country,
    national: digits,
    isValid: Boolean(parsed?.isValid()),
  };
};

// Renders the country list inline inside the popover (no second floating layer)
const InlinePopper = (props: PopperProps) => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { disablePortal, anchorEl, open, popperRef, popperOptions, placement, transition, modifiers, keepMounted, ...other } = props;
  const rest = other as React.HTMLAttributes<HTMLDivElement>;
  return <div {...rest} style={{ ...rest.style, position: "static", width: "100%" }} />;
};

/**
 * Phone input = country dropdown (flag + dial code, searchable, Lebanon by default) + national
 * number formatted as you type. Emits E.164 + country; pasting "+44 7911 123456" switches the country.
 */
const PhoneField: React.FC<PhoneFieldProps> = ({
  label = "Phone",
  value,
  country: countryProp,
  onChange,
  helperText,
  error,
  required,
  disabled,
  fullWidth = true,
  size = "medium",
  name,
  autoFocus,
  onBlur,
}) => {
  const initial = useMemo(() => fromStored(value, countryProp), []); // eslint-disable-line react-hooks/exhaustive-deps
  const [country, setCountry] = useState<CountryCode>(initial.country);
  const [text, setText] = useState(initial.text);
  const [touched, setTouched] = useState(false);
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const [search, setSearch] = useState("");
  const lastEmitted = useRef<string>(normalizePhone(value ?? "", asCountryCode(countryProp))?.e164 ?? value ?? "");
  const inputRef = useRef<HTMLInputElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  // Follow outside changes (form reset, editing another record) — not our own echoes
  useEffect(() => {
    const incoming = normalizePhone(value ?? "", asCountryCode(countryProp))?.e164 ?? value ?? "";
    if (incoming === lastEmitted.current) return;
    lastEmitted.current = incoming;
    const next = fromStored(value, countryProp);
    setCountry(next.country);
    setText(next.text);
    setTouched(false);
  }, [value, countryProp]);

  const emit = (digits: string, c: CountryCode) => {
    const v = buildValue(digits, c);
    lastEmitted.current = v.e164;
    onChange(v);
  };

  const handleInput = (raw: string) => {
    const trimmed = raw.trim();
    // International input ("+44 7911 123456", "0044…"): pick the country from the calling code
    // and keep only the national part in the box, so the flag always matches the number.
    if (trimmed.startsWith("+") || (trimmed.startsWith("00") && digitsOf(trimmed).length > 4)) {
      const intlDigits = trimmed.startsWith("+") ? digitsOf(trimmed) : digitsOf(trimmed).slice(2);
      const parsed = parsePhoneNumberFromString(`+${intlDigits}`);
      if (parsed?.country && parsed.isValid()) {
        setCountry(parsed.country);
        setText(parsed.formatNational());
        emit(digitsOf(parsed.formatNational()), parsed.country);
        return;
      }
      const typing = new AsYouType();
      typing.input(`+${intlDigits}`);
      const callingCode = typing.getCallingCode();
      const detected = (typing.getCountry() as CountryCode | undefined) ?? (callingCode ? countryForCallingCode(callingCode) : undefined);
      if (callingCode && detected) {
        const national = intlDigits.slice(callingCode.length);
        setCountry(detected);
        setText(national ? new AsYouType(detected).input(national) : "");
        emit(national, detected);
        return;
      }
      // Calling code not complete yet ("+9"): keep what was typed
      setText(`+${intlDigits}`);
      return;
    }
    let digits = digitsOf(raw);
    // Backspace over a space/dash: also remove the digit before it
    if (raw.length < text.length && digits === digitsOf(text)) digits = digits.slice(0, -1);
    digits = digits.slice(0, 17);
    setText(digits ? new AsYouType(country).input(digits) : "");
    emit(digits, country);
  };

  const pickCountry = (c: Country | null) => {
    setAnchor(null);
    if (!c) return;
    const digits = digitsOf(text);
    setCountry(c.code);
    setText(digits ? new AsYouType(c.code).input(digits) : "");
    emit(digits, c.code);
    window.setTimeout(() => inputRef.current?.focus(), 0);
  };

  const current = buildValue(digitsOf(text), country);
  const countryInfo = getCountry(country);
  const showInvalid = touched && Boolean(current.national) && !current.isValid;
  const parsedIntl = current.isValid ? parsePhoneNumberFromString(current.e164)?.formatInternational() : null;
  const helper = showInvalid
    ? `This doesn't look like a valid ${countryInfo?.name ?? ""} number`.replace("  ", " ")
    : helperText ?? (parsedIntl && touched ? parsedIntl : undefined);

  return (
    <>
      <TextField
        label={label}
        name={name}
        value={text}
        inputRef={inputRef}
        onChange={(e) => handleInput(e.target.value)}
        onBlur={() => {
          setTouched(true);
          onBlur?.();
        }}
        placeholder={country === "LB" ? "70 123 456" : undefined}
        required={required}
        disabled={disabled}
        fullWidth={fullWidth}
        size={size}
        autoFocus={autoFocus}
        error={error || showInvalid}
        helperText={helper}
        type="tel"
        slotProps={{
          htmlInput: { inputMode: "tel", autoComplete: "tel-national", "aria-describedby": undefined },
          input: {
            startAdornment: (
              <InputAdornment position="start" sx={{ mr: 1, ml: -0.5, height: "auto", maxHeight: "none" }}>
                <ButtonBase
                  onClick={(e) => {
                    setSearch("");
                    setAnchor(e.currentTarget);
                  }}
                  disabled={disabled}
                  aria-label={`Country code: ${countryInfo?.name ?? country} ${dialCode(country)}. Change country`}
                  aria-haspopup="listbox"
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 0.75,
                    height: size === "small" ? 32 : 36,
                    pl: 0.75,
                    pr: 0.25,
                    borderRadius: "6px",
                    color: "text.primary",
                    fontSize: "0.9375rem",
                    fontVariantNumeric: "tabular-nums",
                    borderRight: 1,
                    borderColor: "divider",
                    borderTopRightRadius: 0,
                    borderBottomRightRadius: 0,
                    "&:hover": { bgcolor: "action.hover" },
                  }}
                >
                  <CountryFlag code={country} />
                  <span>{dialCode(country)}</span>
                  <ArrowDropDownRounded sx={{ color: "text.secondary", ml: -0.25 }} />
                </ButtonBase>
              </InputAdornment>
            ),
          },
        }}
      />
      <Popover
        open={Boolean(anchor)}
        anchorEl={anchor}
        onClose={() => setAnchor(null)}
        disableAutoFocus
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
        transformOrigin={{ vertical: "top", horizontal: "left" }}
        slotProps={{
          paper: { sx: { width: 340, maxWidth: "calc(100vw - 24px)", mt: 0.5 } },
          transition: { onEntered: () => searchRef.current?.focus() },
        }}
      >
        <Autocomplete<Country, false, false, false>
          open
          options={COUNTRIES}
          value={null}
          inputValue={search}
          onInputChange={(_, v, reason) => reason !== "reset" && setSearch(v)}
          onChange={(_, c) => pickCountry(c)}
          onClose={(_, reason) => reason === "escape" && setAnchor(null)}
          autoHighlight
          disablePortal
          groupBy={(c) => (c.common ? "Common" : "All countries")}
          getOptionLabel={(c) => c.name}
          isOptionEqualToValue={(a, b) => a.code === b.code}
          filterOptions={(options, state) => searchCountries(options, state.inputValue)}
          noOptionsText="No country matches"
          slots={{ popper: InlinePopper }}
          slotProps={{
            paper: { sx: { border: 0, boxShadow: "none", borderRadius: 0, m: 0, bgcolor: "transparent" } },
            listbox: { sx: { maxHeight: 320 } },
          }}
          renderOption={({ key, ...props }, c) => (
            <Box component="li" key={key} {...props} sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
              <CountryFlag code={c.code} />
              <Typography component="span" sx={{ flex: 1, minWidth: 0 }} noWrap>
                {c.name}
              </Typography>
              <Typography component="span" color="text.secondary" sx={{ fontVariantNumeric: "tabular-nums" }}>
                {c.dialCode}
              </Typography>
            </Box>
          )}
          renderInput={(params) => (
            <Box sx={{ p: 1, borderBottom: 1, borderColor: "divider" }}>
              <TextField
                {...params}
                inputRef={searchRef}
                size="small"
                placeholder="Search country or code"
                InputProps={{
                  ...params.InputProps,
                  endAdornment: null,
                  startAdornment: (
                    <InputAdornment position="start" sx={{ ml: 0.5 }}>
                      <SearchRounded fontSize="small" />
                    </InputAdornment>
                  ),
                }}
                inputProps={{ ...params.inputProps, "aria-label": "Search countries" }}
              />
            </Box>
          )}
        />
      </Popover>
    </>
  );
};

export default PhoneField;
