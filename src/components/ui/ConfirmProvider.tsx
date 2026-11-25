import React, { useCallback, useRef, useState } from "react";
import ConfirmDialog from "./ConfirmDialog";
import { ConfirmContext, type ConfirmOptions } from "./confirmContext";

/** Mounted once at the app root; powers `useConfirm()`. */
const ConfirmProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const [open, setOpen] = useState(false);
  const resolver = useRef<((ok: boolean) => void) | null>(null);

  const confirm = useCallback((opts: ConfirmOptions) => {
    resolver.current?.(false);
    setOptions(opts);
    setOpen(true);
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  const finish = (ok: boolean) => {
    resolver.current?.(ok);
    resolver.current = null;
    setOpen(false);
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {options && (
        <ConfirmDialog
          open={open}
          title={options.title}
          message={options.message}
          confirmLabel={options.confirmLabel}
          cancelLabel={options.cancelLabel}
          tone={options.tone}
          onConfirm={() => finish(true)}
          onClose={() => finish(false)}
        />
      )}
    </ConfirmContext.Provider>
  );
};

export default ConfirmProvider;
