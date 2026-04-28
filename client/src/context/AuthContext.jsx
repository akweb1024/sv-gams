import React, { createContext, useState, useContext, useEffect } from 'react'
import axios from 'axios'

const AuthContext = createContext()

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [token, setToken] = useState(localStorage.getItem('token'))

  useEffect(() => {
    if (token) {
      fetchUser()
    } else {
      setLoading(false)
    }
  }, [token])

  const fetchUser = async () => {
    try {
      const response = await axios.get('/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` }
      })
      setUser(response.data.user)
    } catch (error) {
      console.error('Fetch user error:', error)
      logout()
    } finally {
      setLoading(false)
    }
  }

  const login = async (username, password) => {
    const response = await axios.post('/api/auth/login', { username, password })
    const { token, user } = response.data
    localStorage.setItem('token', token)
    setToken(token)
    setUser(user)
    return response.data
  }

  const register = async (userData) => {
    const response = await axios.post('/api/auth/register', userData)
    const { token, user } = response.data
    localStorage.setItem('token', token)
    setToken(token)
    setUser(user)
    return response.data
  }

  const logout = () => {
    localStorage.removeItem('token')
    setToken(null)
    setUser(null)
  }

  const updateUser = (newUserData) => {
    setUser(prev => ({ ...prev, ...newUserData }))
  }

  return (
    <AuthContext.Provider value={{ user, login, register, logout, updateUser, loading, token }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
