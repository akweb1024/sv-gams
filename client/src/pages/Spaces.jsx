import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'
import { useAuth } from '../context/AuthContext'

const spaceColors = [
  '#4a90d9', '#6b4c9a', '#c44569', '#e15f41', '#f8b500', '#ff6b6b'
]

function Spaces() {
  const [spaces, setSpaces] = useState([])
  const [worldSummary, setWorldSummary] = useState(null)
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
      const summaryRes = await axios.get('/api/game/world-summary', {
        headers: { Authorization: `Bearer ${token}` }
      })
      setSpaces(response.data.spaces)
      setWorldSummary(summaryRes.data.summary)
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
      {worldSummary && (
        <div className="card" style={{ marginBottom: '20px' }}>
          <h2>🧭 World Progress</h2>
          <p>
            Unlocked {worldSummary.unlockedSpaces}/{worldSummary.totalSpaces} spaces ({worldSummary.completionPercent}%)
          </p>
          {worldSummary.nextSpace ? (
            <p>
              Next unlock: <strong>Space-{worldSummary.nextSpace.level}</strong> ({worldSummary.nextSpace.name}) ·
              Need Lv.{worldSummary.nextSpace.minLevel} and {worldSummary.nextSpace.minPower} power
            </p>
          ) : (
            <p>🏁 All current spaces unlocked. You have conquered the known dimensions.</p>
          )}
        </div>
      )}

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
              <>
                <button className="btn-enter disabled" disabled>
                  Locked Dimension
                </button>
                <p style={{ marginTop: '10px', fontSize: '0.85rem', opacity: 0.9 }}>
                  Need {space.missingLevel > 0 ? `Lv +${space.missingLevel}` : 'level ready'} · {space.missingPower > 0 ? `${space.missingPower} more power` : 'power ready'}
                </p>
              </>
            )}
          </div>
        ))}
      </div>
      {spaces.length === 0 && (
        <div className="empty-state-card">
          <h3>No spaces available yet</h3>
          <p>Game data is not seeded in this environment. Ask admin to run one-time seed.</p>
        </div>
      )}
    </div>
  )
}

export default Spaces
