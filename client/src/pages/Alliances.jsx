import React, { useEffect, useState } from 'react'
import axios from 'axios'
import { useAuth } from '../context/AuthContext'

function Alliances() {
  const { user, updateUser } = useAuth()
  const [alliances, setAlliances] = useState([])
  const [myAlliance, setMyAlliance] = useState(null)
  const [showCreate, setShowCreate] = useState(false)
  const [newAlliance, setNewAlliance] = useState({ name: '', description: '' })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchAlliances()
  }, [])

  const fetchAlliances = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await axios.get('/api/alliance/', {
        headers: { Authorization: `Bearer ${token}` }
      })
      setAlliances(response.data.alliances)
      
      // Find user's alliance
      const userAlliance = response.data.alliances.find(a => 
        a.members.some(m => m.userId === user?.id)
      )
      setMyAlliance(userAlliance)
    } catch (error) {
      console.error('Fetch alliances error:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async (e) => {
    e.preventDefault()
    try {
      const token = localStorage.getItem('token')
      await axios.post('/api/alliance/create', newAlliance, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setShowCreate(false)
      setNewAlliance({ name: '', description: '' })
      fetchAlliances()
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to create alliance')
    }
  }

  const handleJoin = async (id) => {
    try {
      const token = localStorage.getItem('token')
      await axios.post(`/api/alliance/${id}/join`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      })
      fetchAlliances()
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to join alliance')
    }
  }

  const handleLeave = async () => {
    try {
      const token = localStorage.getItem('token')
      await axios.post('/api/alliance/leave', {}, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setMyAlliance(null)
      fetchAlliances()
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to leave alliance')
    }
  }

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner"></div>
        <p>Loading alliances...</p>
      </div>
    )
  }

  return (
    <div className="alliances-page">
      <div className="page-header">
        <h1>🤝 Alliances</h1>
        <p>Form powerful alliances and conquer together</p>
      </div>

      {myAlliance ? (
        <div className="card my-alliance">
          <h2>Your Alliance: {myAlliance.name}</h2>
          <p>{myAlliance.description || 'No description'}</p>
          <p>Space Level: {myAlliance.spaceLevel} | Members: {myAlliance.members.length}/{myAlliance.maxMembers}</p>
          
          <h3>Members</h3>
          <div className="members-list">
            {myAlliance.members.map(member => (
              <div key={member.id} className="member-item">
                <span className="member-name">
                  {member.user.displayName || member.user.username}
                </span>
                <span className={`member-role ${member.role}`}>{member.role}</span>
                <span className="member-stats">
                  Lv.{member.user.level} | ⚡{member.user.power}
                </span>
              </div>
            ))}
          </div>
          
          <button onClick={handleLeave} className="btn-danger">
            Leave Alliance
          </button>
        </div>
      ) : (
        <>
          {!showCreate ? (
            <button onClick={() => setShowCreate(true)} className="btn-primary">
              ➕ Create Alliance
            </button>
          ) : (
            <div className="card create-alliance">
              <h2>Create Alliance</h2>
              <form onSubmit={handleCreate}>
                <div className="form-group">
                  <label>Alliance Name *</label>
                  <input
                    type="text"
                    value={newAlliance.name}
                    onChange={(e) => setNewAlliance({ ...newAlliance, name: e.target.value })}
                    required
                    placeholder="Alliance name"
                  />
                </div>
                <div className="form-group">
                  <label>Description</label>
                  <textarea
                    value={newAlliance.description}
                    onChange={(e) => setNewAlliance({ ...newAlliance, description: e.target.value })}
                    placeholder="Describe your alliance..."
                  />
                </div>
                <div className="form-actions">
                  <button type="submit" className="btn-primary">Create</button>
                  <button type="button" onClick={() => setShowCreate(false)} className="btn-secondary">Cancel</button>
                </div>
              </form>
            </div>
          )}
        </>
      )}

      <div className="alliances-list">
        <h2>All Alliances</h2>
        {alliances.length === 0 ? (
          <p>No alliances yet. Be the first to create one!</p>
        ) : (
          alliances.map(alliance => (
            <div key={alliance.id} className="card alliance-card">
              <div className="alliance-info">
                <h3>{alliance.name}</h3>
                <p>{alliance.description || 'No description'}</p>
                <div className="alliance-meta">
                  <span>👥 {alliance.members.length}/{alliance.maxMembers} members</span>
                  <span>🌌 Space-{alliance.spaceLevel}</span>
                </div>
              </div>
              
              {!myAlliance && (
                <button 
                  onClick={() => handleJoin(alliance.id)}
                  className="btn-primary"
                  disabled={alliance.members.length >= alliance.maxMembers}
                >
                  {alliance.members.length >= alliance.maxMembers ? 'Full' : 'Join'}
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export default Alliances
