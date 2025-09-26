// components/ui/DynamicToc.jsx
"use client";

import React, { useEffect, useState } from "react";
import {
  Paper,
  Typography,
  List,
  ListItemButton,
  ListItemText,
  Box,
} from "@mui/material";

/**
 * @param {Object} props
 * @param {{id: string, label: string}[]} props.sections
 * @param {number} [props.stickyTop=80]
 */
export default function DynamicToc({ sections, stickyTop = 80 }) {
  const [activeId, setActiveId] = useState(null);

  // Intersection Observer for scroll tracking
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
            break;
          }
        }
      },
      {
        rootMargin: "-50% 0px -50% 0px", // Trigger when section is in middle viewport
        threshold: 0,
      }
    );

    const elements = sections.map((sec) => document.getElementById(sec.id)).filter(Boolean);
    elements.forEach((el) => observer.observe(el));

    return () => {
      elements.forEach((el) => observer.unobserve(el));
    };
  }, [sections]);

  return (
    <Paper
      elevation={3}
      sx={{
        marginTop: 5,
        position: "sticky",
        top: stickyTop,
        p: 2,
        mb: 4,
        backgroundColor: "#2c2c2c",
        color: "#fff",
        borderRadius: 2,
        width: "100%",
        maxWidth: { xs: "100%", sm: 300, md: 340 },
      }}
    >
      <Typography variant="h6" gutterBottom sx={{ fontWeight: "bold", color: "#fff" }}>
        Contents
      </Typography>
      <List dense disablePadding>
        {sections.map((sec, idx) => (
          <ListItemButton
            key={sec.id}
            component="a"
            href={`#${sec.id}`}
            sx={{
              borderRadius: 1,
              mb: 1,
              alignItems: "flex-start",
              color: activeId === sec.id ? "#fff" : "#b2ebf2",
              backgroundColor: activeId === sec.id ? "#444" : "transparent",
              '&:hover': { backgroundColor: "#444" },
              transition: "background-color 0.2s",
            }}
          >
            <ListItemText
              primary={
                <Box sx={{ display: "flex", gap: 1 }}>
                  <Typography variant="body2" sx={{ fontWeight: "bold", color: "#aaa" }}>
                    {idx + 1}.
                  </Typography>
                  <Typography variant="body2">
                    {sec.label.replace(/\n/g, " ").trim()}
                  </Typography>
                </Box>
              }
            />
          </ListItemButton>
        ))}
      </List>
    </Paper>
  );
}