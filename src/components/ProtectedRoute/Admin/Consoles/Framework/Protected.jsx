// src/admin/console/framework/Protected.jsx
import React, { useEffect, useState } from "react";
import { Box, CircularProgress, Stack, Typography } from "@mui/material";
import { supabase } from "../Data/supabaseClient";

function useSession() {
  const [session, setSession] = useState(undefined); // undefined=loading, null=none, object=ok
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session || null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription?.unsubscribe();
  }, []);
  return session;
}

export default function Protected({ children }) {
  const session = useSession();
  if (session === undefined) {
    return (
      <Box sx={{ p: 4, display: "grid", placeItems: "center" }}>
        <Stack alignItems="center" spacing={2}>
          <CircularProgress />
          <Typography>Checking session…</Typography>
        </Stack>
      </Box>
    );
  }
  if (!session) {
    return (
      <Box sx={{ p: 4, display: "grid", placeItems: "center" }}>
        <Typography variant="h6">Unauthorized – please sign in.</Typography>
      </Box>
    );
  }
  return children;
}
