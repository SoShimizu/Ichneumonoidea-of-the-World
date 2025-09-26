import { useState, useEffect } from "react"
import {
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
} from "@mui/material"
import CloseIcon from "@mui/icons-material/Close"
import supabase from "../../../utils/supabase"
import LoginForm from "../LoginForm/LoginForm"
import LoginIcon from "@mui/icons-material/Login"
export default function LoginButton() {
  const [open, setOpen] = useState(false)
  const [user, setUser] = useState(null)

  const handleOpen = () => setOpen(true)
  const handleClose = () => setOpen(false)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user))

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  if (user) return null // ログイン中はボタン非表示

  return (
    <>
      <Button onClick={handleOpen} variant="contained" startIcon={<LoginIcon />}>
        {/* buttonに文字が欲しければここに書く */}
      </Button>

      <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ position: "relative", textAlign: "center" }}>
          LOGIN
          <IconButton
            aria-label="close"
            onClick={handleClose}
            sx={{ position: "absolute", right: 8, top: 8 }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          <LoginForm onSuccess={handleClose} />
        </DialogContent>
      </Dialog>
    </>
  )
}
