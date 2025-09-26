import React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  IconButton,
  Typography,
  Box,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";

export default function ChartDialog({
  open,
  onClose,
  title,
  description,
  content,
}) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="xl" fullWidth>
      <DialogTitle>
        <Typography variant="h2">{title}</Typography>
        <IconButton
          onClick={onClose}
          sx={{ position: "absolute", right: 8, top: 8 }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers>
        <DialogContentText
          sx={{
            mb: 3,
            fontSize: { xs: "0.9rem", md: "1rem" },
            color: "text.secondary",
          }}
        >
          {description}
        </DialogContentText>

        {/* チャート部分中央寄せ + 余白 */}
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            my: 4, // 上下余白
            width: "100%",
          }}
        >
          {content}
        </Box>
      </DialogContent>
    </Dialog>
  );
}
