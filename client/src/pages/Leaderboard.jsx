import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'

function Leaderboard() {
  const [leaderboard, setLeaderboard] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchLeaderboard()
  }, [])

  const fetchLeaderboard = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await axios.get('/api/game/leaderboard', {
        headers: { Authorization: `Bearer ${token}` }
      })
      setLeaderboard(response.data.leaderboard)
    } catch (error) {
      console.error('Fetch leaderboard error:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner"></div>
        <p>Loading rankings...</p>
      </div>
    )
  }

  return (
    <div className="leaderboard-page">
      <div className="page-header">
        <h1>🏆 Global Rankings</h1>
        <p>The strongest warriors across all dimensions</p>
      </div>

      <div className="card leaderboard-table">
        <div className="table-header">
          <span className="col-rank">Rank</span>
          <span className="col-player">Warrior</span>
          <span className="col-level">Level</span>
          <span className="col-power">Power</span>
          <span className="col-space">Space</span>
          <span className="col-points">Points</span>
          <span className="col-crystals">Crystals</span>
          <span className="col-wins">W/L</span>
        </div>
        
        {leaderboard.map((player, index) => (
          <Link 
            key={player.id} 
            to={`/profile/${player.username}`}
            className={`table-row ${index < 3 ? 'top-' + (index + 1) : ''}`}
          >
            <span className="col-rank">
              {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
            </span>
            <span className="col-player">
              {player.displayName || player.username}
            </span>
            <span className="col-level">⭐ {player.level}</span>
            <span className="col-power">⚡ {player.power}</span>
            <span className="col-space">🌌 {player.spaceLevel}</span>
            <span className="col-points">💎 {player.points}</span>
            <span className="col-crystals">🔮 {player.crystals}</span>
            <span className="col-wins">
              {player.wins}W / {player.losses}L
            </span>
          </Link>
        ))}
      </div>
    </div>
  )
}

export default Leaderboard
