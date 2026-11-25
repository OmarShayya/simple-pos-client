import React, { useMemo, useState } from "react";
import { Autocomplete, Box, TextField, Typography } from "@mui/material";
import { AddRounded } from "@mui/icons-material";

interface Option {
  value: string;
  /** Set on the "Add …" row. */
  isNew?: boolean;
}

export interface CreatableSelectProps {
  label: string;
  /** The chosen value, or null. */
  value: string | null | undefined;
  onChange: (value: string | null) => void;
  /** Existing choices (e.g. zones already used by other stations). */
  options: string[];
  /** Noun for the "Add new …" row, e.g. "zone" → "Add new zone “Terrace”". */
  noun?: string;
  placeholder?: string;
  helperText?: React.ReactNode;
  error?: boolean;
  required?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  size?: "small" | "medium";
  /** Allow clearing the value (default true). */
  clearable?: boolean;
}

const norm = (s: string) => s.trim().replace(/\s+/g, " ").toLowerCase();

/**
 * Pick one of the existing values, or add a new one on purpose ("Add new zone “Terrace”").
 * Use it for things that must stay consistent but can grow (station zones, units…): typing
 * "front row" picks the existing "Front row" instead of creating a near-duplicate.
 */
const CreatableSelect: React.FC<CreatableSelectProps> = ({
  label,
  value,
  onChange,
  options,
  noun = "item",
  placeholder,
  helperText,
  error,
  required,
  disabled,
  fullWidth = true,
  size = "medium",
  clearable = true,
}) => {
  const [input, setInput] = useState("");
  const choices = useMemo<Option[]>(() => {
    const seen = new Map<string, string>();
    for (const o of [...options, ...(value ? [value] : [])]) {
      const t = o?.trim();
      if (t && !seen.has(norm(t))) seen.set(norm(t), t);
    }
    return [...seen.values()].sort((a, b) => a.localeCompare(b)).map((v) => ({ value: v }));
  }, [options, value]);
  const selected = value ? choices.find((c) => norm(c.value) === norm(value)) ?? null : null;

  return (
    <Autocomplete<Option, false, boolean, false>
      options={choices}
      value={selected}
      inputValue={input}
      onInputChange={(_, v) => setInput(v)}
      onChange={(_, next) => onChange(next ? next.value.trim().replace(/\s+/g, " ") : null)}
      disableClearable={!clearable}
      disabled={disabled}
      fullWidth={fullWidth}
      size={size}
      autoHighlight
      handleHomeEndKeys
      getOptionLabel={(o) => o.value}
      isOptionEqualToValue={(a, b) => norm(a.value) === norm(b.value)}
      filterOptions={(opts, state) => {
        const q = norm(state.inputValue);
        if (!q || (selected && q === norm(selected.value))) return opts;
        const matches = opts.filter((o) => norm(o.value).includes(q));
        const exact = opts.some((o) => norm(o.value) === q);
        return exact ? matches : [...matches, { value: state.inputValue.trim(), isNew: true }];
      }}
      noOptionsText={`Type a name to add a new ${noun}`}
      renderOption={({ key, ...props }, o) => (
        <Box component="li" key={key} {...props} sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          {o.isNew ? (
            <>
              <AddRounded fontSize="small" sx={{ color: "primary.main" }} />
              <Typography component="span">
                Add new {noun} <b>“{o.value}”</b>
              </Typography>
            </>
          ) : (
            o.value
          )}
        </Box>
      )}
      renderInput={(params) => (
        <TextField {...params} label={label} placeholder={placeholder} helperText={helperText} error={error} required={required} />
      )}
    />
  );
};

export default CreatableSelect;
