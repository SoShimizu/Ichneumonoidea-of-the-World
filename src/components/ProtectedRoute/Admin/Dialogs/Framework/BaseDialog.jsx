import React, { useId, useMemo, useState, useCallback } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Button,
  Stack,
  Box,
  Tooltip,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import SaveIcon from "@mui/icons-material/Save";
import DeleteIcon from "@mui/icons-material/Delete";
import ConfirmDialog from "./ConfirmDialog";

/**
 * 再利用可能なダイアログの骨組み
 *
 * 追加: headerAddon をタイトル直下に固定表示（スクロール非対象）
 *
 * props:
 * - open, title, subtitle, onClose ...
 * - headerAddon?: ReactNode     ← ★ タイトル直下の固定領域
 * - paperProps?: object         ← PaperProps (sx はマージ)
 * - children: ReactNode         ← スクロール領域
 */
export default function BaseDialog({
  open,
  title,
  subtitle,
  onClose,
  onSubmit,
  submitText = "Save",
  cancelText = "Cancel",
  loading = false,
  disabled = false,
  onDelete,
  deleteText = "Delete",
  showCloseIcon = true,
  fullWidth = true,
  maxWidth = "md",
  keepMounted = false,
  disableBackdropClose = false,
  disableEscapeClose = false,
  confirmCloseWhen = false,
  confirmCloseMessage = "You have unsaved changes. Close without saving?",
  actionsLeft,
  actionsRight,
  headerAddon,                 // ★ 追加
  paperProps,
  children,
}) {
  const LOG_TAG = "[BaseDialog]";
  const labelId = useId();

  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [confirmCloseOpen, setConfirmCloseOpen] = useState(false);

  const canSubmit = useMemo(() => !loading && !disabled && !!onSubmit, [loading, disabled, onSubmit]);

  const handleDeleteClick = useCallback(() => setConfirmDeleteOpen(true), []);

  const handleConfirmDelete = useCallback(async () => {
    setConfirmDeleteOpen(false);
    try {
      console.debug(`${LOG_TAG} onDelete()`);
      await onDelete?.();
    } catch (e) {
      console.error(`${LOG_TAG} onDelete error`, e);
    }
  }, [onDelete]);

  const requestClose = useCallback(
    (evt, reason) => {
      if (disableBackdropClose && reason === "backdropClick") return;
      if (disableEscapeClose && reason === "escapeKeyDown") return;
      if (confirmCloseWhen) {
        setConfirmCloseOpen(true);
        return;
      }
      console.debug(`${LOG_TAG} onClose(false)`);
      onClose?.(false);
    },
    [disableBackdropClose, disableEscapeClose, confirmCloseWhen, onClose]
  );

  const handleSubmit = useCallback(async () => {
    if (!canSubmit) return;
    try {
      console.debug(`${LOG_TAG} onSubmit()`);
      await onSubmit?.();
    } catch (e) {
      console.error(`${LOG_TAG} onSubmit error`, e);
    }
  }, [canSubmit, onSubmit]);

  // PaperProps を安全にマージ（固定ヘッダーを活かすため overflow hidden をデフォルト付与）
  const mergedPaperProps = useMemo(() => {
    const base = { sx: { overflow: "hidden" } }; // コンテンツのみスクロールさせる
    if (!paperProps) return base;
    const sx = { ...(base.sx || {}), ...(paperProps.sx || {}) };
    return { ...paperProps, sx };
  }, [paperProps]);

  return (
    <>
      <Dialog
        open={open}
        onClose={requestClose}
        fullWidth={fullWidth}
        maxWidth={maxWidth}
        keepMounted={keepMounted}
        aria-labelledby={labelId}
        PaperProps={mergedPaperProps}
      >
        {/* Title */}
        <DialogTitle
          id={labelId}
          sx={{
            pr: showCloseIcon ? 6 : 3,
            fontWeight: 700,
            display: "flex",
            alignItems: "center",
            gap: 1,
          }}
        >
          <Box sx={{ flex: 1 }}>
            {title}
            {subtitle ? (
              <Box sx={{ mt: 0.5, fontSize: 12, opacity: 0.7 }}>{subtitle}</Box>
            ) : null}
          </Box>

          {showCloseIcon && (
            <Tooltip title="Close">
              <span>
                <IconButton
                  size="small"
                  onClick={(e) => requestClose(e, "closeButton")}
                  disabled={loading}
                  edge="end"
                  sx={{ ml: "auto" }}
                >
                  <CloseIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
          )}
        </DialogTitle>

        {/* ★ タイトル直下（固定／非スクロール領域） */}
        {headerAddon ? (
          <Box
            sx={{
              borderTop: 1,
              borderBottom: 1,
              borderColor: "divider",
              bgcolor: "background.default",
            }}
          >
            {headerAddon}
          </Box>
        ) : null}

        {/* 本文（ここだけスクロール） */}
        <DialogContent dividers sx={{ p: 2.5, maxHeight: "70vh" }}>
          {children}
        </DialogContent>

        {/* Actions */}
        <DialogActions sx={{ p: 2, justifyContent: "space-between" }}>
          {/* left */}
          <Stack direction="row" spacing={1} alignItems="center">
            {onDelete && (
              <Button
                color="error"
                onClick={handleDeleteClick}
                startIcon={<DeleteIcon />}
                disabled={loading}
              >
                {deleteText}
              </Button>
            )}
            {actionsLeft}
          </Stack>

          {/* right */}
          <Stack direction="row" spacing={1} alignItems="center">
            {actionsRight}
            <Button onClick={(e) => requestClose(e, "cancelButton")} disabled={loading} startIcon={<CloseIcon />}>
              {cancelText}
            </Button>
            <Button
              variant="contained"
              color="primary"
              onClick={handleSubmit}
              startIcon={<SaveIcon />}
              disabled={!canSubmit}
            >
              {loading ? "Saving..." : submitText}
            </Button>
          </Stack>
        </DialogActions>
      </Dialog>

      {/* Delete 確認 */}
      <ConfirmDialog
        open={confirmDeleteOpen}
        title="Confirm Deletion"
        message="This action cannot be undone. Delete this item?"
        confirmText={deleteText}
        cancelText="Cancel"
        onCancel={() => setConfirmDeleteOpen(false)}
        onConfirm={handleConfirmDelete}
      />

      {/* Close 確認 */}
      <ConfirmDialog
        open={confirmCloseOpen}
        title="Discard changes?"
        message={confirmCloseMessage}
        confirmText="Discard"
        cancelText="Back"
        onCancel={() => setConfirmCloseOpen(false)}
        onConfirm={() => {
          setConfirmCloseOpen(false);
          onClose?.(false);
        }}
      />
    </>
  );
}
