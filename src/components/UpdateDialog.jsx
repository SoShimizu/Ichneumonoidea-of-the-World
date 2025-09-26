// src/components/UpdateDialog.jsx
import React, { useEffect, useState } from "react";
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, Typography, Stack, Paper, CircularProgress,
  TextField, Pagination
} from "@mui/material";
import supabase from "../utils/supabase";

export default function UpdateDialog({ open, onClose, timeZone }) {
  const [updates, setUpdates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10); // 1ページ10件
  const [searchQuery, setSearchQuery] = useState("");
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    if (open) {
      fetchUpdates();
    }
  }, [open, page, searchQuery]);

  const fetchUpdates = async () => {
    setLoading(true);
    let query = supabase
      .from("audit_log")
      .select("*", { count: "exact" })
      .order("changed_at", { ascending: false });

    if (searchQuery) {
      query = query.or(`action.ilike.%${searchQuery}%,table_name.ilike.%${searchQuery}%,changed_by.ilike.%${searchQuery}%`);
    }

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const { data, count, error } = await query.range(from, to);
    if (!error) {
      setUpdates(data || []);
      setTotalCount(count || 0);
    }
    setLoading(false);
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return `${date.toLocaleString()} (${timeZone})`;
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>All Data Updates</DialogTitle>
      <DialogContent dividers sx={{ maxHeight: "70vh" }}>
        <TextField
          fullWidth
          size="small"
          placeholder="Search updates..."
          value={searchQuery}
          onChange={(e) => {
            setPage(1);
            setSearchQuery(e.target.value);
          }}
          sx={{ mb: 2 }}
        />

        {loading ? (
          <Stack alignItems="center" py={4}>
            <CircularProgress />
          </Stack>
        ) : updates.length === 0 ? (
          <Typography align="center" color="text.secondary">
            No updates found.
          </Typography>
        ) : (
          <Stack spacing={2}>
            {updates.map((update, index) => (
              <Paper key={index} elevation={3} sx={{ p: 2 }}>
                <Typography variant="body1" fontWeight="bold" gutterBottom>
                  {update.changed_by} - {formatDate(update.changed_at)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {update.action} on <strong>{update.table_name}</strong> {update.row_id && `(ID: ${update.row_id})`}
                </Typography>
              </Paper>
            ))}
          </Stack>
        )}

        {/* ✅ Pagination */}
        <Stack alignItems="center" mt={2}>
          <Pagination
            count={Math.ceil(totalCount / pageSize)}
            page={page}
            onChange={(e, value) => setPage(value)}
            color="primary"
          />
        </Stack>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} variant="contained" color="primary">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
}
