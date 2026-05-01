import React, { useEffect, useState } from 'react'
import axios from 'axios'
import { useNavigate } from 'react-router-dom'

function AdminDashboard() {
  const navigate = useNavigate()
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const [overview, setOverview] = useState(null)
  const [actionLoading, setActionLoading] = useState(false)

  useEffect(() => {
    bootstrap()
  }, [])

  const bootstrap = async () => {
    try {
      const token = localStorage.getItem('token')
      const statusRes = await axios.get('/api/game/admin/status', {
        headers: { Authorization: `Bearer ${token}` }
      })

      if (!statusRes.data?.isAdmin) {
        setIsAdmin(false)
        setLoading(false)
        return
      }

      setIsAdmin(true)
      await fetchOverview()
    } catch (error) {
      console.error('Admin bootstrap error:', error)
      setIsAdmin(false)
    } finally {
      setLoading(false)
    }
  }

  const fetchOverview = async () => {
    const token = localStorage.getItem('token')
    const res = await axios.get('/api/game/admin/overview', {
      headers: { Authorization: `Bearer ${token}` }
    })
    setOverview(res.data)
  }

  const runArchiveAction = async (dryRun) => {
    const confirmed = window.confirm(
      dryRun
        ? 'Run dry-run archive (no payouts written)?'
        : 'Run live archive rerun (writes payouts if missing)?'
    )
    if (!confirmed) return

    try {
      setActionLoading(true)
      const token = localStorage.getItem('token')
      const url = dryRun
        ? '/api/game/leaderboard/boss/archive/rerun?dry_run=true'
        : '/api/game/leaderboard/boss/archive/rerun'
      const res = await axios.post(url, {}, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const processed = res.data?.seasonRewards?.length || 0
      alert(`${dryRun ? 'Dry-run complete' : 'Archive rerun complete'}: ${processed} winner records processed.`)
      await fetchOverview()
    } catch (error) {
      alert(error.response?.data?.message || 'Admin action failed')
    } finally {
      setActionLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner"></div>
        <p>Loading admin dashboard...</p>
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="empty-state-card">
        <h3>Admin access required</h3>
        <p>Your account is not in `ADMIN_USERNAMES`.</p>
        <button className="btn-primary" onClick={() => navigate('/')}>Go to Dashboard</button>
      </div>
    )
  }

  const metrics = overview?.metrics || {}
  const weeklySeason = overview?.weeklySeason || {}

  return (
    <div className="dashboard-page">
      <div className="page-header">
        <h1>🛠️ Admin Control & Monitoring</h1>
        <p>Operational controls and live game metrics</p>
      </div>

      <div className="card">
        <h2>⚙️ Controls</h2>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button
            className="btn-secondary"
            disabled={actionLoading}
            onClick={() => runArchiveAction(true)}
          >
            {actionLoading ? 'Running…' : 'Dry-run Weekly Archive'}
          </button>
          <button
            className="btn-primary"
            disabled={actionLoading}
            onClick={() => runArchiveAction(false)}
          >
            {actionLoading ? 'Running…' : 'Re-run Weekly Archive'}
          </button>
          <button
            className="btn-secondary"
            disabled={actionLoading}
            onClick={fetchOverview}
          >
            Refresh Metrics
          </button>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card"><h3>Total Users</h3><p>{metrics.totalUsers ?? 0}</p></div>
        <div className="stat-card"><h3>Players</h3><p>{metrics.playerUsers ?? 0}</p></div>
        <div className="stat-card"><h3>NPCs</h3><p>{metrics.npcUsers ?? 0}</p></div>
        <div className="stat-card"><h3>Online (5m)</h3><p>{metrics.onlineRecentUsers ?? 0}</p></div>
        <div className="stat-card"><h3>Spaces</h3><p>{metrics.totalSpaces ?? 0}</p></div>
        <div className="stat-card"><h3>Species</h3><p>{metrics.totalSpecies ?? 0}</p></div>
        <div className="stat-card"><h3>Active Activities</h3><p>{metrics.activeActivities ?? 0}</p></div>
        <div className="stat-card"><h3>Boss Battles (24h)</h3><p>{metrics.bossBattles24h ?? 0}</p></div>
      </div>

      <div className="card leaderboard-table boss-leaderboard-table">
        <h2>👑 Weekly Top Boss Warriors</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '10px' }}>
          Week start: {weeklySeason.windowStart ? new Date(weeklySeason.windowStart).toLocaleString() : '-'}
        </p>
        <div className="boss-table-header">
          <span className="col-rank">Rank</span>
          <span className="col-player">Warrior</span>
          <span className="col-boss-clears">Boss Clears</span>
          <span className="col-boss-points">Boss Points</span>
          <span className="col-fast-clear">Fastest Clear</span>
          <span className="col-first-clear">Status</span>
        </div>
        {(weeklySeason.topBossWarriors || []).map((entry) => (
          <div key={`${entry.username}-${entry.rank}`} className="boss-table-row">
            <span className="col-rank">#{entry.rank}</span>
            <span className="col-player">{entry.username}</span>
            <span className="col-boss-clears">{entry.totalBossClears}</span>
            <span className="col-boss-points">💎 {entry.totalBossPoints}</span>
            <span className="col-fast-clear">{entry.fastestClearRounds ? `${entry.fastestClearRounds} rounds` : '-'}</span>
            <span className="col-first-clear">Active</span>
          </div>
        ))}
        {(weeklySeason.topBossWarriors || []).length === 0 && (
          <p className="no-data">No weekly boss activity yet.</p>
        )}
      </div>
    </div>
  )
}

export default AdminDashboard
