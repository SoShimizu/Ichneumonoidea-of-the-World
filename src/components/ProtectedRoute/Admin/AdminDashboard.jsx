import React from "react";
import { useNavigate } from "react-router-dom";
import {
  AppBar,
  Alert,
  Box,
  Card,
  CardActionArea,
  CardContent,
  Container,
  Grid,
  Paper,
  Stack,
  Toolbar,
  Typography,
} from "@mui/material";
import DashboardIcon from "@mui/icons-material/Dashboard";
import LibraryBooksIcon from "@mui/icons-material/LibraryBooks";
import ScienceIcon from "@mui/icons-material/Science";
import ParkIcon from "@mui/icons-material/Park";
import InfoIcon from "@mui/icons-material/Info";

export default function AdminDashboard() {
  const navigate = useNavigate();

  const cards = [
    {
      title: "Publication Data Console",
      description: "Manage publication-based specimen records.",
      icon: <LibraryBooksIcon sx={{ fontSize: 60 }} />,
      path: "/admin/console-publications",
    },
    {
      title: "Scientific Name Data Console",
      description: "Manage scientific names and taxonomy information.",
      icon: <ScienceIcon sx={{ fontSize: 60 }} />,
      path: "/admin/console-scientific-names",
    },
    {
      title: "Bionomics Data Console",
      description: "Manage specimen-based and literature-based bionomics data.",
      icon: <ParkIcon sx={{ fontSize: 60 }} />,
      path: "/admin/console-bionomics",
    },
  ];

  return (
    <Box sx={{ backgroundColor: "#121212", minHeight: "100vh", color: "#7FFFD4" }}>
      {/* ヘッダー */}
      <AppBar position="static" color="primary" elevation={0}>
        <Toolbar>
          <DashboardIcon sx={{ mr: 2 }} />
          <Typography variant="h6" component="div">
            Administrator Dashboard
          </Typography>
        </Toolbar>
      </AppBar>

      {/* メインコンテンツ */}
      <Container maxWidth="lg" sx={{ py: 6 }}>
        <Paper sx={{ p: 5, backgroundColor: "#1e1e1e" }}>
          <Typography variant="h3" align="center" gutterBottom>
            Admin Dashboard
          </Typography>
          <Typography variant="body1" align="center" paragraph>
            This page is for administrators only. Please perform the desired operation using the buttons below or the menu above.

            To avoid overlapping tasks, it is recommended to inform other administrators of your plans in advance before proceeding using admin chat function.

            If you have any questions about how to operate the system, suggestions for additional features, or modifications that are needed, please share them via the admin chat. For changes to administrator information (such as email addresses or passwords), please contact SS.
            <br /><br />
            このページは、管理者専用のダッシュボードです。以下のカードまたは上部のメニューから希望する操作を実行してください。

            作業内容が重複しないよう、管理者チャットなどにより事前に他の管理者に作業内容を連絡することをお勧めします。

            操作方法に関する疑問や追加・修正が必要な機能などの意見があればなんでも、管理者チャットにて共有をお願いします。また、管理者情報（アドレスやパスワード）の変更は清水までお問い合わせください。
          </Typography>

          {/* 説明の下に注釈を表示 */}
        <Box sx={{ mt: 2 }}>
          <Alert
            severity="warning"
            variant="outlined"
            icon={<InfoIcon />}
            sx={{
              backgroundColor: "warning.light",
              color: "warning.contrastText",
              borderRadius: 2,
              px: 2,
              py: 1,
            }}
            >
              The organization of scientific name data must progress to a certain level before the smooth entry of distribution, ecology, and other natural history data can take place. Therefore, please prioritize the organization of scientific name data based on the information registered in Taxapad 2016. That said, over 40,000 scientific names need to be registered, making the task of entering the scientific names itself a considerable amount of work. Start by working on the higher taxonomic ranks of your expertise groups, set a daily goal such as "register XX species per day," and work diligently toward completing the task.
              <br/><br/>
              学名データの整備がある程度の水準まで進行しないと、分布や生態などのデータ登録もスムーズに行えないため、まずはTaxapad 2016に登録されている学名情報を基に、学名データの整備を最優先で行ってください。とはいえ、合計で4万以上の学名の登録が必要であり、学名の登録作業だけでもかなりの重労働となります。まずは、担当分類群の上位階級から順に作業を開始し、「1日XX種登録する」などのノルマを各自で決め、地道に作業を進めていただければと思います。
          </Alert>
        </Box>

          {/* ナビゲーションカード */}
          <Grid container spacing={4} sx={{ mt: 4 }} justifyContent="center">
            {cards.map((card, index) => (
              <Grid item xs={12} sm={6} md={4} key={index}>
                <Card
                  sx={{
                    backgroundColor: "#262626",
                    color: "#7FFFD4",
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                    transition: "transform 0.3s, box-shadow 0.3s",
                    "&:hover": {
                      transform: "translateY(-5px)",
                      boxShadow: "0 6px 20px rgba(127, 255, 212, 0.4)",
                    },
                  }}
                >
                  <CardActionArea onClick={() => navigate(card.path)} sx={{ height: "100%" }}>
                    <CardContent>
                      <Stack spacing={2} alignItems="center" justifyContent="center" sx={{ textAlign: "center" }}>
                        {card.icon}
                        <Typography variant="h5">{card.title}</Typography>
                        <Typography variant="body2">{card.description}</Typography>
                      </Stack>
                    </CardContent>
                  </CardActionArea>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Paper>
      </Container>
    </Box>
  );
}
