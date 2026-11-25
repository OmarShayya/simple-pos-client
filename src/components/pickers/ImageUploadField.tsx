import React, { useRef, useState } from "react";
import { Avatar, Box, Button, CircularProgress, FormHelperText, Stack, Typography } from "@mui/material";
import { DeleteOutlineRounded, ImageOutlined, UploadRounded } from "@mui/icons-material";
import { uploadImageToFirebase } from "@/utils/firebaseUpload";

export interface ImageUploadFieldProps {
  label?: string;
  /** Image URL, or empty. */
  value: string | undefined;
  onChange: (url: string | undefined) => void;
  /** Storage folder ("products", "categories"). */
  folder: string;
  /** Tells the parent an upload is running (block saving meanwhile). */
  onUploadingChange?: (uploading: boolean) => void;
  disabled?: boolean;
}

const MAX_MB = 5;

/** Photo picker: preview + "Upload photo" / "Change" / "Remove". Uploads right away and returns the URL. */
const ImageUploadField: React.FC<ImageUploadFieldProps> = ({ label = "Photo", value, onChange, folder, onUploadingChange, disabled }) => {
  const input = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pick = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    if (!file.type.startsWith("image/")) return setError("Choose a photo (JPG, PNG or WebP).");
    if (file.size > MAX_MB * 1024 * 1024) return setError(`The photo is too big — up to ${MAX_MB} MB.`);
    setUploading(true);
    onUploadingChange?.(true);
    try {
      onChange(await uploadImageToFirebase(file, folder));
    } catch {
      setError("Couldn't upload the photo. Check the connection and try again.");
    } finally {
      setUploading(false);
      onUploadingChange?.(false);
      if (input.current) input.current.value = "";
    }
  };

  return (
    <Box>
      <Typography variant="subtitle2" component="div" sx={{ mb: 1 }}>
        {label} <Typography component="span" variant="body2" color="text.secondary">(optional)</Typography>
      </Typography>
      <Stack direction="row" spacing={2} alignItems="center">
        <Avatar src={value} variant="rounded" alt="" sx={{ width: 72, height: 72, borderRadius: "8px", bgcolor: "action.hover", color: "text.secondary", border: 1, borderColor: "divider" }}>
          <ImageOutlined />
        </Avatar>
        <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
          <Button
            variant="outlined"
            startIcon={uploading ? <CircularProgress size={18} color="inherit" /> : <UploadRounded />}
            disabled={disabled || uploading}
            onClick={() => input.current?.click()}
          >
            {uploading ? "Uploading…" : value ? "Change photo" : "Upload photo"}
          </Button>
          {value && !uploading && (
            <Button color="error" startIcon={<DeleteOutlineRounded />} disabled={disabled} onClick={() => onChange(undefined)}>
              Remove
            </Button>
          )}
        </Stack>
        <input ref={input} type="file" accept="image/*" hidden onChange={(e) => pick(e.target.files?.[0])} />
      </Stack>
      {error && <FormHelperText error>{error}</FormHelperText>}
    </Box>
  );
};

export default ImageUploadField;
