// src/App.jsx
import "./CSS/root.css";
import React from "react";
import { Routes, Route } from "react-router-dom";
import { ThemeProvider, CssBaseline, Container, Box, Typography } from "@mui/material";

import Header from "./components/pages/Header";
import Footer from "./components/Footer";
import ScrollTopButton from "./components/ScrollTopButton";
import Analytics from "./components/Analytics";

import Home from "./components/pages/home";
import Database from "./components/pages/Database";
import Taxonomy from "./components/pages/Taxonomy";
import Statistics from "./components/pages/statistics";
import ScientificNameDetailsPage from "./components/pages/ScientificNameDetailsPage";
import AdminTeam from "./components/pages/AdminTeam/AdminTeam";

import Unauthorized from "./components/ProtectedRoute/Unauthorized";
import ProtectedRoute from "./components/ProtectedRoute/ProtectedRoute";
import AdminDashboard from "./components/ProtectedRoute/Admin/AdminDashboard";

// ── Admin Consoles ─────────────────────────────────────────────
// 研究者・学名・タクソンアクト・バイオノミクス・リポジトリは既存のまま

// Publications だけは新しい「共通フレーム」実装に切替
import PublicationsConsole from "./components/ProtectedRoute/Admin/Consoles/Pages/PublicationsConsole";

// ── 共通フレーム（テーマ／トースト） ─────────────────────────────
import { theme } from "./components/ProtectedRoute/Admin/Consoles/Framework/theme";
import { ToastProvider } from "./components/ProtectedRoute/Admin/Consoles/Framework/ToastProvider";
import ResearchersConsole from "./components/ProtectedRoute/Admin/Consoles/Pages/ResearchersConsole";
import InstitutesConsole from "./components/ProtectedRoute/Admin/Consoles/Pages/InstitutesConsole";
import ScientificNamesConsole from "./components/ProtectedRoute/Admin/Consoles/Pages/ScientificNamesConsole";
import TaxonomicActsConsole from "./components/ProtectedRoute/Admin/Consoles/Pages/TaxonomicActsConsole";
import BionomicRecordsConsole from "./components/ProtectedRoute/Admin/Consoles/Pages/BionomicRecordsConsole";

// 404 シンプル版（必要なければ削除してください）
function NotFound() {
  return (
    <Box sx={{ py: 8, textAlign: "center" }}>
      <Typography variant="h5" gutterBottom>404 – Not Found</Typography>
      <Typography variant="body2" color="text.secondary">
        ページが見つかりませんでした。
      </Typography>
    </Box>
  );
}

export default function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <ToastProvider>
        <ScrollTopButton />
        <div className="root-container">
          <Header />
          {/* Container は好みで。既存CSSが整っているなら外してもOK */}
          <Container maxWidth="xl" sx={{ py: 2 }}>
            <Routes>
              {/* ── Public pages ── */}
              <Route path="/" element={<Home />} />
              <Route path="/database" element={<Database />} />
              <Route path="/taxonomy" element={<Taxonomy />} />
              <Route path="/statistics" element={<Statistics />} />
              <Route path="/admin-team" element={<AdminTeam />} />
              <Route path="/scientific-name/:id" element={<ScientificNameDetailsPage />} />

              {/* ── Auth / Guarded ── */}
              <Route path="/unauthorized" element={<Unauthorized />} />
              <Route
                path="/admin"
                element={
                  <ProtectedRoute>
                    <AdminDashboard />
                  </ProtectedRoute>
                }
              />

              {/* ── Admin Consoles ── */}
              {/* Publications は共通フレーム実装に置き換え */}
              <Route
                path="/admin/console-publications"
                element={
                  <ProtectedRoute>
                    <PublicationsConsole />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/admin/console-researchers"
                element={
                  <ProtectedRoute>
                    <ResearchersConsole />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/console-scientific-names"
                element={
                  <ProtectedRoute>
                    <ScientificNamesConsole />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/console-taxonomic-acts"
                element={
                  <ProtectedRoute>
                    <TaxonomicActsConsole />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/console-bionomics"
                element={
                  <ProtectedRoute>
                    <BionomicRecordsConsole />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/console-repositories"
                element={
                  <ProtectedRoute>
                    <InstitutesConsole />
                  </ProtectedRoute>
                }
              />

              {/* 404 */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Container>

          <Footer />
          <Analytics />
        </div>
      </ToastProvider>
    </ThemeProvider>
  );
}
