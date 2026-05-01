import React, { useEffect, useState } from 'react'
import axios from 'axios'
import { useNavigate } from 'react-router-dom'

function AdminDashboard() {
  const navigate = useNavigate()
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const [overview, setOverview] = useState(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [usersLoading, setUsersLoading] = useState(false)
  const [usersData, setUsersData] = useState({ users: [], total: 0, page: 1, pageSize: 25 })
  const [usersQuery, setUsersQuery] = useState('')
  const [includeNpcUsers, setIncludeNpcUsers] = useState(true)

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
      await fetchUsers({ page: 1 })
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

  const fetchUsers = async ({ page } = {}) => {
    try {
      setUsersLoading(true)
      const token = localStorage.getItem('token')
      const nextPage = page || usersData.page || 1
      const res = await axios.get('/api/game/admin/users', {
        headers: { Authorization: `Bearer ${token}` },
        params: {
          q: usersQuery || undefined,
          includeNpc: includeNpcUsers ? 'true' : 'false',
          page: nextPage,
          pageSize: usersData.pageSize
        }
      })
      setUsersData({
        users: res.data?.users || [],
        total: res.data?.total || 0,
        page: res.data?.page || nextPage,
        pageSize: res.data?.pageSize || usersData.pageSize
      })
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to load users')
    } finally {
      setUsersLoading(false)
    }
  }

  const updateUser = async (userId, payload) => {
    const token = localStorage.getItem('token')
    const res = await axios.patch(`/api/game/admin/users/${userId}`, payload, {
      headers: { Authorization: `Bearer ${token}` }
    })
    return res.data?.user
  }

  const resetPassword = async (userId) => {
    const newPassword = window.prompt('Enter a new password (min 6 chars):')
    if (!newPassword) return
    const token = localStorage.getItem('token')
    await axios.post(`/api/game/admin/users/${userId}/reset-password`, { newPassword }, {
      headers: { Authorization: `Bearer ${token}` }
    })
    alert('Password updated.')
  }

  const deleteUser = async (userId, username) => {
    const confirmed = window.confirm(`Delete user "${username}"? This cannot be undone.`)
    if (!confirmed) return
    const token = localStorage.getItem('token')
    await axios.delete(`/api/game/admin/users/${userId}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    await fetchUsers({ page: usersData.page })
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
  const users = usersData.users || []
  const totalPages = Math.max(1, Math.ceil((usersData.total || 0) / (usersData.pageSize || 25)))

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

      <div className="card">
        <h2>👥 Users</h2>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
          <input
            value={usersQuery}
            onChange={(e) => setUsersQuery(e.target.value)}
            placeholder="Search by username / email / display name"
            style={{ minWidth: 260 }}
          />
          <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input
              type="checkbox"
              checked={includeNpcUsers}
              onChange={(e) => setIncludeNpcUsers(e.target.checked)}
            />
            Include NPCs
          </label>
          <button className="btn-secondary" disabled={usersLoading} onClick={() => fetchUsers({ page: 1 })}>
            {usersLoading ? 'Loading…' : 'Search'}
          </button>
          <button className="btn-secondary" disabled={usersLoading} onClick={() => fetchUsers({ page: usersData.page })}>
            Refresh
          </button>
        </div>

        <div style={{ marginTop: 12, overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--border-color)' }}>
                <th style={{ padding: '10px 6px' }}>Username</th>
                <th style={{ padding: '10px 6px' }}>Email</th>
                <th style={{ padding: '10px 6px' }}>Display</th>
                <th style={{ padding: '10px 6px' }}>Type</th>
                <th style={{ padding: '10px 6px' }}>Level</th>
                <th style={{ padding: '10px 6px' }}>Power</th>
                <th style={{ padding: '10px 6px' }}>Last Login</th>
                <th style={{ padding: '10px 6px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '10px 6px' }}>{u.username}</td>
                  <td style={{ padding: '10px 6px' }}>{u.email}</td>
                  <td style={{ padding: '10px 6px' }}>{u.displayName || '-'}</td>
                  <td style={{ padding: '10px 6px' }}>{u.isNpc ? 'NPC' : 'Player'}</td>
                  <td style={{ padding: '10px 6px' }}>{u.level}</td>
                  <td style={{ padding: '10px 6px' }}>{u.power}</td>
                  <td style={{ padding: '10px 6px' }}>{u.lastLogin ? new Date(u.lastLogin).toLocaleString() : '-'}</td>
                  <td style={{ padding: '10px 6px' }}>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <button
                        className="btn-secondary"
                        disabled={usersLoading}
                        onClick={async () => {
                          const next = window.prompt('New display name (leave blank to clear):', u.displayName || '')
                          if (next === null) return
                          await updateUser(u.id, { displayName: next.trim() ? next : null })
                          await fetchUsers({ page: usersData.page })
                        }}
                      >
                        Edit Name
                      </button>
                      <button
                        className="btn-secondary"
                        disabled={usersLoading}
                        onClick={async () => {
                          await updateUser(u.id, { isNpc: !u.isNpc })
                          await fetchUsers({ page: usersData.page })
                        }}
                      >
                        Toggle NPC
                      </button>
                      <button
                        className="btn-secondary"
                        disabled={usersLoading}
                        onClick={() => resetPassword(u.id)}
                      >
                        Reset Password
                      </button>
                      <button
                        className="btn-primary"
                        disabled={usersLoading}
                        onClick={() => deleteUser(u.id, u.username)}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={8} style={{ padding: '12px 6px', color: 'var(--text-secondary)' }}>
                    {usersLoading ? 'Loading…' : 'No users found.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div style={{ marginTop: 12, display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ color: 'var(--text-secondary)' }}>
            Showing page {usersData.page} of {totalPages} ({usersData.total} total)
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              className="btn-secondary"
              disabled={usersLoading || usersData.page <= 1}
              onClick={() => fetchUsers({ page: Math.max(1, usersData.page - 1) })}
            >
              Prev
            </button>
            <button
              className="btn-secondary"
              disabled={usersLoading || usersData.page >= totalPages}
              onClick={() => fetchUsers({ page: Math.min(totalPages, usersData.page + 1) })}
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AdminDashboard
