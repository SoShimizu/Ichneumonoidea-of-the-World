import "./CSS/root.css"
import { Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@mui/material";
import theme from "../src/CSS/theme";
import Database from "./components/pages/Database";
import Unauthorized from "./components/ProtectedRoute/Unauthorized";
import ProtectedRoute from "./components/ProtectedRoute/ProtectedRoute";
import ConsolePublications from "./components/ProtectedRoute/Admin/Consoles/ConsolePublications";
import AdminDashboard from "./components/ProtectedRoute/Admin/AdminDashboard";
import Header from "./components/pages/Header";
import ConsoleScientificName from "./components/ProtectedRoute/Admin/Consoles/ConsoleScientificName";
import Home from "./components/pages/home";
import Analytics from "./components/Analytics"; 
import Statistics from "./components/pages/statistics";
import Footer from "./components/Footer";
import ConsoleSpecimens from "./components/ProtectedRoute/Admin/Consoles/ConsoleSpecimens";
import Taxonomy from "./components/pages/Taxonomy";
import ConsoleTaxonomicActs from "./components/ProtectedRoute/Admin/Consoles/ConsoleTaxonomicActs";
import ConsoleBionomicRecords from "./components/ProtectedRoute/Admin/Consoles/ConsoleBionomicRecords";
import ScrollTopButton from "./components/ScrollTopButton";
import ScientificNameDetailsPage from "./components/pages/ScientificNameDetailsPage";
import AdminTeam from "./components/pages/AdminTeam/AdminTeam";
import ConsoleRepositories from "./components/ProtectedRoute/Admin/Consoles/ConsoleRepositories";
import ConsoleResearchers from "./components/ProtectedRoute/Admin/Consoles/ConsoleResearchers";

export default function App() {
  return (
    <ThemeProvider theme={theme}>
      <ScrollTopButton />
    <div className="root-container">
        <Header />
        <Routes>
          <Route path={"/"} element={<Home />} />

          <Route path={"/database"} element={<Database />} />

          <Route path={"/taxonomy"} element={<Taxonomy />} />

          <Route
            path="/scientific-name/:id"
            element={<ScientificNameDetailsPage />}
          />
          
          <Route path={"/statistics"} element={<Statistics />} />

          <Route path={"/admin-team"} element={<AdminTeam />} />

        <Route path="/unauthorized" element={<Unauthorized />} />
        <Route path="/admin" element={
          <ProtectedRoute>
            <AdminDashboard />
          </ProtectedRoute>
        } />

        <Route path="/admin/console-publications" element={<ProtectedRoute>
          <ConsolePublications />
          </ProtectedRoute>} />

        <Route path="/admin/console-researchers" element={<ProtectedRoute>
          <ConsoleResearchers />
        </ProtectedRoute>} />
          
        <Route path="/admin/console-scientific-names" element={<ProtectedRoute>
          <ConsoleScientificName />
          </ProtectedRoute>} />
        
        <Route path="/admin/console-taxonomic-acts" element={<ProtectedRoute>
          <ConsoleTaxonomicActs />
          </ProtectedRoute>} />
          
        <Route path="/admin/console-bionomics" element={<ProtectedRoute>
            <ConsoleBionomicRecords />
            
          </ProtectedRoute>} />
          
          <Route path="/admin/console-repositories" element={<ProtectedRoute>
            <ConsoleRepositories />
          </ProtectedRoute>} />
        

        {/*
        <Route path="/admin/taxa" element={<ProtectedRoute><EditTaxa /></ProtectedRoute>} />
        <Route path="/admin/records" element={<ProtectedRoute><EditRecords /></ProtectedRoute>} />
        */}
        </Routes>

        <Footer />
        <Analytics />
      </div>
    </ThemeProvider>
  )
}
