import React, { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import axios from 'axios'
import { useAuth } from '../context/AuthContext'
import { useSocket } from '../context/SocketContext'

const rarityColors = {
  common: '#95a5a6',
  rare: '#3498db',
  epic: '#9b59b6',
  legendary: '#f39c12'
}

function SpaceDetail() {
  const { level } = useParams()
  const navigate = useNavigate()
  const { user, updateUser } = useAuth()
  const { joinSpace, changeSpace, sendChatMessage, socket } = useSocket()

  const [species, setSpecies] = useState([])
  const [npcs, setNpcs] = useState([])
  const [players, setPlayers] = useState([])
  const [chatMessages, setChatMessages] = useState([])
  const [chatInput, setChatInput] = useState('')
  const [loading, setLoading] = useState(true)
  const [spaceUsers, setSpaceUsers] = useState([])
  const [boss, setBoss] = useState(null)
  const [bossCooldownLeft, setBossCooldownLeft] = useState(0)

  useEffect(() => {
    fetchSpaceData()
    joinSpace(parseInt(level))

    if (socket) {
      socket.on('user-joined', (data) => {
        setSpaceUsers(prev => [...prev.filter(u => u.socketId !== data.socketId), data])
      })

      socket.on('user-left', (data) => {
        setSpaceUsers(prev => prev.filter(u => u.socketId !== data.socketId))
      })

      socket.on('space-users', (users) => {
        setSpaceUsers(users)
      })

      socket.on('chat-message', (message) => {
        setChatMessages(prev => [...prev, message])
      })
    }

    return () => {
      if (socket) {
        socket.off('user-joined')
        socket.off('user-left')
        socket.off('space-users')
        socket.off('chat-message')
      }
    }
  }, [level, socket])

  useEffect(() => {
    if (!boss?.cooldown?.isOnCooldown) {
      setBossCooldownLeft(0)
      return
    }

    setBossCooldownLeft(boss.cooldown.remainingSeconds || 0)
    const timer = setInterval(() => {
      setBossCooldownLeft(prev => (prev > 0 ? prev - 1 : 0))
    }, 1000)

    return () => clearInterval(timer)
  }, [boss?.cooldown?.isOnCooldown, boss?.cooldown?.remainingSeconds])

  const fetchSpaceData = async () => {
    try {
      const token = localStorage.getItem('token')
      const [speciesRes, playersRes, npcsRes, bossRes] = await Promise.all([
        axios.get(`/api/game/spaces/${level}/species`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`/api/game/spaces/${level}/players`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`/api/game/spaces/${level}/npcs`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`/api/game/spaces/${level}/boss`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ])
      setSpecies(speciesRes.data.species)
      setPlayers(playersRes.data.players)
      setNpcs(npcsRes.data.npcs)
      setBoss(bossRes.data?.boss || null)
    } catch (error) {
      console.error('Fetch space data error:', error)
      if (error.response?.status === 403) {
        navigate('/spaces')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleSendMessage = (e) => {
    e.preventDefault()
    if (chatInput.trim()) {
      sendChatMessage(chatInput)
      setChatInput('')
    }
  }

  const battleNpc = async (npcId) => {
    try {
      const token = localStorage.getItem('token')
      const response = await axios.post('/api/game/battle/npc',
        { npcId },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      const result = response.data
      updateUser(result.user)
      alert(`${result.result === 'victory' ? '🏆 VICTORY!' : '💀 DEFEAT!'} vs ${result.opponent}\nEarned: 💎 ${result.rewards.points} pts, 🔮 ${result.rewards.crystals} crystals, ✨ ${result.rewards.experience} XP${result.rewards.itemDrop ? `\n🎁 Item Drop: ${result.rewards.itemDrop.itemName} (${result.rewards.itemDrop.rarity})` : ''}${result.leveledUp ? '\n⭐ LEVEL UP!' : ''}`)
    } catch (error) {
      console.error('Battle NPC error:', error)
      alert('Battle failed: ' + (error.response?.data?.message || 'Unknown error'))
    }
  }

  const battleBoss = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await axios.post('/api/game/battle/boss',
        { spaceLevel: parseInt(level, 10) },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      const result = response.data
      updateUser(result.user)
      const firstClearText = result.rewards.firstClearBonus
        ? `\n🎉 First-Clear Bonus: +${result.rewards.firstClearBonus.points} pts, +${result.rewards.firstClearBonus.crystals} crystals`
        : ''
      alert(`${result.result === 'victory' ? '👑 BOSS DEFEATED!' : '💀 BOSS WON!'} vs ${result.opponent}\nEarned: 💎 ${result.rewards.points} pts, 🔮 ${result.rewards.crystals} crystals, ✨ ${result.rewards.experience} XP${firstClearText}${result.rewards.itemDrop ? `\n🎁 Relic: ${result.rewards.itemDrop.itemName} (${result.rewards.itemDrop.rarity})` : ''}${result.leveledUp ? '\n⭐ LEVEL UP!' : ''}`)
      fetchSpaceData()
    } catch (error) {
      console.error('Battle Boss error:', error)
      const cooldownRemaining = error.response?.data?.cooldown?.remainingSeconds
      if (cooldownRemaining) {
        const mins = Math.floor(cooldownRemaining / 60)
        const secs = cooldownRemaining % 60
        alert(`Boss battle cooldown active. Try again in ${mins}m ${secs}s.`)
        fetchSpaceData()
        return
      }
      alert('Boss battle failed: ' + (error.response?.data?.message || 'Unknown error'))
    }
  }

  const cooldownMinutes = Math.floor(bossCooldownLeft / 60)
  const cooldownSeconds = bossCooldownLeft % 60
  const bossButtonDisabled = bossCooldownLeft > 0

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner"></div>
        <p>Entering space...</p>
      </div>
    )
  }

  return (
    <div className="space-detail-page">
      <div className="space-header-bar">
        <h1>Space-{level}</h1>
        <div>
          <Link to={`/activities/${level}`} className="btn-back" style={{ marginRight: '10px' }}>🎯 Activities</Link>
          <Link to="/spaces" className="btn-back">← Back to Spaces</Link>
        </div>
      </div>

      <div className="space-layout">
        <div className="space-main">
          {boss && (
            <div className="card npc-section">
              <h2>👑 Space Boss</h2>
              <div className="npc-grid">
                <div className="npc-card" style={{ borderColor: '#f1c40f', boxShadow: '0 0 24px rgba(241,196,15,0.35)' }}>
                  <div className="npc-header">
                    <span className="npc-icon">👑</span>
                    <h3>{boss.name}</h3>
                    <span className="npc-badge" style={{ background: '#f39c12' }}>BOSS</span>
                  </div>
                  <div className="npc-stats">
                    <span>🌌 Space-{boss.spaceLevel}</span>
                    <span>⚡ Power: {boss.power}</span>
                    <span>❤️ Health: {boss.health}</span>
                    <span>💎 {boss.rewardPoints} pts · 🔮 {boss.rewardCrystals}</span>
                    {boss.firstClearBonus?.available ? (
                      <span>🎉 First Clear Bonus: +{boss.firstClearBonus.points} pts · +{boss.firstClearBonus.crystals} crystals</span>
                    ) : (
                      <span>✅ First clear bonus already claimed</span>
                    )}
                    {bossButtonDisabled && (
                      <span>⏳ Cooldown: {cooldownMinutes}m {cooldownSeconds}s</span>
                    )}
                  </div>
                  <button
                    onClick={battleBoss}
                    className="btn-battle"
                    disabled={bossButtonDisabled}
                    style={{
                      background: bossButtonDisabled
                        ? 'linear-gradient(135deg, #7f8c8d, #95a5a6)'
                        : 'linear-gradient(135deg, #f39c12, #e67e22)'
                    }}
                  >
                    {bossButtonDisabled ? '⏳ Boss Cooling Down' : '👑 Challenge Boss'}
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="card npc-section">
            <h2>🤖 Computer Warriors</h2>
            <div className="npc-grid">
              {npcs.map(npc => (
                <div key={npc.id} className="npc-card">
                  <div className="npc-header">
                    <span className="npc-icon">🤖</span>
                    <h3>{npc.displayName || npc.username}</h3>
                    <span className="npc-badge">AI</span>
                  </div>
                  <div className="npc-stats">
                    <span>⭐ Lv.{npc.level}</span>
                    <span>⚡ Power: {npc.power}</span>
                    <span>❤️ Health: {npc.health}/{npc.maxHealth}</span>
                    <span>🏆 {npc.wins}W/{npc.losses}L</span>
                  </div>
                  <button onClick={() => battleNpc(npc.id)} className="btn-battle">
                    ⚔️ Battle NPC
                  </button>
                </div>
              ))}
            </div>
            {npcs.length === 0 && <p className="no-data">No computer warriors in this space.</p>}
          </div>

          <div className="card species-section">
            <h2>👾 Species to Battle</h2>
            <div className="species-grid">
              {species.map(s => (
                <div
                  key={s.id}
                  className="species-card"
                  style={{ borderColor: rarityColors[s.rarity] || '#95a5a6' }}
                >
                  <div className="species-header">
                    <h3>{s.name}</h3>
                    <span
                      className="rarity-badge"
                      style={{ backgroundColor: rarityColors[s.rarity] || '#95a5a6' }}
                    >
                      {s.rarity}
                    </span>
                  </div>
                  <div className="species-stats">
                    <span>⚡ Power: {s.power}</span>
                    <span>❤️ Health: {s.health}</span>
                  </div>
                  <div className="species-rewards">
                    <span>💰 {s.rewardPoints} pts</span>
                    {s.rewardCrystals > 0 && <span>🔮 {s.rewardCrystals} crystals</span>}
                  </div>
                  <Link to={`/battle/${s.id}`} className="btn-battle">
                    ⚔️ Battle
                  </Link>
                </div>
              ))}
            </div>
          </div>

          <div className="card players-section">
            <h2>🎮 Players in this Space</h2>
            {players.length > 0 ? (
              <div className="players-list">
                {players.map(player => (
                  <Link
                    key={player.id}
                    to={`/profile/${player.username}`}
                    className="player-item"
                  >
                    <span className="player-name">
                      {player.displayName || player.username}
                    </span>
                    <span className="player-stats">
                      Lv.{player.level} | ⚡{player.power} | 🏆{player.wins}W/{player.losses}L
                    </span>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="no-players">No other warriors currently in this space</p>
            )}
          </div>
        </div>

        <div className="space-sidebar">
          <div className="card online-users">
            <h2>🟢 Online ({spaceUsers.length})</h2>
            <div className="online-list">
              {spaceUsers.map(u => (
                <div key={u.socketId} className="online-user">
                  <span className="online-dot"></span>
                  <span>{u.username}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="card chat-section">
            <h2>💬 Space Chat</h2>
            <div className="chat-messages">
              {chatMessages.length === 0 && (
                <p className="no-messages">No messages yet. Start the conversation!</p>
              )}
              {chatMessages.map((msg, i) => (
                <div key={i} className="chat-message">
                  <span className="chat-user">{msg.username}:</span>
                  <span className="chat-text">{msg.message}</span>
                  <span className="chat-time">
                    {new Date(msg.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              ))}
            </div>
            <form onSubmit={handleSendMessage} className="chat-form">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Type a message..."
              />
              <button type="submit">Send</button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SpaceDetail
