import React, { useEffect, useRef, useState } from "react";
import { IconButton, InputAdornment, TextField, type SxProps, type Theme } from "@mui/material";
import { CloseRounded, SearchRounded } from "@mui/icons-material";

export interface SearchFieldProps {
  /** The committed (debounced) value. */
  value: string;
  /** Called `delay` ms after the user stops typing, and immediately on clear / Enter. */
  onChange: (value: string) => void;
  placeholder?: string;
  /** Debounce in ms (default 300). */
  delay?: number;
  autoFocus?: boolean;
  fullWidth?: boolean;
  size?: "small" | "medium";
  /** Accessible name (defaults to the placeholder). */
  "aria-label"?: string;
  sx?: SxProps<Theme>;
}

/** Search box with a clear button. Debounced so server searches don't fire on every key. */
const SearchField: React.FC<SearchFieldProps> = ({
  value,
  onChange,
  placeholder = "Search",
  delay = 300,
  autoFocus,
  fullWidth = true,
  size = "small",
  sx,
  ...rest
}) => {
  const [text, setText] = useState(value);
  const timer = useRef<number | undefined>(undefined);
  const latest = useRef(onChange);
  useEffect(() => {
    latest.current = onChange;
  });

  // Follow outside changes (e.g. "Clear filters")
  useEffect(() => {
    setText(value);
  }, [value]);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const commit = (next: string, immediate = false) => {
    window.clearTimeout(timer.current);
    if (immediate) latest.current(next);
    else timer.current = window.setTimeout(() => latest.current(next), delay);
  };

  return (
    <TextField
      value={text}
      onChange={(e) => {
        setText(e.target.value);
        commit(e.target.value);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") commit(text, true);
        if (e.key === "Escape" && text) {
          setText("");
          commit("", true);
        }
      }}
      placeholder={placeholder}
      autoFocus={autoFocus}
      fullWidth={fullWidth}
      size={size}
      type="search"
      autoComplete="off"
      sx={[{ "& input::-webkit-search-cancel-button": { display: "none" } }, ...(Array.isArray(sx) ? sx : [sx])]}
      slotProps={{
        htmlInput: { "aria-label": rest["aria-label"] ?? placeholder },
        input: {
          startAdornment: (
            <InputAdornment position="start">
              <SearchRounded fontSize="small" />
            </InputAdornment>
          ),
          endAdornment: text ? (
            <InputAdornment position="end">
              <IconButton
                size="small"
                aria-label="Clear search"
                onClick={() => {
                  setText("");
                  commit("", true);
                }}
                sx={{ width: 32, height: 32 }}
              >
                <CloseRounded fontSize="small" />
              </IconButton>
            </InputAdornment>
          ) : undefined,
        },
      }}
    />
  );
};

export default SearchField;
