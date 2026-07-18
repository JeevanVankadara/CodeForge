import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import * as authApi from '../lib/auth.js'

// Holds the logged-in user across the app. Because the JWT is an HttpOnly cookie
// (JS can't read it), we learn who's logged in by asking the backend (/auth/me).
const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  // Ask the backend who we are (cookie is sent automatically).
  const refresh = useCallback(async () => {
    try {
      setUser(await authApi.getMe())
    } catch {
      setUser(null) // 401 -> not logged in
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const login = async (creds) => {
    await authApi.login(creds)
    await refresh()
  }

  const signup = async (creds) => {
    await authApi.signup(creds)
    await refresh()
  }

  const logout = async () => {
    await authApi.logout()
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider')
  return ctx
}
