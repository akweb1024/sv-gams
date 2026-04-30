import React, { createContext, useContext, useEffect, useState } from 'react'
import { io } from 'socket.io-client'
import { useAuth } from './AuthContext'

const SocketContext = createContext()

export function SocketProvider({ children }) {
  const [socket, setSocket] = useState(null)
  const [connected, setConnected] = useState(false)
  const { user, token } = useAuth()

  useEffect(() => {
    if (token) {
      const newSocket = io(window.location.origin, {
        auth: {
          token
        },
        transports: ['websocket', 'polling']
      })

      newSocket.on('connect', () => {
        setConnected(true)
        console.log('Socket connected')
      })

      newSocket.on('disconnect', () => {
        setConnected(false)
        console.log('Socket disconnected')
      })

      setSocket(newSocket)

      return () => {
        newSocket.close()
      }
    } else {
      setSocket(null)
      setConnected(false)
    }
  }, [token])

  const joinSpace = (spaceLevel) => {
    if (socket && user) {
      socket.emit('join-space', {
        userId: user.id,
        username: user.username,
        spaceLevel
      })
    }
  }

  const changeSpace = (oldSpace, newSpace) => {
    if (socket) {
      socket.emit('change-space', { oldSpace, newSpace })
    }
  }

  const sendChatMessage = (message) => {
    if (socket) {
      socket.emit('space-chat', { message })
    }
  }

  const sendBattleRequest = (targetSocketId) => {
    if (socket) {
      socket.emit('battle-request', { targetSocketId })
    }
  }

  const respondToBattle = (targetSocketId, accepted) => {
    if (socket) {
      socket.emit('battle-response', { targetSocketId, accepted })
    }
  }

  return (
    <SocketContext.Provider value={{
      socket,
      connected,
      joinSpace,
      changeSpace,
      sendChatMessage,
      sendBattleRequest,
      respondToBattle
    }}>
      {children}
    </SocketContext.Provider>
  )
}

export function useSocket() {
  return useContext(SocketContext)
}
