import React, { useEffect, useState } from 'react'
import axios from 'axios'
import { useAuth } from '../context/AuthContext'

const CATEGORY_META = {
  daily: { icon: '📅', title: 'Daily Quests', note: 'Reset every day' },
  weekly: { icon: '🗓️', title: 'Weekly Quests', note: 'Reset every week' },
  achievement: { icon: '🏆', title: 'Achievements', note: 'Lifetime goals' },
}

function Quests() {
  const { updateUser } = useAuth()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(null)

  const token = localStorage.getItem('token')
  const auth = { headers: { Authorization: `Bearer ${token}` } }

  const load = async () => {
    try {
      const res = await axios.get('/api/quests', auth)
      setData(res.data)
    } catch (error) {
      console.error('Quests load error:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const claim = async (quest) => {
    setBusy(quest.id)
    try {
      const res = await axios.post(`/api/quests/${quest.id}/claim`, {}, auth)
      if (res.data.user) updateUser(res.data.user)
      await load()
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to claim')
    } finally { setBusy(null) }
  }

  const claimDaily = async () => {
    setBusy('daily-reward')
    try {
      const res = await axios.post('/api/quests/daily-reward/claim', {}, auth)
      if (res.data.user) updateUser(res.data.user)
      await load()
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to claim daily reward')
    } finally { setBusy(null) }
  }

  if (loading) {
    return <div className="loading-screen"><div className="loading-spinner"></div><p>Loading quests...</p></div>
  }

  const renderQuest = (q) => {
    const pct = Math.min(100, Math.round((q.progress / q.goalCount) * 100))
    return (
      <div key={q.id} className={`card quest-card ${q.completed ? 'completed' : ''}`}>
        <div className="quest-head">
          <h3>{q.title}</h3>
          {q.claimed ? <span className="completed-badge">Claimed</span>
            : q.completed ? <span className="unlocked-badge">Ready</span> : null}
        </div>
        <p className="quest-desc">{q.description}</p>
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${pct}%` }}></div>
        </div>
        <div className="quest-foot">
          <span className="quest-progress">{q.progress}/{q.goalCount}</span>
          <span className="quest-rewards">
            {q.rewards.points > 0 && <span>💎 {q.rewards.points}</span>}
            {q.rewards.crystals > 0 && <span>🔮 {q.rewards.crystals}</span>}
            {q.rewards.xp > 0 && <span>✨ {q.rewards.xp}xp</span>}
            {q.rewards.skillPoints > 0 && <span>🌟 {q.rewards.skillPoints}</span>}
          </span>
        </div>
        {q.completed && !q.claimed && (
          <button className="btn-success" disabled={busy === q.id} onClick={() => claim(q)}>
            {busy === q.id ? '...' : 'Claim Reward'}
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="quests-page">
      <div className="page-header">
        <h1>📜 Quests & Achievements</h1>
        <p>Complete goals to earn points, crystals, XP, and skill points</p>
      </div>

      <div className="card daily-reward-card">
        <div>
          <h2>🎁 Daily Login Reward</h2>
          <p>Current streak: <strong>{data.dailyReward.streak} day{data.dailyReward.streak === 1 ? '' : 's'}</strong></p>
        </div>
        <button className="btn-primary" disabled={!data.dailyReward.available || busy === 'daily-reward'} onClick={claimDaily}>
          {data.dailyReward.available ? 'Claim Daily Reward' : 'Claimed Today ✓'}
        </button>
      </div>

      {['daily', 'weekly', 'achievement'].map((cat) => {
        const list = data.quests[cat] || []
        if (list.length === 0) return null
        const meta = CATEGORY_META[cat]
        return (
          <div key={cat} className="quest-section">
            <h2>{meta.icon} {meta.title} <span className="quest-note">{meta.note}</span></h2>
            <div className="quest-grid">{list.map(renderQuest)}</div>
          </div>
        )
      })}
    </div>
  )
}

export default Quests
