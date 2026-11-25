import React, { useState } from "react";
import { Button, Chip, ListItemText, Menu, MenuItem } from "@mui/material";
import { LocalOfferOutlined } from "@mui/icons-material";
import type { Discount } from "@/types/discount.types";

export interface DiscountPickerProps {
  /** Discounts that apply here. Nothing renders when there are none. */
  options: Discount[];
  /** Selected discount id ("" = none). */
  value: string;
  onChange: (discountId: string) => void;
  /** What it applies to, for screen readers: "Red Bull", "the whole order". */
  target: string;
}

/**
 * Compact discount control for cart lines: an "Add discount" link that opens the list, and the
 * applied discount as a removable chip — keeps each cart line one row tall.
 */
const DiscountPicker: React.FC<DiscountPickerProps> = ({ options, value, onChange, target }) => {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  if (!options.length) return null;
  const current = options.find((d) => d.id === value);

  return (
    <>
      {current ? (
        <Chip
          size="small"
          color="success"
          variant="outlined"
          icon={<LocalOfferOutlined />}
          label={`${current.name} (−${current.value}%)`}
          onClick={(e) => setAnchor(e.currentTarget)}
          onDelete={() => onChange("")}
          aria-label={`Discount on ${target}: ${current.name}. Change`}
          sx={{ maxWidth: "100%" }}
        />
      ) : (
        <Button
          size="small"
          variant="text"
          startIcon={<LocalOfferOutlined />}
          onClick={(e) => setAnchor(e.currentTarget)}
          aria-label={`Add a discount to ${target}`}
          sx={{ minHeight: 32, px: 1, ml: -1 }}
        >
          Add discount
        </Button>
      )}
      <Menu anchorEl={anchor} open={Boolean(anchor)} onClose={() => setAnchor(null)}>
        {options.map((d) => (
          <MenuItem
            key={d.id}
            selected={d.id === value}
            onClick={() => {
              onChange(d.id);
              setAnchor(null);
            }}
          >
            <ListItemText primary={d.name} secondary={`${d.value}% off`} />
          </MenuItem>
        ))}
        {current && (
          <MenuItem
            onClick={() => {
              onChange("");
              setAnchor(null);
            }}
          >
            <ListItemText primary="No discount" />
          </MenuItem>
        )}
      </Menu>
    </>
  );
};

export default DiscountPicker;
