import { useEffect, useState } from "react"
import { Navigate } from "react-router-dom"
import supabase from "../../utils/supabase"

const ProtectedRoute = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(null)

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setIsAuthenticated(!!session)
    }

    checkSession()
  }, [])

  if (isAuthenticated === null) return null // ローディング中

  return isAuthenticated ? children : <Navigate to="/unauthorized" replace />
}

export default ProtectedRoute
