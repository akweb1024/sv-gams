import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'
import { useAuth } from '../context/AuthContext'

const spaceColors = [
  '#4a90d9', '#6b4c9a', '#c44569', '#e15f41', '#f8b500', '#ff6b6b'
]

function Spaces() {
  const [spaces, setSpaces] = useState([])
  const [loading, setLoading] = useState(true)
  const { user } = useAuth()

  useEffect(() => {
    fetchSpaces()
  }, [])

  const fetchSpaces = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await axios.get('/api/game/spaces', {
        headers: { Authorization: `Bearer ${token}` }
      })
      setSpaces(response.data.spaces)
    } catch (error) {
      console.error('Fetch spaces error:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner"></div>
        <p>Loading spaces...</p>
      </div>
    )
  }

  return (
    <div className="spaces-page">
      <div className="page-header">
        <h1>🌌 Multi-Dimensional Spaces</h1>
        <p>Travel through dimensions and conquer each realm</p>
      </div>

      <div className="spaces-grid">
        {spaces.map((space, index) => (
          <div 
            key={space.level}
            className={`space-card ${!space.unlocked ? 'locked' : ''}`}
            style={{ '--space-color': spaceColors[index % spaceColors.length] }}
          >
            <div className="space-header">
              <span className="space-level">Space-{space.level}</span>
              {space.unlocked ? (
                <span className="unlocked-badge">🔓 Unlocked</span>
              ) : (
                <span className="locked-badge">🔒 Locked</span>
              )}
            </div>
            
            <h3 className="space-title">{space.name}</h3>
            <p className="space-description">{space.description}</p>
            
            <div className="space-requirements">
              <div className="req-item">
                <span>⚡ Min Power:</span>
                <span>{space.minPower}</span>
              </div>
              <div className="req-item">
                <span>⭐ Min Level:</span>
                <span>{space.minLevel}</span>
              </div>
              <div className="req-item">
                <span>💰 Reward Multiplier:</span>
                <span>x{space.rewardMultiplier}</span>
              </div>
              <div className="req-item">
                <span>👾 Species:</span>
                <span>{space.speciesCount}</span>
              </div>
            </div>
            
            {space.unlocked ? (
              <Link to={`/spaces/${space.level}`} className="btn-enter">
                Enter Space →
              </Link>
            ) : (
              <button className="btn-enter disabled" disabled>
                Complete Space-{space.level - 1} First
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

export default Spaces
