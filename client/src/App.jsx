import React from 'react'
import { Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { SocketProvider } from './context/SocketContext'

import Navbar from './components/Navbar'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import Spaces from './pages/Spaces'
import SpaceDetail from './pages/SpaceDetail'
import Battle from './pages/Battle'
import Activities from './pages/Activities'
import ActivityPlay from './pages/ActivityPlay'
import Alliances from './pages/Alliances'
import Trades from './pages/Trades'
import Leaderboard from './pages/Leaderboard'
import Profile from './pages/Profile'
import PrivateRoute from './components/PrivateRoute'
import AppErrorBoundary from './components/AppErrorBoundary'

function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <div className="app">
          <Navbar />
          <main className="main-content">
            <AppErrorBoundary>
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
                <Route path="/spaces" element={<PrivateRoute><Spaces /></PrivateRoute>} />
                <Route path="/spaces/:level" element={<PrivateRoute><SpaceDetail /></PrivateRoute>} />
                <Route path="/battle/:speciesId" element={<PrivateRoute><Battle /></PrivateRoute>} />
                <Route path="/activities/:level" element={<PrivateRoute><Activities /></PrivateRoute>} />
                <Route path="/activity/:id" element={<PrivateRoute><ActivityPlay /></PrivateRoute>} />
                <Route path="/alliances" element={<PrivateRoute><Alliances /></PrivateRoute>} />
                <Route path="/trades" element={<PrivateRoute><Trades /></PrivateRoute>} />
                <Route path="/leaderboard" element={<PrivateRoute><Leaderboard /></PrivateRoute>} />
                <Route path="/profile/:username" element={<PrivateRoute><Profile /></PrivateRoute>} />
              </Routes>
            </AppErrorBoundary>
          </main>
        </div>
      </SocketProvider>
    </AuthProvider>
  )
}

export default App
