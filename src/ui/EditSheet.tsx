// EditSheet.tsx — the one edit pattern (change request 2, section 4): a clear title,
// the fields, a live preview of the result, one primary Save, a quiet Cancel, and an
// optional Delete that asks for confirmation inside the same sheet.

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { Sheet } from "./Sheet";
import { Button } from "./Button";

export function EditSheet({
  open,
  onClose,
  title,
  caption,
  children,
  preview,
  saveLabel = "Save",
  canSave = true,
  onSave,
  deleteLabel,
  deleteConfirm,
  onDelete,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  caption?: string;
  children: ReactNode;
  /** Live preview of the result, shown above the buttons. */
  preview?: ReactNode;
  saveLabel?: string;
  canSave?: boolean;
  onSave: () => void;
  deleteLabel?: string;
  /** Confirmation text; when set, Delete asks first. */
  deleteConfirm?: string;
  onDelete?: () => void;
}) {
  const [confirming, setConfirming] = useState(false);
  useEffect(() => {
    if (open) setConfirming(false);
  }, [open]);

  if (confirming && onDelete) {
    return (
      <Sheet
        open={open}
        onClose={onClose}
        title={`${deleteLabel ?? "Delete"}?`}
        footer={
          <>
            <Button full variant="secondary" onClick={() => setConfirming(false)}>
              Keep it
            </Button>
            <Button
              variant="danger-text"
              onClick={() => {
                onDelete();
                onClose();
              }}
            >
              Yes, {(deleteLabel ?? "delete").toLowerCase()}
            </Button>
          </>
        }
      >
        <p className="text-body text-ink">{deleteConfirm}</p>
      </Sheet>
    );
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={title}
      caption={caption}
      footer={
        <>
          {preview && (
            <div data-testid="edit-preview" aria-live="polite" className="rounded-input bg-blue-tint px-4 py-3 text-label text-ink">
              {preview}
            </div>
          )}
          <Button
            full
            disabled={!canSave}
            onClick={() => {
              onSave();
              onClose();
            }}
          >
            {saveLabel}
          </Button>
          <div className="flex items-center justify-between">
            <Button variant="quiet" onClick={onClose}>
              Cancel
            </Button>
            {onDelete && (
              <Button variant="danger-text" onClick={() => (deleteConfirm ? setConfirming(true) : (onDelete(), onClose()))}>
                {deleteLabel ?? "Delete"}
              </Button>
            )}
          </div>
        </>
      }
    >
      <div className="flex flex-col gap-5">{children}</div>
    </Sheet>
  );
}
