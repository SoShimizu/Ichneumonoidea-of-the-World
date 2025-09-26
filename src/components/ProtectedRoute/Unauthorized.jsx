import { Box, Typography, Button } from "@mui/material"
import { useNavigate } from "react-router-dom"

const Unauthorized = () => {
  const navigate = useNavigate()

  return (
    <Box sx={{ textAlign: 'center', mt: 10 }}>
      <Typography variant="h4" color="error" gutterBottom>
        🚫 アクセス拒否
      </Typography>
      <Typography variant="body1" gutterBottom>
        このページへアクセスするにはログインが必要です。
      </Typography>
      <Button variant="outlined" onClick={() => navigate("/")} sx={{ mt: 2 }}>
        ホームへ戻る
      </Button>
    </Box>
  )
}

export default Unauthorized
