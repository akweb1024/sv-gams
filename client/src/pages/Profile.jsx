import React, { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import axios from 'axios'

const rarityColors = {
  common: '#95a5a6',
  rare: '#3498db',
  epic: '#9b59b6',
  legendary: '#f39c12'
}

function Profile() {
  const { username } = useParams()
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchProfile()
  }, [username])

  const fetchProfile = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await axios.get(`/api/game/profile/${username}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setProfile(response.data.profile)
    } catch (error) {
      console.error('Fetch profile error:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner"></div>
        <p>Loading profile...</p>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="profile-page">
        <div className="card">
          <h2>Warrior not found</h2>
          <p>This warrior doesn't exist or has been erased from existence.</p>
        </div>
      </div>
    )
  }

  const winRate = profile.wins + profile.losses > 0 
    ? ((profile.wins / (profile.wins + profile.losses)) * 100).toFixed(1) 
    : 0

  return (
    <div className="profile-page">
      <div className="profile-header">
        <div className="profile-avatar">
          <span className="avatar-icon">🧑‍🚀</span>
        </div>
        <div className="profile-info">
          <h1>{profile.displayName || profile.username}</h1>
          <p className="username">@{profile.username}</p>
          <p className="join-date">
            Warrior since {new Date(profile.createdAt).toLocaleDateString()}
          </p>
        </div>
      </div>

      <div className="profile-grid">
        <div className="card stats-overview">
          <h2>⚔️ Battle Stats</h2>
          <div className="stats-grid">
            <div className="stat-item">
              <span className="stat-value">{profile.wins}</span>
              <span className="stat-label">Wins</span>
            </div>
            <div className="stat-item">
              <span className="stat-value">{profile.losses}</span>
              <span className="stat-label">Losses</span>
            </div>
            <div className="stat-item">
              <span className="stat-value">{winRate}%</span>
              <span className="stat-label">Win Rate</span>
            </div>
            <div className="stat-item">
              <span className="stat-value">{profile.points}</span>
              <span className="stat-label">Points</span>
            </div>
          </div>
        </div>

        <div className="card character-stats">
          <h2>📊 Character Stats</h2>
          <div className="stat-rows">
            <div className="stat-row">
              <span>⭐ Level</span>
              <span className="stat-bar">
                <span className="bar-fill" style={{ width: `${Math.min((profile.level / 50) * 100, 100)}%` }}></span>
              </span>
              <span>{profile.level}</span>
            </div>
            <div className="stat-row">
              <span>⚡ Power</span>
              <span className="stat-bar">
                <span className="bar-fill" style={{ width: `${Math.min((profile.power / 5000) * 100, 100)}%` }}></span>
              </span>
              <span>{profile.power}</span>
            </div>
            <div className="stat-row">
              <span>❤️ Health</span>
              <span className="stat-bar">
                <span className="bar-fill" style={{ width: `${Math.min((profile.health / profile.maxHealth) * 100, 100)}%` }}></span>
              </span>
              <span>{profile.health}/{profile.maxHealth}</span>
            </div>
            <div className="stat-row">
              <span>✨ Experience</span>
              <span className="stat-bar">
                <span className="bar-fill" style={{ width: `${((profile.experience % 100) / 100) * 100}%` }}></span>
              </span>
              <span>{profile.experience}</span>
            </div>
            <div className="stat-row">
              <span>🌌 Space Level</span>
              <span className="stat-bar">
                <span className="bar-fill" style={{ width: `${(profile.spaceLevel / 6) * 100}%` }}></span>
              </span>
              <span>{profile.spaceLevel}</span>
            </div>
          </div>
        </div>

        <div className="card inventory-section">
          <h2>🎒 Inventory</h2>
          {profile.inventory && profile.inventory.length > 0 ? (
            <div className="inventory-grid">
              {profile.inventory.map(item => (
                <div 
                  key={item.id} 
                  className="inventory-item"
                  style={{ borderColor: rarityColors[item.rarity] || '#95a5a6' }}
                >
                  <span className="item-icon">
                    {item.itemType === 'weapon' ? '⚔️' : item.itemType === 'armor' ? '🛡️' : item.itemType === 'potion' ? '🧪' : '💎'}
                  </span>
                  <span className="item-name">{item.itemName}</span>
                  <span className="item-rarity" style={{ color: rarityColors[item.rarity] || '#95a5a6' }}>
                    {item.rarity}
                  </span>
                  {item.powerBonus > 0 && <span className="item-stat">+{item.powerBonus} PWR</span>}
                  {item.healthBonus > 0 && <span className="item-stat">+{item.healthBonus} HP</span>}
                  <span className="item-qty">x{item.quantity}</span>
                </div>
              ))}
            </div>
          ) : (
            <p>No items in inventory</p>
          )}
        </div>

        {profile.alliances && profile.alliances.length > 0 && (
          <div className="card alliances-section">
            <h2>🤝 Alliance</h2>
            {profile.alliances.map(a => (
              <div key={a.id} className="alliance-info">
                <h3>{a.alliance.name}</h3>
                <span className={`member-role ${a.role}`}>{a.role}</span>
                <p>Since {new Date(a.joinedAt).toLocaleDateString()}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default Profile
