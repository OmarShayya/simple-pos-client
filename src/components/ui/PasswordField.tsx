import React, { useState } from "react";
import { IconButton, InputAdornment, TextField, Tooltip, type TextFieldProps } from "@mui/material";
import { VisibilityOffOutlined, VisibilityOutlined } from "@mui/icons-material";

/** Password input with a "show password" eye button (older users mistype a lot on touch screens). */
const PasswordField: React.FC<Omit<TextFieldProps, "type">> = (props) => {
  const [show, setShow] = useState(false);
  return (
    <TextField
      {...props}
      type={show ? "text" : "password"}
      slotProps={{
        ...props.slotProps,
        input: {
          endAdornment: (
            <InputAdornment position="end">
              <Tooltip title={show ? "Hide password" : "Show password"}>
                <IconButton onClick={() => setShow((v) => !v)} edge="end" aria-label={show ? "Hide password" : "Show password"}>
                  {show ? <VisibilityOffOutlined /> : <VisibilityOutlined />}
                </IconButton>
              </Tooltip>
            </InputAdornment>
          ),
        },
      }}
    />
  );
};

export default PasswordField;
