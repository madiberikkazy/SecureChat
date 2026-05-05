import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { wsService } from '../services/websocket'
import useChatStore from '../store/chatStore'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(null)
  const [loading, setLoading] = useState(true)
  const setOnline = useChatStore(s => s.setOnline)

  useEffect(() => {
    const savedToken = localStorage.getItem('token')
    const savedUser = localStorage.getItem('user')
    if (savedToken && savedUser) {
      try {
        setToken(savedToken)
        setUser(JSON.parse(savedUser))
        // WebSocket-ке қосылу
        wsService.connect(savedToken, () => {
          // Онлайн статус өзгерістерін тыңдау
          wsService.onOnlineStatus(({ data }) => {
            if (data?.username) setOnline(data.username, data.online)
          })
        })
      } catch (e) {
        localStorage.clear()
      }
    }
    setLoading(false)
  }, [])

  const login = useCallback((tokenValue, userData) => {
    localStorage.setItem('token', tokenValue)
    localStorage.setItem('user', JSON.stringify(userData))
    setToken(tokenValue)
    setUser(userData)
    wsService.connect(tokenValue, () => {
      wsService.onOnlineStatus(({ data }) => {
        if (data?.username) setOnline(data.username, data.online)
      })
    })
  }, [])

  const logout = useCallback(() => {
    localStorage.clear()
    setToken(null)
    setUser(null)
    wsService.disconnect()
  }, [])

  const updateUser = useCallback((userData) => {
    setUser(userData)
    localStorage.setItem('user', JSON.stringify(userData))
  }, [])

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
