import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box, Container, Typography, Grid, Card, CardContent,
  Stack, Divider, Paper, CircularProgress, IconButton,
  Button, Avatar
} from "@mui/material";
import { motion } from "framer-motion";
import {
  Storage, BarChart, Group, Update, ExpandMore, AddComment, AccountTree
} from '@mui/icons-material';
import supabase from "../../utils/supabase";
import bgImage from "../../images/top.jpg";
import CommentDialog from "../CommentDialog";  // ✅ コメントダイアログ
import UpdateDialog from "../UpdateDialog";    // ✅ 更新ログダイアログ（追加！）
import LoadingScreen from "../LoadingScreen";

export default function Home() {
  const navigate = useNavigate();
  const [auditLogs, setAuditLogs] = useState([]);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [timeZone, setTimeZone] = useState("UTC");
  const [openCommentDialog, setOpenCommentDialog] = useState(false);
  const [openUpdateDialog, setOpenUpdateDialog] = useState(false); // ✅ 追加

  useEffect(() => {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    setTimeZone(tz);

    (async () => {
      const { data: auditData } = await supabase
        .from("audit_log")
        .select("*")
        .order("changed_at", { ascending: false })
        .limit(5);

      const { data: commentData } = await supabase
        .from("recent_comments")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(5);

      setAuditLogs(auditData || []);
      setComments(commentData || []);
      setLoading(false);
    })();
  }, []);

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return `${date.toLocaleString()} (${timeZone})`;
  };

  const scrollToContent = () => {
    window.scrollTo({ top: window.innerHeight, behavior: "smooth" });
  };

  if (loading) {
        return <LoadingScreen />;
  }
  
  return (
    <Box>
      {/* 🎯 Hero Section */}
      <Box
        sx={{
          position: "relative",
          width: "100vw",
          height: { xs: "50vh", md: "65vh" },
          backgroundImage: `url(${bgImage})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
          overflow: "hidden",
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "center",
          pb: { xs: 8, md: 10 },
        }}
      >
        <Box
          sx={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            background: "linear-gradient(to top, rgba(0,0,0,0.5), rgba(0,0,0,0))",
            zIndex: 1,
          }}
        />
        <Box
          sx={{
            position: "relative",
            zIndex: 2,
            color: "white",
            textAlign: "center",
            px: 2,
          }}
        >
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1 }}>
            <Typography variant="h2" fontWeight="bold" sx={{ fontSize: { xs: "2rem", md: "3.5rem" }, mb: 1 }}>
              Ichneumonoidea of the World
            </Typography>
            <Typography variant="h6" sx={{ opacity: 0.9, fontSize: { xs: "0.9rem", md: "1.3rem" } }}>
              Database for Exploring the Global Biodiversity of Ichneumonoidea
            </Typography>
          </motion.div>

          <motion.div animate={{ y: [0, 10, 0] }} transition={{ repeat: Infinity, duration: 2 }}>
            <IconButton onClick={scrollToContent} sx={{ color: "white", mt: 2 }}>
              <ExpandMore fontSize="large" />
            </IconButton>
          </motion.div>
        </Box>
      </Box>

      {/* 🌟 Explore the Site Section */}
      <Container sx={{ py: 8 }}>
        <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }} viewport={{ once: true }}>
          <Typography variant="h4" textAlign="center" fontWeight="bold" gutterBottom>
            Explore the Site
          </Typography>
          <Divider sx={{ mb: 6 }} />
        </motion.div>

        <Grid container spacing={4} justifyContent="center">
          {[
            { title: "Taxonomy Explorer", text: "Navigate the hierarchical taxonomy tree.", link: "/taxonomy", icon: <AccountTree fontSize="large" /> },
            { title: "Database", text: "Browse a comprehensive dataset of Ichneumonoidea.", link: "/database", icon: <Storage fontSize="large" /> },
            { title: "Statistics", text: "Visualize diversity patterns and trends.", link: "/statistics", icon: <BarChart fontSize="large" /> },
            { title: "Admin Team", text: "Meet the dedicated team managing the database.", link: "/admin-team", icon: <Group fontSize="large" /> }
          ].map((item, idx) => (
            <Grid item xs={12} sm={6} md={4} key={idx}>
              <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: idx * 0.2 }} viewport={{ once: true }}>
                <Card
                  sx={{
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    textAlign: "center",
                    p: 3,
                    transition: "0.3s",
                    cursor: "pointer",
                    "&:hover": { boxShadow: 6 },
                  }}
                  onClick={() => navigate(item.link)}
                >
                  <Box sx={{ mb: 2 }}>{item.icon}</Box>
                  <CardContent sx={{ flexGrow: 1 }}>
                    <Typography variant="h6" fontWeight="bold" gutterBottom>
                      {item.title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {item.text}
                    </Typography>
                  </CardContent>
                </Card>
              </motion.div>
            </Grid>
          ))}
        </Grid>
      </Container>

      {/* 📝 Recent Data Updates */}
      <Container sx={{ py: 8 }}>
        <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }} viewport={{ once: true }}>
          <Stack direction="row" alignItems="center" spacing={1} justifyContent="center" mb={2}>
            <Update color="primary" />
            <Typography variant="h4" fontWeight="bold">
              Recent Data Updates
            </Typography>
          </Stack>
          <Typography textAlign="center" color="text.secondary" sx={{ mb: 3 }}>
            Showing the most recent 5 updates
          </Typography>
          <Divider sx={{ mb: 4 }} />
        </motion.div>

        {loading ? (
          <Box display="flex" justifyContent="center" py={4}>
            <CircularProgress />
          </Box>
        ) : auditLogs.length === 0 ? (
          <Typography align="center" color="text.secondary">
            No recent data updates.
          </Typography>
        ) : (
          <Stack spacing={2}>
            {auditLogs.map((log, index) => (
              <motion.div key={index} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: index * 0.1 }}>
                <Paper elevation={3} sx={{ p: 2 }}>
                  <Typography variant="body1" fontWeight="bold" gutterBottom>
                    {log.changed_by} - {formatDate(log.changed_at)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {log.action} on <strong>{log.table_name}</strong> {log.row_id && `(ID: ${log.row_id})`}
                  </Typography>
                </Paper>
              </motion.div>
            ))}
          </Stack>
        )}

        <Stack alignItems="center" mt={4}>
          <Button variant="outlined" color="primary" size="small" onClick={() => setOpenUpdateDialog(true)}>
            See All Updates
          </Button>
        </Stack>
      </Container>

      {/* 🗨️ Recent Admin Comments */}
      <Container sx={{ py: 8 }}>
        <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }} viewport={{ once: true }}>
          <Stack direction="row" alignItems="center" spacing={1} justifyContent="center" mb={2}>
            <AddComment color="secondary" />
            <Typography variant="h4" fontWeight="bold">
              Recent Admin Comments
            </Typography>
          </Stack>
          <Typography textAlign="center" color="text.secondary" sx={{ mb: 3 }}>
            Showing the most recent 5 comments
          </Typography>
          <Divider sx={{ mb: 4 }} />
        </motion.div>

        {loading ? (
          <Box display="flex" justifyContent="center" py={4}>
            <CircularProgress />
          </Box>
        ) : comments.length === 0 ? (
          <Typography align="center" color="text.secondary">
            No comments yet.
          </Typography>
        ) : (
          <Stack spacing={2}>
            {comments.map((comment, index) => (
              <motion.div key={index} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: index * 0.1 }}>
                <Paper elevation={3} sx={{ p: 2 }}>
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
              </motion.div>
            ))}
          </Stack>
        )}

        <Stack alignItems="center" mt={4}>
          <Button variant="outlined" color="secondary" size="small" onClick={() => setOpenCommentDialog(true)}>
            See All Comments
          </Button>
        </Stack>
      </Container>

      {/* 🔥 ダイアログ呼び出し */}
      <CommentDialog open={openCommentDialog} onClose={() => setOpenCommentDialog(false)} />
      <UpdateDialog open={openUpdateDialog} onClose={() => setOpenUpdateDialog(false)} />
    </Box>
  );
}
