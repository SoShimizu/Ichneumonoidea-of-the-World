import { useState, useEffect } from "react";
import {
  AppBar, Toolbar, IconButton, Typography, Box,
  Drawer, ListItem, ListItemText, Button,
  Menu, MenuItem, useTheme, useMediaQuery, Stack, Divider, Tooltip
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import EditIcon from "@mui/icons-material/Edit";
import CommentIcon from "@mui/icons-material/Comment";
import LogoutIcon from "@mui/icons-material/Logout";
import supabase from "../../utils/supabase";
import { useNavigate } from "react-router-dom";
import LogoutButton from "../LogoutButton/LogoutButton";
import LoginButton from "../Login/LoginButton/LoginButton";
import CommentManagerDialog from "../CommentManagerDialog";
import AdminChatBox from "../../components/ProtectedRoute/Admin/Dialogs/AdminChatDialog";

const baseNavItems = [
  { label: "Home", path: "/" },
  { label: "Taxonomy", path: "/taxonomy" },
  //{ label: "Database", path: "/database" },
  { label: "Statistics", path: "/statistics" },
  { label: "Admin Team", path: "/admin-team" },
];

export default function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [anchorEl, setAnchorEl] = useState(null);
  const [openCommentManager, setOpenCommentManager] = useState(false);

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  const handleDrawerToggle = () => setMobileOpen(!mobileOpen);
  const handleNavigate = (path) => {
    navigate(path);
    setMobileOpen(false);
    handleCloseMenu();
  };
  const handleOpenMenu = (event) => setAnchorEl(event.currentTarget);
  const handleCloseMenu = () => setAnchorEl(null);

  const handleEditDisplayName = async () => {
    const currentDisplayName = user?.user_metadata?.display_name || "";
    const newDisplayName = window.prompt("Enter new display name:", currentDisplayName);
    if (newDisplayName === null || newDisplayName.trim() === "") return;
    const { error } = await supabase.auth.updateUser({
      data: { display_name: newDisplayName },
    });
    if (error) {
      alert("Failed to update display name: " + error.message);
    } else {
      alert("Display name updated!");
      const { data: { user: updatedUser } } = await supabase.auth.getUser();
      setUser(updatedUser);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const drawer = (
    <Box onClick={handleDrawerToggle} sx={{ textAlign: "center", bgcolor: "#121212", height: "100%" }}>
      <Typography
        variant="h1"
        sx={{ my: 2, color: "#7FFFD4", cursor: "pointer" }}
        onClick={() => navigate("/")}
      >
        Ichneumonoidea of the World
      </Typography>
      {baseNavItems.map(item => (
        <ListItem button key={item.label} onClick={() => handleNavigate(item.path)} sx={{ color: "#7FFFD4" }}>
          <ListItemText primary={item.label} />
        </ListItem>
      ))}
      {user ? (
        <>
          <ListItem button onClick={() => handleNavigate("/admin")} sx={{ color: "#7FFFD4" }}>
            <EditIcon fontSize="small" sx={{ mr: 1 }} />
            <ListItemText primary="Dashboard" />
          </ListItem>
          <Box sx={{ px: 2, mt: 2 }}>
            <LogoutButton />
          </Box>
        </>
      ) : (
        <LoginButton />
      )}
    </Box>
  );

  return (
    <>
      <AppBar position="fixed" sx={{ bgcolor: "#121212", color: "#7FFFD4", width: "100%" }}>
        <Toolbar>
          {isMobile && (
            <IconButton color="inherit" edge="start" onClick={handleDrawerToggle} sx={{ mr: 2 }}>
              <MenuIcon />
            </IconButton>
          )}

          <Typography
            variant="h6"
            sx={{ flexGrow: 1, cursor: "pointer" }}
            onClick={() => navigate("/")}
          >
            Ichneumonoidea of the World
          </Typography>

          {!isMobile && (
            <Stack direction="row" spacing={2} alignItems="center">
              {baseNavItems.map(item => (
                <Button
                  key={item.label}
                  onClick={() => handleNavigate(item.path)}
                  sx={{ color: "#7FFFD4", textTransform: "none" }}
                >
                  {item.label}
                </Button>
              ))}

              {user ? (
                <>
                  <Divider orientation="vertical" flexItem sx={{ bgcolor: "#7FFFD4", mx: 2 }} />
                  <Button
                    onMouseEnter={handleOpenMenu}
                    endIcon={<ExpandMoreIcon />}
                    sx={{ color: "#7FFFD4", textTransform: "none" }}
                  >
                    DASHBOARD
                  </Button>
                  <Menu
                    anchorEl={anchorEl}
                    open={Boolean(anchorEl)}
                    onClose={handleCloseMenu}
                    MenuListProps={{
                      onMouseLeave: handleCloseMenu,
                      sx: { bgcolor: "#1e1e1e", color: "#7FFFD4" }
                    }}
                    anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
                    transformOrigin={{ vertical: "top", horizontal: "left" }}
                  >
                    <MenuItem onClick={() => handleNavigate("/admin")}>Dashboard Home</MenuItem>
                    <MenuItem onClick={() => handleNavigate("/admin/console-publications")}>Publication Data Console</MenuItem>
                    <MenuItem onClick={() => handleNavigate("/admin/console-scientific-names")}>Scientific Name Data Console</MenuItem>
                    <MenuItem onClick={() => handleNavigate("/admin/console-taxonomic-acts")}>Taxonomic Acts Data Console</MenuItem>
                    <MenuItem onClick={() => handleNavigate("/admin/console-bionomics")}>Bionomics Data Console</MenuItem>
                    <MenuItem onClick={() => handleNavigate("/admin/console-repositories")}>Repositories Data Console</MenuItem>
                    <MenuItem onClick={() => handleNavigate("/admin/console-researchers")}>Researchers Data Console</MenuItem>

                    
                  </Menu>

                  <Stack direction="row" spacing={1} alignItems="center" sx={{ ml: 2 }}>
                    <Typography variant="body1" sx={{ color: "#7FFFD4" }}>
                      {user.user_metadata?.display_name || user.email}
                    </Typography>

                    <Tooltip title="Edit Display Name">
                      <IconButton onClick={handleEditDisplayName} size="small">
                        <EditIcon sx={{ color: "#7FFFD4" }} />
                      </IconButton>
                    </Tooltip>

                    <Tooltip title="Manage Comments">
                      <IconButton onClick={() => setOpenCommentManager(true)} size="small">
                        <CommentIcon sx={{ color: "#7FFFD4" }} />
                      </IconButton>
                    </Tooltip>

                    
                    <Tooltip title="Logout">
                      <IconButton onClick={handleLogout} size="small">
                        <LogoutIcon sx={{ color: "#7FFFD4" }} />
                      </IconButton>
                    </Tooltip>
                  </Stack>
                </>
              ) : (
                <LoginButton />
              )}
            </Stack>
          )}
        </Toolbar>
      </AppBar>

      {/* モバイルDrawer */}
      <Box component="nav">
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: "block", md: "none" },
            "& .MuiDrawer-paper": {
              boxSizing: "border-box",
              width: 240,
              bgcolor: "#121212",
              color: "#7FFFD4"
            }
          }}
        >
          {drawer}
        </Drawer>
      </Box>

      {/* 上に隙間確保 */}
      <Toolbar />

      {/* コメント管理ダイアログ */}
      {user && (
        <CommentManagerDialog
          open={openCommentManager}
          onClose={() => setOpenCommentManager(false)}
          user={user}
        />
      )}

      {/* ✅ チャットボックスは下に常に存在させる */}
      {user && (
        <AdminChatBox currentUserName={user.user_metadata?.display_name || user.email} />
      )}
    </>
  );
}
