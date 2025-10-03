import React from "react";
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, Typography, Stack, IconButton
} from "@mui/material";
import { Close as CloseIcon, ContentCopy as ContentCopyIcon } from "@mui/icons-material";

export default function EntityDetailDialog({ open, onClose, title, content, onDuplicate }) {
  // 非表示のときはコンポーネント自体を返さない（content()も呼ばれない）
  if (!open) return null;

  const renderBody = () => {
    if (typeof content === "function") {
      try {
        return content();
      } catch (e) {
        // 念のための安全策（null参照など）
        return <Typography color="error">Failed to render content: {String(e?.message || e)}</Typography>;
      }
    }
    return content;
  };

  return (
    <Dialog open onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Typography variant="h6">{title}</Typography>
          <IconButton onClick={onClose}><CloseIcon /></IconButton>
        </Stack>
      </DialogTitle>
      <DialogContent>{renderBody()}</DialogContent>
      <DialogActions>
        {onDuplicate && <Button onClick={onDuplicate} startIcon={<ContentCopyIcon />}>Duplicate</Button>}
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}
