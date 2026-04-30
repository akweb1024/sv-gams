import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import axios from 'axios'
import { useAuth } from '../context/AuthContext'

function Battle() {
  const { speciesId } = useParams()
  const navigate = useNavigate()
  const { user, updateUser } = useAuth()
  
  const [battleResult, setBattleResult] = useState(null)
  const [currentRound, setCurrentRound] = useState(0)
  const [isBattling, setIsBattling] = useState(false)
  const [showResult, setShowResult] = useState(false)
  const [animatedLog, setAnimatedLog] = useState([])
  const [battleError, setBattleError] = useState('')

  useEffect(() => {
    if (!speciesId) {
      setBattleError('Invalid battle link. Species ID is missing.')
    } else {
      setBattleError('')
    }
  }, [speciesId])

  const startBattle = async () => {
    if (!speciesId) {
      setBattleError('Invalid battle link. Species ID is missing.')
      return
    }
    setIsBattling(true)
    setShowResult(false)
    setAnimatedLog([])
    setCurrentRound(0)
    setBattleError('')

    try {
      const token = localStorage.getItem('token')
      const response = await axios.post('/api/game/battle/species', 
        { speciesId },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      
      const result = response.data
      setBattleResult(result)
      
      // Animate battle log
      const log = result.battleLog
      let round = 0
      const interval = setInterval(() => {
        if (round < log.length) {
          setAnimatedLog(prev => [...prev, log[round]])
          setCurrentRound(round + 1)
          round++
        } else {
          clearInterval(interval)
          setIsBattling(false)
          setShowResult(true)
          if (result.user) {
            updateUser(result.user)
          }
        }
      }, 500)

    } catch (error) {
      console.error('Battle error:', error)
      setBattleError(error?.response?.data?.message || 'Unable to start this battle. This species may not exist anymore.')
      setIsBattling(false)
    }
  }

  return (
    <div className="battle-page">
      <div className="page-header">
        <h1>⚔️ Battle Arena</h1>
      </div>

      {battleError && (
        <div className="empty-state-card">
          <h3>Battle unavailable</h3>
          <p>{battleError}</p>
          <button onClick={() => navigate('/spaces')} className="btn-primary" style={{ marginTop: '10px' }}>
            Back to Spaces
          </button>
        </div>
      )}

      {!battleError && !isBattling && !showResult && (
        <div className="battle-start">
          <div className="vs-display">
            <div className="fighter player">
              <span className="fighter-icon">🧑‍🚀</span>
              <h3>{user?.displayName || user?.username}</h3>
              <p>⚡ Power: {user?.power}</p>
              <p>❤️ Health: {user?.health}</p>
              <p>⭐ Level: {user?.level}</p>
            </div>
            <div className="vs-text">VS</div>
            <div className="fighter enemy">
              <span className="fighter-icon">👾</span>
              <h3>Unknown Species</h3>
              <p>Preparing for battle...</p>
            </div>
          </div>
          <button onClick={startBattle} className="btn-primary btn-large">
            ⚔️ Start Battle
          </button>
        </div>
      )}

      {isBattling && (
        <div className="battle-arena">
          <div className="battle-status">
            <h2>Battle in Progress...</h2>
            <p>Round {Math.ceil(currentRound / 2)}</p>
          </div>
          
          <div className="battle-log">
            {animatedLog.map((entry, index) => (
              <div 
                key={index} 
                className={`log-entry ${entry.actor}`}
              >
                <span className="log-round">Round {entry.round}</span>
                <span className="log-actor">
                  {entry.actor === 'player' ? '⚔️ You' : '👾 Enemy'}
                </span>
                <span className="log-action">
                  {entry.action === 'attack' ? 'attacked for' : 'used'}
                </span>
                <span className="log-damage">{entry.damage} damage!</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {showResult && battleResult && (
        <div className={`battle-result ${battleResult.result}`}>
          <div className="result-header">
            <h1>{battleResult.result === 'victory' ? '🏆 VICTORY!' : '💀 DEFEAT!'}</h1>
            {battleResult.leveledUp && (
              <div className="level-up-banner">
                ⭐ LEVEL UP! You are now Level {battleResult.user.level}!
              </div>
            )}
          </div>

          <div className="rewards-section">
            <h2>Rewards</h2>
            <div className="rewards-grid">
              <div className="reward-item">
                <span className="reward-icon">💎</span>
                <span className="reward-value">+{battleResult.rewards.points}</span>
                <span className="reward-label">Points</span>
              </div>
              {battleResult.rewards.crystals > 0 && (
                <div className="reward-item">
                  <span className="reward-icon">🔮</span>
                  <span className="reward-value">+{battleResult.rewards.crystals}</span>
                  <span className="reward-label">Crystals</span>
                </div>
              )}
              <div className="reward-item">
                <span className="reward-icon">✨</span>
                <span className="reward-value">+{battleResult.rewards.experience}</span>
                <span className="reward-label">XP</span>
              </div>
            </div>
            
            {battleResult.rewards.itemDrop && (
              <div className="item-drop">
                <h3>🎁 Item Drop!</h3>
                <div className="dropped-item" style={{ borderColor: battleResult.rewards.itemDrop.rarity === 'epic' ? '#9b59b6' : '#3498db' }}>
                  <span className="item-name">{battleResult.rewards.itemDrop.itemName}</span>
                  <span className="item-type">{battleResult.rewards.itemDrop.itemType}</span>
                  <span className="item-rarity">{battleResult.rewards.itemDrop.rarity}</span>
                  {battleResult.rewards.itemDrop.powerBonus > 0 && (
                    <span className="item-bonus">+{battleResult.rewards.itemDrop.powerBonus} Power</span>
                  )}
                  {battleResult.rewards.itemDrop.healthBonus > 0 && (
                    <span className="item-bonus">+{battleResult.rewards.itemDrop.healthBonus} Health</span>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="battle-actions">
            <button onClick={startBattle} className="btn-primary">
              ⚔️ Battle Again
            </button>
            <button onClick={() => navigate('/spaces')} className="btn-secondary">
              ← Back to Spaces
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default Battle
