// index.js
import "normalize.css";
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { Box } from "@mui/material";

const root = ReactDOM.createRoot(document.getElementById("root"));

root.render(
  <Box sx={{ bgcolor: "black", minHeight: "100vh" }}>
    <React.StrictMode>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </React.StrictMode>
  </Box>
);
