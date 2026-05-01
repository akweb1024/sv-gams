import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'

function Leaderboard() {
  const [leaderboard, setLeaderboard] = useState([])
  const [bossLeaderboard, setBossLeaderboard] = useState([])
  const [bossSeason, setBossSeason] = useState('all')
  const [bossWindowStart, setBossWindowStart] = useState(null)
  const [bossWindowEnd, setBossWindowEnd] = useState(null)
  const [seasonRewards, setSeasonRewards] = useState([])
  const [isAdmin, setIsAdmin] = useState(false)
  const [rerunLoading, setRerunLoading] = useState(false)
  const [dryRunLoading, setDryRunLoading] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchLeaderboard()
  }, [])

  useEffect(() => {
    fetchBossLeaderboard()
  }, [bossSeason])

  const fetchLeaderboard = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await axios.get('/api/game/leaderboard', {
        headers: { Authorization: `Bearer ${token}` }
      })
      const adminRes = await axios.get('/api/game/admin/status', {
        headers: { Authorization: `Bearer ${token}` }
      })
      setLeaderboard(response.data.leaderboard)
      setIsAdmin(!!adminRes.data?.isAdmin)
    } catch (error) {
      console.error('Fetch leaderboard error:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchBossLeaderboard = async () => {
    try {
      const token = localStorage.getItem('token')
      const bossResponse = await axios.get(`/api/game/leaderboard/boss?season=${bossSeason}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setBossLeaderboard(bossResponse.data.bossLeaderboard || [])
      setBossWindowStart(bossResponse.data.windowStart || null)
      setBossWindowEnd(bossResponse.data.windowEnd || null)
      setSeasonRewards(bossResponse.data.seasonRewards || [])
    } catch (error) {
      console.error('Fetch boss leaderboard error:', error)
    }
  }

  const formatTime = (value) => {
    if (!value) return '-'
    return new Date(value).toLocaleString()
  }

  const getFirstClearSummary = (entries) => {
    if (!entries || entries.length === 0) return 'No clears yet'
    const earliest = entries.reduce((minEntry, entry) => {
      if (!minEntry) return entry
      return new Date(entry.firstClearAt) < new Date(minEntry.firstClearAt) ? entry : minEntry
    }, null)
    if (!earliest) return 'No clears yet'
    return `S${earliest.spaceLevel}: ${formatTime(earliest.firstClearAt)}`
  }

  const rerunLastWeekArchive = async () => {
    const confirmed = window.confirm('Re-run last-week archive rewards now? This is admin-only and writes payouts if missing.')
    if (!confirmed) return

    try {
      setRerunLoading(true)
      const token = localStorage.getItem('token')
      const res = await axios.post('/api/game/leaderboard/boss/archive/rerun', {}, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const rewardsCount = res.data?.seasonRewards?.length || 0
      alert(`Archive rerun complete. Processed ${rewardsCount} winner records.`)
      if (bossSeason === 'last_week') {
        fetchBossLeaderboard()
      }
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to rerun archive')
    } finally {
      setRerunLoading(false)
    }
  }

  const dryRunLastWeekArchive = async () => {
    const confirmed = window.confirm('Run a dry-run for last-week archive? This will preview processing without writing payouts.')
    if (!confirmed) return

    try {
      setDryRunLoading(true)
      const token = localStorage.getItem('token')
      const res = await axios.post('/api/game/leaderboard/boss/archive/rerun?dry_run=true', {}, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const rewardsCount = res.data?.seasonRewards?.length || 0
      alert(`Dry-run complete. ${rewardsCount} winner records would be processed.`)
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to run archive dry-run')
    } finally {
      setDryRunLoading(false)
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

      <div className="card leaderboard-table boss-leaderboard-table">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', marginBottom: '14px', flexWrap: 'wrap' }}>
          <h2 style={{ marginBottom: 0 }}>👑 Global Boss Leaderboard</h2>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={() => setBossSeason('all')}
              className={bossSeason === 'all' ? 'btn-primary' : 'btn-secondary'}
              style={{ padding: '6px 12px' }}
            >
              All Time
            </button>
            <button
              onClick={() => setBossSeason('week')}
              className={bossSeason === 'week' ? 'btn-primary' : 'btn-secondary'}
              style={{ padding: '6px 12px' }}
            >
              This Week
            </button>
            <button
              onClick={() => setBossSeason('last_week')}
              className={bossSeason === 'last_week' ? 'btn-primary' : 'btn-secondary'}
              style={{ padding: '6px 12px' }}
            >
              Last Week
            </button>
            {isAdmin && (
              <>
                <button
                  onClick={dryRunLastWeekArchive}
                  className="btn-secondary"
                  disabled={dryRunLoading}
                  style={{ padding: '6px 12px', borderColor: '#4a90d9', color: '#4a90d9' }}
                  title="Admin only: dry-run last-week archive payout"
                >
                  {dryRunLoading ? 'Dry Run…' : 'Admin: Dry Run'}
                </button>
                <button
                  onClick={rerunLastWeekArchive}
                  className="btn-secondary"
                  disabled={rerunLoading}
                  style={{ padding: '6px 12px', borderColor: '#f39c12', color: '#f39c12' }}
                  title="Admin only: rerun last-week archive payout"
                >
                  {rerunLoading ? 'Running…' : 'Admin: Re-run Archive'}
                </button>
              </>
            )}
          </div>
        </div>
        {(bossSeason === 'week' || bossSeason === 'last_week') && bossWindowStart && (
          <p style={{ color: 'var(--text-secondary)', marginBottom: '10px' }}>
            {bossSeason === 'week'
              ? `Weekly season started: ${formatTime(bossWindowStart)}`
              : `Last week window: ${formatTime(bossWindowStart)} → ${formatTime(bossWindowEnd)}`}
          </p>
        )}
        {bossSeason === 'last_week' && seasonRewards.length > 0 && (
          <div style={{ marginBottom: '12px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            {seasonRewards.map((reward) => (
              <p key={`${reward.userId}-${reward.rank}`}>
                🏅 Rank #{reward.rank} {reward.title}: {reward.username} earned 💎 {reward.points} + 🔮 {reward.crystals}
              </p>
            ))}
          </div>
        )}
        <div className="boss-table-header">
          <span className="col-rank">Rank</span>
          <span className="col-player">Warrior</span>
          <span className="col-boss-clears">Boss Clears</span>
          <span className="col-boss-points">Boss Points</span>
          <span className="col-fast-clear">Fastest Clear</span>
          <span className="col-first-clear">First-Clear Timestamp</span>
        </div>
        {bossLeaderboard.map((player, index) => (
          <Link
            key={player.userId}
            to={`/profile/${player.username}`}
            className={`boss-table-row ${index < 3 ? 'top-' + (index + 1) : ''}`}
          >
            <span className="col-rank">
              {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
            </span>
            <span className="col-player">{player.displayName || player.username}</span>
            <span className="col-boss-clears">{player.totalBossClears}</span>
            <span className="col-boss-points">💎 {player.totalBossPoints}</span>
            <span className="col-fast-clear">{player.fastestClearRounds ? `${player.fastestClearRounds} rounds` : '-'}</span>
            <span className="col-first-clear">{getFirstClearSummary(player.firstClearTimestamps)}</span>
          </Link>
        ))}
        {bossLeaderboard.length === 0 && (
          <p className="no-data">
            {bossSeason === 'week'
              ? 'No boss clears recorded this week yet. Be the first legend.'
              : bossSeason === 'last_week'
                ? 'No boss clears recorded last week.'
                : 'No boss clears recorded yet. Be the first legend.'}
          </p>
        )}
      </div>
    </div>
  )
}

export default Leaderboard
