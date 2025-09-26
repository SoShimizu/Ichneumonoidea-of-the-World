// src/components/CommentDialog.jsx
import React, { useEffect, useState } from "react";
import {
  Box, Dialog, DialogTitle, DialogContent, DialogActions,
  Button, Typography, Stack, Paper, CircularProgress,
  Avatar, TextField, Pagination
} from "@mui/material";
import supabase from "../utils/supabase";

export default function CommentDialog({ open, onClose, timeZone }) {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [searchQuery, setSearchQuery] = useState("");
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    if (open) {
      fetchComments();
    }
  }, [open, page, searchQuery]);

  const fetchComments = async () => {
    setLoading(true);
    let query = supabase
      .from("recent_comments")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false });

    if (searchQuery) {
      query = query.or(`content.ilike.%${searchQuery}%,username.ilike.%${searchQuery}%`);
    }

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const { data, count, error } = await query.range(from, to);
    if (!error) {
      setComments(data || []);
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
      <DialogTitle>All Comments</DialogTitle>
      <DialogContent dividers sx={{ maxHeight: "70vh" }}>
        <TextField
          fullWidth
          size="small"
          placeholder="Search comments..."
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
        ) : comments.length === 0 ? (
          <Typography align="center" color="text.secondary">
            No comments found.
          </Typography>
        ) : (
          <Stack spacing={2}>
            {comments.map((comment, index) => (
              <Paper key={index} elevation={3} sx={{ p: 2 }}>
                <Stack direction="row" spacing={2} alignItems="center" mb={1}>
                  <Avatar sx={{ bgcolor: "primary.main" }}>
                    {comment.username?.charAt(0) || "?"}
                  </Avatar>
                  <Box>
                    <Typography variant="body1" fontWeight="bold">
                      {comment.username} - {formatDate(comment.created_at)}
                    </Typography>
                  </Box>
                </Stack>
                <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>
                  {comment.content}
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
            color="secondary"
          />
        </Stack>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} variant="contained" color="secondary">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
}
