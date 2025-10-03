// 例: src/components/layout/NavList.jsx（新規 or 置換用サンプル）
import * as React from "react";
import { List, ListItem, ListItemButton, ListItemIcon, ListItemText } from "@mui/material";
import InboxIcon from "@mui/icons-material/Inbox";
import ArticleIcon from "@mui/icons-material/Article";

export default function NavList({ onNavigate }) {
  return (
    <List>
      <ListItem disablePadding>
        <ListItemButton onClick={() => onNavigate?.("/admin/console-publications")}>
          <ListItemIcon><ArticleIcon /></ListItemIcon>
          <ListItemText primary="Publications" />
        </ListItemButton>
      </ListItem>

      <ListItem disablePadding>
        <ListItemButton onClick={() => onNavigate?.("/admin/console-researchers")}>
          <ListItemIcon><InboxIcon /></ListItemIcon>
          <ListItemText primary="Researchers" />
        </ListItemButton>
      </ListItem>

      <ListItem disablePadding>
        <ListItemButton onClick={() => onNavigate?.("/admin/console-repositories")}>
          <ListItemIcon><InboxIcon /></ListItemIcon>
          <ListItemText primary="Institutes" />
        </ListItemButton>
      </ListItem>
    </List>
  );
}
