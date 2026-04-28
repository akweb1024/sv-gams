import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import axios from 'axios'

function Dashboard() {
  const { user } = useAuth()
  const [spaces, setSpaces] = useState([])
  const [leaderboard, setLeaderboard] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token')
      const [spacesRes, lbRes] = await Promise.all([
        axios.get('/api/game/spaces', { headers: { Authorization: `Bearer ${token}` } }),
        axios.get('/api/game/leaderboard', { headers: { Authorization: `Bearer ${token}` } })
      ])
      setSpaces(spacesRes.data.spaces)
      setLeaderboard(lbRes.data.leaderboard.slice(0, 5))
    } catch (error) {
      console.error('Fetch dashboard error:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner"></div>
        <p>Loading dashboard...</p>
      </div>
    )
  }

  return (
    <div className="dashboard-page">
      <div className="dashboard-header">
        <h1>Welcome, {user?.displayName || user?.username}!</h1>
        <p className="subtitle">Space Level: {user?.spaceLevel} | Power: {user?.power} | Health: {user?.health}/{user?.maxHealth}</p>
      </div>

      <div className="dashboard-grid">
        <div className="card stats-card">
          <h2>⚔️ Your Stats</h2>
          <div className="stats-grid">
            <div className="stat-item">
              <span className="stat-value">{user?.level}</span>
              <span className="stat-label">Level</span>
            </div>
            <div className="stat-item">
              <span className="stat-value">{user?.power}</span>
              <span className="stat-label">Power</span>
            </div>
            <div className="stat-item">
              <span className="stat-value">{user?.points}</span>
              <span className="stat-label">Points</span>
            </div>
            <div className="stat-item">
              <span className="stat-value">{user?.crystals}</span>
              <span className="stat-label">Crystals</span>
            </div>
            <div className="stat-item">
              <span className="stat-value">{user?.wins}</span>
              <span className="stat-label">Wins</span>
            </div>
            <div className="stat-item">
              <span className="stat-value">{user?.losses}</span>
              <span className="stat-label">Losses</span>
            </div>
          </div>
          <div className="experience-bar">
            <div className="progress-bar">
              <div 
                className="progress-fill" 
                style={{ width: `${((user?.experience % 100) / 100) * 100}%` }}
              ></div>
            </div>
            <span className="exp-text">{user?.experience} XP</span>
          </div>
        </div>

        <div className="card spaces-card">
          <h2>🌌 Spaces</h2>
          <div className="spaces-list">
            {spaces.map(space => (
              <Link 
                key={space.level} 
                to={`/spaces/${space.level}`}
                className={`space-item ${!space.unlocked ? 'locked' : ''}`}
              >
                <div className="space-info">
                  <span className="space-name">{space.name}</span>
                  <span className="space-desc">{space.description}</span>
                </div>
                <span className="space-status">
                  {space.unlocked ? '🔓' : '🔒'}
                </span>
              </Link>
            ))}
          </div>
        </div>

        <div className="card leaderboard-card">
          <h2>🏆 Top Warriors</h2>
          <div className="leaderboard-list">
            {leaderboard.map((player, index) => (
              <Link 
                key={player.id} 
                to={`/profile/${player.username}`}
                className="leaderboard-item"
              >
                <span className="rank">#{index + 1}</span>
                <span className="name">{player.displayName || player.username}</span>
                <span className="score">{player.points} pts</span>
              </Link>
            ))}
          </div>
          <Link to="/leaderboard" className="view-all">View Full Leaderboard →</Link>
        </div>

        <div className="card quick-actions">
          <h2>⚡ Quick Actions</h2>
          <div className="actions-grid">
            <Link to="/spaces" className="action-btn">
              <span>🗡️</span>
              <span>Battle</span>
            </Link>
            <Link to="/alliances" className="action-btn">
              <span>🤝</span>
              <span>Alliance</span>
            </Link>
            <Link to="/trades" className="action-btn">
              <span>💱</span>
              <span>Trade</span>
            </Link>
            <Link to="/leaderboard" className="action-btn">
              <span>📊</span>
              <span>Rankings</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Dashboard
