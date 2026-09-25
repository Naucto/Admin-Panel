import { useState, useEffect, type FormEvent } from "react";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Stack,
  TextField
} from "@mui/material";

type ReasonDialogProps = {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  confirmColor?: "primary" | "error" | "warning" | "success";
  showReportId?: boolean;
  onClose: () => void;
  onConfirm: (reason: string, reportId?: number) => Promise<void> | void;
};

export function ReasonDialog({
  open,
  title,
  description,
  confirmLabel = "Confirm",
  confirmColor = "primary",
  showReportId = true,
  onClose,
  onConfirm
}: ReasonDialogProps): JSX.Element {
  const [reason, setReason] = useState("");
  const [reportId, setReportId] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setReason("");
      setReportId("");
      setSubmitting(false);
    }
  }, [open]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setSubmitting(true);
    try {
      const reportIdNum = reportId.trim() ? Number(reportId) : undefined;
      await onConfirm(reason.trim(), reportIdNum);
      onClose();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onClose={submitting ? undefined : onClose} fullWidth maxWidth="sm">
      <form onSubmit={handleSubmit}>
        <DialogTitle>{title}</DialogTitle>
        <DialogContent>
          {description && <DialogContentText sx={{ mb: 2 }}>{description}</DialogContentText>}
          <Stack spacing={2}>
            <TextField
              label="Reason (audit log)"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              multiline
              rows={3}
              fullWidth
              autoFocus
            />
            {showReportId && (
              <TextField
                label="Related report ID (optional)"
                value={reportId}
                onChange={(event) => setReportId(event.target.value)}
                inputProps={{ inputMode: "numeric", pattern: "[0-9]*" }}
                fullWidth
              />
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" color={confirmColor} variant="contained" disabled={submitting}>
            {confirmLabel}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
