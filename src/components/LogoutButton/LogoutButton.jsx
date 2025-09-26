import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import supabase from "../../utils/supabase"
import { Button, Stack, Tooltip } from "@mui/material"
import LogoutIcon from "@mui/icons-material/Logout"

export default function LogoutButton() {
  const [user, setUser] = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => {
      listener.subscription.unsubscribe()
    }
  }, [])

  const handleLogout = async () => {
    const confirmLogout = window.confirm("Are you sure you want to log out?")
    if (!confirmLogout) return

    const { error } = await supabase.auth.signOut()

    if (error) {
      alert("Logout failed: " + error.message)
    } else {
      alert("You have been logged out.")
      navigate("/") // ログアウトしたらトップページへ
    }
  }

  if (!user) return null

  return (
    <Stack direction="row" justifyContent="flex-end" sx={{ m: 2 }}>
      <Tooltip title="Logout">
        <Button
          onClick={handleLogout}
          variant="outlined"
          color="error"
          startIcon={<LogoutIcon />}
        >
          LOGOUT
        </Button>
      </Tooltip>
    </Stack>
  )
}
