import React, { useMemo, useState } from "react";
import { Autocomplete, Box, TextField, Typography } from "@mui/material";
import { LEBANON_PLACES, findPlace, placeLabel, type LebanonPlace } from "@/data/lebanon-places";

export interface CityValue {
  city: string;
  /** Neighbourhood inside the city (Beirut areas), when known. */
  area?: string;
}

export interface CityFieldProps {
  /** ISO-2 country. Lebanon ("LB") offers the Lebanese places list; other countries are free text. */
  country: string | null | undefined;
  value: CityValue | null | undefined;
  onChange: (value: CityValue | null) => void;
  label?: string;
  helperText?: React.ReactNode;
  error?: boolean;
  required?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  size?: "small" | "medium";
  name?: string;
}

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "").replace(/[^a-z0-9]+/g, " ").trim();

const placeToValue = (p: LebanonPlace): CityValue => (p.city ? { city: p.city, area: p.name } : { city: p.name });

const valueText = (v: CityValue | null | undefined) => (!v?.city ? "" : v.area ? `${v.area}, ${v.city}` : v.city);

/**
 * City / area picker. In Lebanon: search ~300 cities, towns and Beirut areas (Hamra, Achrafieh,
 * Sawfar, Bhamdoun, Aley…) with spelling variants; anything not listed can still be typed.
 * Elsewhere: a plain text field.
 */
const CityField: React.FC<CityFieldProps> = ({
  country,
  value,
  onChange,
  label,
  helperText,
  error,
  required,
  disabled,
  fullWidth = true,
  size = "medium",
  name,
}) => {
  const isLebanon = (country ?? "LB").toUpperCase() === "LB";
  const [query, setQuery] = useState("");
  const selected = useMemo<LebanonPlace | string | null>(() => {
    if (!value?.city) return null;
    return findPlace(value.city, value.area) ?? valueText(value);
  }, [value]);

  if (!isLebanon) {
    return (
      <TextField
        label={label ?? "City"}
        name={name}
        value={value?.city ?? ""}
        onChange={(e) => onChange(e.target.value ? { city: e.target.value } : null)}
        helperText={helperText}
        error={error}
        required={required}
        disabled={disabled}
        fullWidth={fullWidth}
        size={size}
        slotProps={{ htmlInput: { autoComplete: "address-level2" } }}
      />
    );
  }

  return (
    <Autocomplete<LebanonPlace, false, false, true>
      freeSolo
      autoHighlight
      options={LEBANON_PLACES}
      value={selected}
      onChange={(_, next) => {
        if (!next) onChange(null);
        else if (typeof next === "string") onChange(next.trim() ? { city: next.trim() } : null);
        else onChange(placeToValue(next));
      }}
      onInputChange={(_, text, reason) => {
        setQuery(reason === "input" ? text : "");
        // Typed text is kept as-is (spaces included); it snaps to a listed place on blur
        if (reason === "input") onChange(text ? { city: text } : null);
      }}
      disabled={disabled}
      fullWidth={fullWidth}
      size={size}
      // Grouped by governorate when browsing; best matches first when searching
      groupBy={query ? undefined : (p) => p.governorate}
      getOptionLabel={(p) => (typeof p === "string" ? p : placeLabel(p))}
      isOptionEqualToValue={(a, b) => typeof b !== "string" && a.name === b.name && a.district === b.district}
      filterOptions={(options, state) => {
        const q = norm(state.inputValue);
        if (!q || (typeof selected !== "string" && selected && q === norm(placeLabel(selected)))) return options;
        const rank = (p: LebanonPlace) => {
          const name = norm(p.name);
          const aka = (p.aka ?? []).map(norm);
          if (name.startsWith(q)) return 0;
          if (aka.some((n) => n.startsWith(q))) return 1;
          if ([name, ...aka].some((n) => n.split(" ").some((w) => w.startsWith(q)))) return 2;
          if ([name, ...aka].some((n) => n.includes(q))) return 3;
          if (norm(p.district).startsWith(q)) return 4;
          return -1;
        };
        return options
          .map((p, i) => ({ p, i, r: rank(p) }))
          .filter((x) => x.r >= 0)
          .sort((a, b) => a.r - b.r || a.i - b.i)
          .map((x) => x.p);
      }}
      renderOption={({ key, ...props }, p) => (
        <Box component="li" key={key} {...props} sx={{ display: "flex", flexDirection: "column", alignItems: "flex-start !important", py: "6px !important" }}>
          <Typography component="span">{p.name}</Typography>
          <Typography component="span" variant="caption" color="text.secondary">
            {p.city ? `${p.city} · ` : ""}
            {p.district === p.governorate ? p.district : `${p.district}, ${p.governorate}`}
          </Typography>
        </Box>
      )}
      renderInput={(params) => (
        <TextField
          {...params}
          label={label ?? "City / area"}
          name={name}
          placeholder="Start typing, e.g. Hamra or Aley"
          helperText={helperText}
          error={error}
          required={required}
          inputProps={{ ...params.inputProps, autoComplete: "address-level2" }}
          onBlur={(e) => {
            const text = norm(e.target.value);
            if (!text || typeof selected !== "string") return;
            const exact = LEBANON_PLACES.find((p) => [p.name, ...(p.aka ?? [])].some((n) => norm(n) === text));
            if (exact) onChange(placeToValue(exact));
            else if (value?.city && value.city !== value.city.trim()) onChange({ city: value.city.trim() });
          }}
        />
      )}
    />
  );
};

export default CityField;
