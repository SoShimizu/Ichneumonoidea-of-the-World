import React, { useState, useEffect } from "react";
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, Stack, IconButton, Typography, Avatar, CircularProgress
} from "@mui/material";
import { Delete, Edit } from "@mui/icons-material";
import supabase from "../utils/supabase";

export default function CommentManagerDialog({ open, onClose, user }) {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingComment, setEditingComment] = useState(null);
  const [newContent, setNewContent] = useState("");

  useEffect(() => {
    if (open) {
      fetchComments();
    }
  }, [open]);

  const fetchComments = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("recent_comments")
      .select("*")
      .order("created_at", { ascending: false });
    setComments(data || []);
    setLoading(false);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this comment?")) return;
    await supabase.from("recent_comments").delete().eq("id", id);
    fetchComments();
  };

  const handleEdit = (comment) => {
    setEditingComment(comment);
    setNewContent(comment.content);
  };

  const handleSave = async () => {
    if (!newContent.trim()) return;

    if (editingComment) {
      await supabase
        .from("recent_comments")
        .update({ content: newContent, updated_at: new Date() })
        .eq("id", editingComment.id);
    } else {
      await supabase.from("recent_comments").insert({
        user_id: user.id,
        username: user.user_metadata?.display_name || user.email,
        content: newContent,
      });
    }

    setEditingComment(null);
    setNewContent("");
    fetchComments();
  };

  const handleCancelEdit = () => {
    setEditingComment(null);
    setNewContent("");
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Manage Comments</DialogTitle>
      <DialogContent dividers>
        {loading ? (
          <Stack alignItems="center" py={4}>
            <CircularProgress />
          </Stack>
        ) : (
          <Stack spacing={2}>
            {comments.map((comment) => (
              <Stack key={comment.id} spacing={1}>
                <Stack direction="row" spacing={2} alignItems="center">
                  <Avatar>{comment.username?.charAt(0) || "?"}</Avatar>
                  <Typography fontWeight="bold">
                    {comment.username}
                  </Typography>
                  <IconButton size="small" onClick={() => handleEdit(comment)}>
                    <Edit fontSize="small" />
                  </IconButton>
                  <IconButton size="small" onClick={() => handleDelete(comment.id)}>
                    <Delete fontSize="small" />
                  </IconButton>
                </Stack>
                <Typography variant="body2" sx={{ whiteSpace: "pre-wrap", ml: 6 }}>
                  {comment.content}
                </Typography>
              </Stack>
            ))}
          </Stack>
        )}
      </DialogContent>

      <DialogActions sx={{ flexDirection: "column", alignItems: "stretch", gap: 2 }}>
        <TextField
          multiline
          minRows={3}
          label={editingComment ? "Edit Comment" : "New Comment"}
          value={newContent}
          onChange={(e) => setNewContent(e.target.value)}
          fullWidth
        />
        <Stack direction="row" spacing={2} justifyContent="center" width="100%">
          <Button variant="contained" color="primary" onClick={handleSave}>
            {editingComment ? "Save Changes" : "Add Comment"}
          </Button>
          {editingComment && (
            <Button variant="outlined" color="secondary" onClick={handleCancelEdit}>
              Cancel
            </Button>
          )}
          <Button variant="text" onClick={onClose}>
            Close
          </Button>
        </Stack>
      </DialogActions>
    </Dialog>
  );
}
