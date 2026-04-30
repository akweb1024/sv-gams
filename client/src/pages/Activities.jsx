import React, { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import axios from 'axios'
import { useAuth } from '../context/AuthContext'

const typeIcons = {
  riddle: '🧩',
  math: '🔢',
  pattern: '🔮',
  memory: '🧠',
  physics: '🪐'
}

const difficultyColors = {
  easy: '#27ae60',
  medium: '#f39c12',
  hard: '#e74c3c'
}

function Activities() {
  const { level } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [activities, setActivities] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchActivities()
  }, [level])

  const fetchActivities = async () => {
    try {
      const token = localStorage.getItem('token')
      const res = await axios.get(`/api/activities/${level}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setActivities(res.data.activities)
    } catch (error) {
      console.error('Fetch activities error:', error)
      if (error.response?.status === 403) navigate('/spaces')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner"></div>
        <p>Loading activities...</p>
      </div>
    )
  }

  return (
    <div className="activities-page">
      <div className="space-header-bar">
        <h1>🎯 Activities - Space-{level}</h1>
        <Link to={`/spaces/${level}`} className="btn-back">← Back to Space</Link>
      </div>

      <p className="subtitle">Complete brain challenges and physics games to earn points and crystals!</p>

      <div className="activities-grid">
        {activities.map(activity => (
          <div key={activity.id} className="activity-card">
            <div className="activity-header">
              <span className="activity-icon">{typeIcons[activity.type] || '✨'}</span>
              <span
                className="difficulty-badge"
                style={{ backgroundColor: difficultyColors[activity.difficulty] || '#95a5a6' }}
              >
                {activity.difficulty}
              </span>
            </div>
            <h3>{activity.title}</h3>
            <p className="activity-desc">{activity.description}</p>
            <div className="activity-meta">
              <span>⏱️ {activity.timeLimit}s</span>
              <span>💎 {activity.rewardPoints} pts</span>
              {activity.rewardCrystals > 0 && <span>🔮 {activity.rewardCrystals} crystals</span>}
            </div>
            {activity.userProgress?.completed && (
              <div className="completed-badge">✅ Completed (Best: {activity.userProgress.score} pts)</div>
            )}
            <Link
              to={`/activity/${activity.id}`}
              className={`btn-primary activity-btn ${activity.userProgress?.completed ? 'btn-secondary' : ''}`}
            >
              {activity.userProgress?.completed ? 'Retry' : 'Start Challenge'}
            </Link>
          </div>
        ))}
      </div>
      {activities.length === 0 && (
        <div className="empty-state-card">
          <h3>No activities available for this space</h3>
          <p>Activities are not seeded yet for Space-{level}. Please contact admin to seed data.</p>
        </div>
      )}
    </div>
  )
}

export default Activities
