import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Box,
  Typography,
  IconButton,
  TextField,
  Paper,
  Stack,
  Tooltip,
  Badge,
} from "@mui/material";
import ChatIcon from "@mui/icons-material/Chat";
import CloseIcon from "@mui/icons-material/Close";
import SendIcon from "@mui/icons-material/Send";
import DeleteIcon from "@mui/icons-material/Delete";
import ReplyIcon from "@mui/icons-material/Reply";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import Draggable from "react-draggable";
import supabase from "../../../../utils/supabase"; // ←ここ注意
import { useInView } from "react-intersection-observer";

export default function AdminChatDialog({ currentUserName }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [unreadCount, setUnreadCount] = useState(0);
  const [replyTo, setReplyTo] = useState(null); // 🔥 返信対象
  const nodeRef = useRef(null);
  const scrollRef = useRef(null);
  const messageRefs = useRef({});

  const markAsRead = useCallback(async (message) => {
    if (!message.read_by?.includes(currentUserName)) {
      const { error } = await supabase
        .from("admin_chats")
        .update({ read_by: [...(message.read_by || []), currentUserName] })
        .eq("id", message.id);
      if (error) console.error("Error marking as read:", error);
    }
  }, [currentUserName]);

  useEffect(() => {
    const fetchMessages = async () => {
      const { data, error } = await supabase
        .from("admin_chats")
        .select("*")
        .order("created_at", { ascending: true });
      if (error) {
        console.error("Error fetching messages:", error);
      } else {
        setMessages(data || []);
      }
    };

    fetchMessages();

    const subscription = supabase
      .channel('realtime:public:admin_chats')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'admin_chats' }, (payload) => {
        setMessages((prev) => [...prev, payload.new]);
        if (!open) {
          setUnreadCount((count) => count + 1);
        }
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'admin_chats' }, (payload) => {
        setMessages((prev) =>
          prev.map((msg) => (msg.id === payload.new.id ? payload.new : msg))
        );
      })
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [open]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;
    const { error } = await supabase.from("admin_chats").insert({
      user_name: currentUserName,
      message: input.trim(),
      reactions: {},
      read_by: [currentUserName],
      reply_to: replyTo?.id || null, // 🔥 返信対象IDを送信
    });
    if (error) {
      console.error("Error sending message:", error);
    } else {
      setInput("");
      setReplyTo(null);
    }
  };

  const scrollToMessage = (id) => {
    const el = messageRefs.current[id];
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  const handleOpen = () => {
    setOpen(true);
    setUnreadCount(0);
  };

  if (!currentUserName) return null;

  return (
    <Box sx={{ position: "fixed", bottom: 16, right: 16, zIndex: 1300 }}>
      {!open && (
        <Tooltip title="Open Admin Chat" arrow>
          <IconButton
            color="primary"
            onClick={handleOpen}
            sx={{ bgcolor: "#2a2f32", color: "#00c853", boxShadow: 3 }}
          >
            <Badge badgeContent={unreadCount} color="error">
              <ChatIcon />
            </Badge>
          </IconButton>
        </Tooltip>
      )}

      {open && (
        <Draggable nodeRef={nodeRef} handle=".handle" cancel=".MuiTextField-root">
          <Paper
            ref={nodeRef}
            elevation={12}
            sx={{
              width: 340,
              height: 500,
              minWidth: 280,
              minHeight: 300,
              display: "flex",
              flexDirection: "column",
              borderRadius: 2,
              overflow: "hidden",
              resize: "both",
              overflowAnchor: "none",
              backgroundColor: "#1e1e1e",
              border: "5px solid #545454",
              boxShadow: "0 8px 24px rgba(0, 0, 0, 0.3)",
            }}
          >
            {/* 上部バー */}
            <Box
              className="handle"
              sx={{
                bgcolor: "#121212",
                color: "white",
                p: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                cursor: "move",
              }}
            >
              <Typography variant="subtitle1" fontWeight="bold">
                Admin Chat {unreadCount > 0 && `(${unreadCount})`}
              </Typography>
              <IconButton size="small" onClick={() => setOpen(false)} sx={{ color: "white" }}>
                <CloseIcon fontSize="small" />
              </IconButton>
            </Box>

            {/* メッセージエリア */}
            <Box
              sx={{
                flexGrow: 1,
                p: 1,
                overflowY: "auto",
                display: "flex",
                flexDirection: "column",
                gap: 1,
                backgroundColor: "#1e1e1e",
              }}
            >
              {messages.map((msg) => (
                <MessageItem
                  key={msg.id}
                  msg={msg}
                  allMessages={messages}
                  currentUserName={currentUserName}
                  markAsRead={markAsRead}
                  setReplyTo={setReplyTo}
                  scrollToMessage={scrollToMessage}
                  messageRefs={messageRefs}
                />
              ))}
              <div ref={scrollRef} />
            </Box>

            {/* 返信中の表示 */}
            {replyTo && (
              <Box sx={{ p: 1, bgcolor: "#333", fontSize: "0.75rem", color: "#ccc" }}>
                Replying to: {replyTo.message.slice(0, 30)}
                <IconButton
                  size="small"
                  onClick={() => setReplyTo(null)}
                  sx={{ ml: 1, color: "white" }}
                >
                  <CloseIcon fontSize="small" />
                </IconButton>
              </Box>
            )}

            {/* 入力エリア */}
            <Box sx={{ p: 1, borderTop: "1px solid #333", bgcolor: "#121212" }}>
              <Stack direction="row" spacing={1}>
                <TextField
                  fullWidth
                  multiline
                  minRows={1}
                  maxRows={5}
                  size="small"
                  placeholder="Type a message..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  sx={{
                    bgcolor: "#2a2f32",
                    color: "white",
                    borderRadius: 1,
                    "& .MuiInputBase-root": { color: "white" },
                    "& .MuiOutlinedInput-notchedOutline": { borderColor: "#555" },
                  }}
                />
                <IconButton
                  onClick={handleSend}
                  disabled={!input.trim()}
                  size="small"
                  sx={{
                    bgcolor: "#00c853",
                    color: "white",
                    "&:hover": { bgcolor: "#00b342" },
                  }}
                >
                  <SendIcon fontSize="small" />
                </IconButton>
              </Stack>
            </Box>
          </Paper>
        </Draggable>
      )}
    </Box>
  );
}

function MessageItem({ msg, allMessages, currentUserName, markAsRead, setReplyTo, scrollToMessage, messageRefs }) {
  const { ref, inView } = useInView({ triggerOnce: true });

  useEffect(() => {
    if (inView) {
      markAsRead(msg);
    }
  }, [inView, msg, markAsRead]);

  const isRead = msg.read_by?.includes(currentUserName);
  const replyMessage = allMessages.find((m) => m.id === msg.reply_to);

  const handleDelete = async () => {
    if (window.confirm("Delete this message?")) {
      const { error } = await supabase.from("admin_chats").delete().eq("id", msg.id);
      if (error) {
        console.error("Failed:", error);
      }
    }
  };

  return (
    <Box
      ref={(el) => { ref(el); if (el) messageRefs.current[msg.id] = el; }}
      sx={{
        alignSelf: msg.user_name === currentUserName ? "flex-end" : "flex-start",
        maxWidth: "80%",
      }}
    >
      {/* 送信者と時刻 */}
      <Typography variant="caption" sx={{ color: "#999", fontSize: "0.7rem" }}>
        {msg.user_name} ・ {new Date(msg.created_at).toLocaleString()}
      </Typography>

      {/* メッセージ本体 */}
      <Paper
        variant="outlined"
        sx={{
          p: 1,
          mt: 0.5,
          backgroundColor: isRead ? (msg.user_name === currentUserName ? "#008c3a" : "#333") : "#004d40",
          color: "#fff",
          wordBreak: "break-word",
          whiteSpace: "pre-wrap",
          borderRadius: 2,
          border: "none",
          fontSize: "0.8rem",
          lineHeight: 1.6,
        }}
      >
        {/* 引用メッセージ（返信元） */}
        {replyMessage && (
          <Box
            sx={{
              bgcolor: "#444",
              p: 0.5,
              mb: 0.5,
              borderRadius: 1,
              fontSize: "0.7rem",
              color: "#ccc",
              cursor: "pointer",
            }}
            onClick={() => scrollToMessage(replyMessage.id)}
          >
            <ArrowDownwardIcon fontSize="inherit" /> {replyMessage.message.slice(0, 50)}
          </Box>
        )}

        {/* 本文 */}
        {msg.message}

        {/* 🔥 下にボタン（リプライ・削除） */}
        <Stack direction="row" spacing={1} justifyContent="flex-end" mt={1}>
          <IconButton size="small" onClick={() => setReplyTo(msg)} sx={{ color: "white" }}>
            <ReplyIcon fontSize="small" />
          </IconButton>

          {msg.user_name === currentUserName && (
            <IconButton size="small" onClick={handleDelete} sx={{ color: "red" }}>
              <DeleteIcon fontSize="small" />
            </IconButton>
          )}
        </Stack>
      </Paper>
    </Box>
  );
}

