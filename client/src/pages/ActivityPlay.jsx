import React, { useEffect, useState, useRef, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import axios from 'axios'
import { useAuth } from '../context/AuthContext'

const cosmicSymbols = ['🌟', '🪐', '🚀', '👽', '☄️', '🛸', '🌑', '✨', '🔥', '💫', '🌍', '🌌']

function ActivityPlay() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user, updateUser } = useAuth()
  const [activity, setActivity] = useState(null)
  const [loading, setLoading] = useState(true)
  const [started, setStarted] = useState(false)
  const [finished, setFinished] = useState(false)
  const [result, setResult] = useState(null)
  const [timeLeft, setTimeLeft] = useState(0)
  const [answers, setAnswers] = useState({})
  const [memoryCards, setMemoryCards] = useState([])
  const [flippedCards, setFlippedCards] = useState([])
  const [matchedPairs, setMatchedPairs] = useState(0)
  const [memoryScore, setMemoryScore] = useState(0)
  const [physicsScore, setPhysicsScore] = useState(0)
  const timerRef = useRef(null)
  const canvasRef = useRef(null)
  const gameLoopRef = useRef(null)
  const physicsCleanupRef = useRef(null)

  useEffect(() => {
    fetchActivity()
    return () => {
      clearInterval(timerRef.current)
      cancelAnimationFrame(gameLoopRef.current)
      if (physicsCleanupRef.current) {
        physicsCleanupRef.current()
        physicsCleanupRef.current = null
      }
    }
  }, [id])

  useEffect(() => {
    if (!started || finished) return
    if (!activity) return
    if (activity.type !== 'physics') return
    if (!canvasRef.current) return

    if (physicsCleanupRef.current) {
      physicsCleanupRef.current()
      physicsCleanupRef.current = null
    }

    const cleanup = initPhysicsGame()
    physicsCleanupRef.current = typeof cleanup === 'function' ? cleanup : null

    return () => {
      if (physicsCleanupRef.current) {
        physicsCleanupRef.current()
        physicsCleanupRef.current = null
      }
      cancelAnimationFrame(gameLoopRef.current)
    }
  }, [started, finished, activity?.type, activity?.id])

  const fetchActivity = async () => {
    try {
      const token = localStorage.getItem('token')
      const res = await axios.get(`/api/activities/detail/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setActivity(res.data.activity)
      setTimeLeft(res.data.activity.timeLimit)
    } catch (error) {
      console.error('Fetch activity error:', error)
    } finally {
      setLoading(false)
    }
  }

  const startActivity = () => {
    setStarted(true)
    if (activity.type === 'memory') initMemoryGame()
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current)
          handleSubmit()
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }

  // --- Memory Game ---
  const initMemoryGame = () => {
    const data = JSON.parse(activity.data || '{}')
    const gridSize = data.gridSize || 4
    const pairs = data.pairs || 8
    const symbols = cosmicSymbols.slice(0, pairs)
    const cards = [...symbols, ...symbols].sort(() => Math.random() - 0.5)
    setMemoryCards(cards.map((symbol, i) => ({ id: i, symbol, matched: false, flipped: false })))
  }

  const flipCard = (index) => {
    if (flippedCards.length >= 2) return
    if (memoryCards[index].matched || memoryCards[index].flipped) return

    const newCards = [...memoryCards]
    newCards[index].flipped = true
    setMemoryCards(newCards)
    const newFlipped = [...flippedCards, index]
    setFlippedCards(newFlipped)

    if (newFlipped.length === 2) {
      const [i1, i2] = newFlipped
      if (newCards[i1].symbol === newCards[i2].symbol) {
        setTimeout(() => {
          newCards[i1].matched = true
          newCards[i2].matched = true
          setMemoryCards([...newCards])
          setFlippedCards([])
          setMatchedPairs(p => p + 1)
          setMemoryScore(s => s + 20)
        }, 500)
      } else {
        setTimeout(() => {
          newCards[i1].flipped = false
          newCards[i2].flipped = false
          setMemoryCards([...newCards])
          setFlippedCards([])
        }, 800)
      }
    }
  }

  // --- Physics Game ---
  const initPhysicsGame = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const data = JSON.parse(activity.data || '{}')
    const gravityStrength = data.gravityStrength || 0.5
    const planetCount = data.planetCount || 3
    const minScore = data.minScore || 100

    let ship = { x: canvas.width / 2, y: canvas.height / 2, vx: 2, vy: -1, radius: 6, thrust: 0.15, angle: 0, alive: true }
    let planets = []
    let stars = []
    let score = 0
    let frameCount = 0
    let thrusting = false

    for (let i = 0; i < 50; i++) {
      stars.push({ x: Math.random() * canvas.width, y: Math.random() * canvas.height, size: Math.random() * 2 })
    }

    for (let i = 0; i < planetCount; i++) {
      let px, py, pr = 15 + Math.random() * 25
      do {
        px = 50 + Math.random() * (canvas.width - 100)
        py = 50 + Math.random() * (canvas.height - 100)
      } while (Math.hypot(px - ship.x, py - ship.y) < 100)
      planets.push({ x: px, y: py, radius: pr, mass: pr * gravityStrength, color: `hsl(${Math.random() * 360}, 70%, 50%)` })
    }

    const handleMouse = (e) => {
      const rect = canvas.getBoundingClientRect()
      const mx = e.clientX - rect.left
      const my = e.clientY - rect.top
      ship.angle = Math.atan2(my - ship.y, mx - ship.x)
      thrusting = true
    }
    const handleMouseUp = () => { thrusting = false }
    const handleTouch = (e) => {
      e.preventDefault()
      const rect = canvas.getBoundingClientRect()
      const tx = e.touches[0].clientX - rect.left
      const ty = e.touches[0].clientY - rect.top
      ship.angle = Math.atan2(ty - ship.y, tx - ship.x)
      thrusting = true
    }

    canvas.addEventListener('mousedown', handleMouse)
    canvas.addEventListener('mouseup', handleMouseUp)
    canvas.addEventListener('touchstart', handleTouch)
    canvas.addEventListener('touchend', handleMouseUp)

    const gameLoop = () => {
      if (!ship.alive) return
      ctx.fillStyle = '#0a0e1a'
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      stars.forEach(s => {
        ctx.fillStyle = '#fff'
        ctx.beginPath()
        ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2)
        ctx.fill()
      })

      // Gravity physics
      planets.forEach(p => {
        const dx = p.x - ship.x
        const dy = p.y - ship.y
        const dist = Math.hypot(dx, dy)
        const force = p.mass / (dist * dist + 100)
        ship.vx += (dx / dist) * force
        ship.vy += (dy / dist) * force

        // Draw planet
        ctx.fillStyle = p.color
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2)
        ctx.fill()
        // Gravity well visual
        ctx.strokeStyle = p.color + '30'
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.radius * 3, 0, Math.PI * 2)
        ctx.stroke()
      })

      // Thrust
      if (thrusting) {
        ship.vx += Math.cos(ship.angle) * ship.thrust
        ship.vy += Math.sin(ship.angle) * ship.thrust
        ctx.fillStyle = '#f39c12'
        ctx.beginPath()
        ctx.arc(ship.x - Math.cos(ship.angle) * 10, ship.y - Math.sin(ship.angle) * 10, 3, 0, Math.PI * 2)
        ctx.fill()
      }

      // Update ship
      ship.x += ship.vx
      ship.y += ship.vy

      // Screen wrap
      if (ship.x < 0) ship.x = canvas.width
      if (ship.x > canvas.width) ship.x = 0
      if (ship.y < 0) ship.y = canvas.height
      if (ship.y > canvas.height) ship.y = 0

      // Draw ship
      ctx.save()
      ctx.translate(ship.x, ship.y)
      ctx.rotate(ship.angle)
      ctx.fillStyle = '#4a90d9'
      ctx.beginPath()
      ctx.moveTo(10, 0)
      ctx.lineTo(-6, -5)
      ctx.lineTo(-6, 5)
      ctx.closePath()
      ctx.fill()
      ctx.restore()

      // Collision check
      planets.forEach(p => {
        if (Math.hypot(ship.x - p.x, ship.y - p.y) < p.radius + ship.radius) {
          ship.alive = false
          setPhysicsScore(Math.floor(score))
          setFinished(true)
          handleSubmitPhysics(Math.floor(score))
        }
      })

      frameCount++
      score += 0.1 + (thrusting ? 0.2 : 0)
      setPhysicsScore(Math.floor(score))

      ctx.fillStyle = '#fff'
      ctx.font = '14px Rajdhani'
      ctx.fillText(`Score: ${Math.floor(score)} | Survive to reach ${minScore}!`, 10, 20)

      if (!finished) {
        gameLoopRef.current = requestAnimationFrame(gameLoop)
      }
    }

    gameLoopRef.current = requestAnimationFrame(gameLoop)

    return () => {
      canvas.removeEventListener('mousedown', handleMouse)
      canvas.removeEventListener('mouseup', handleMouseUp)
      canvas.removeEventListener('touchstart', handleTouch)
      canvas.removeEventListener('touchend', handleMouseUp)
    }
  }

  const handleAnswerChange = (index, value) => {
    setAnswers(prev => ({ ...prev, [index]: value }))
  }

  const handleSubmit = async () => {
    clearInterval(timerRef.current)
    setFinished(true)

    let submitAnswers = answers
    if (activity.type === 'memory') {
      submitAnswers = { score: memoryScore }
    }

    const timeTaken = activity.timeLimit - timeLeft

    try {
      const token = localStorage.getItem('token')
      const res = await axios.post(`/api/activities/${id}/submit`, {
        answers: submitAnswers,
        timeTaken
      }, { headers: { Authorization: `Bearer ${token}` } })

      setResult(res.data)
      if (res.data.rewards) {
        updateUser({
          ...user,
          points: (user.points || 0) + res.data.rewards.points,
          crystals: (user.crystals || 0) + res.data.rewards.crystals,
          experience: (user.experience || 0) + res.data.rewards.experience,
          level: res.data.rewards.leveledUp ? (user.level || 1) + 1 : (user.level || 1)
        })
      }
    } catch (error) {
      console.error('Submit error:', error)
    }
  }

  const handleSubmitPhysics = async (score) => {
    clearInterval(timerRef.current)
    const timeTaken = activity.timeLimit - timeLeft
    try {
      const token = localStorage.getItem('token')
      const res = await axios.post(`/api/activities/${id}/submit`, {
        answers: { score },
        timeTaken
      }, { headers: { Authorization: `Bearer ${token}` } })
      setResult(res.data)
      if (res.data.rewards) {
        updateUser({
          ...user,
          points: (user.points || 0) + res.data.rewards.points,
          crystals: (user.crystals || 0) + res.data.rewards.crystals,
          experience: (user.experience || 0) + res.data.rewards.experience
        })
      }
    } catch (error) {
      console.error('Submit physics error:', error)
    }
  }

  if (loading) return <div className="loading-screen"><div className="loading-spinner"></div></div>
  if (!activity) return <div>Activity not found</div>

  const activityData = JSON.parse(activity.data || '{}')

  return (
    <div className="activity-play-page">
      <div className="space-header-bar">
        <h1>{activity.title}</h1>
        <Link to={`/activities/${activity.spaceLevel}`} className="btn-back">← Back</Link>
      </div>

      {!started && !finished && (
        <div className="activity-intro card">
          <p className="activity-desc-large">{activity.description}</p>
          <div className="activity-rules">
            <p>⏱️ Time Limit: {activity.timeLimit} seconds</p>
            <p>💎 Reward: {activity.rewardPoints} points</p>
            {activity.rewardCrystals > 0 && <p>🔮 Reward: {activity.rewardCrystals} crystals</p>}
          </div>
          <button onClick={startActivity} className="btn-primary btn-large">Start Challenge</button>
        </div>
      )}

      {started && !finished && (
        <div className="activity-game">
          <div className="timer-bar">
            <div className="timer-fill" style={{ width: `${(timeLeft / activity.timeLimit) * 100}%` }}></div>
            <span className="timer-text">{timeLeft}s</span>
          </div>

          {(activity.type === 'riddle' || activity.type === 'math' || activity.type === 'pattern') && (
            <div className="quiz-game">
              {activityData.questions?.map((q, i) => (
                <div key={i} className="quiz-question card">
                  <p className="question-text">{i + 1}. {q.question}</p>
                  <input
                    type="text"
                    value={answers[i] || ''}
                    onChange={(e) => handleAnswerChange(i, e.target.value)}
                    placeholder="Your answer..."
                    className="answer-input"
                  />
                </div>
              ))}
              <button onClick={handleSubmit} className="btn-primary btn-large">Submit Answers</button>
            </div>
          )}

          {activity.type === 'memory' && (
            <div className="memory-game">
              <div className="memory-score">Score: {memoryScore} | Matches: {matchedPairs}/{activityData.pairs || 8}</div>
              <div
                className="memory-grid"
                style={{ gridTemplateColumns: `repeat(${activityData.gridSize || 4}, 1fr)` }}
              >
                {memoryCards.map((card, i) => (
                  <div
                    key={i}
                    className={`memory-card ${card.flipped || card.matched ? 'flipped' : ''} ${card.matched ? 'matched' : ''}`}
                    onClick={() => flipCard(i)}
                  >
                    <div className="card-front">?</div>
                    <div className="card-back">{card.symbol}</div>
                  </div>
                ))}
              </div>
              {matchedPairs === (activityData.pairs || 8) && (
                <button onClick={handleSubmit} className="btn-success btn-large">Finish!</button>
              )}
            </div>
          )}

          {activity.type === 'physics' && (
            <div className="physics-game">
              <div className="physics-instructions">
                <p>🖱️ Click/Tap anywhere to thrust toward that direction</p>
                <p>🪐 Avoid planets! Use gravity to orbit!</p>
                <p>Score: {physicsScore} | Target: {activityData.minScore || 100}</p>
              </div>
              <canvas
                ref={canvasRef}
                width={800}
                height={500}
                className="physics-canvas"
              />
            </div>
          )}
        </div>
      )}

      {finished && result && (
        <div className={`activity-result card ${result.passed ? 'result-pass' : 'result-fail'}`}>
          <h1>{result.passed ? '🎉 Challenge Complete!' : '❌ Challenge Failed'}</h1>
          <div className="result-stats">
            <p>Score: <strong>{result.score}</strong> / {result.totalQuestions * 10 || activityData.minScore}</p>
            <p>Correct: {result.correctCount} / {result.totalQuestions || '-'}</p>
            <p>Time: {result.timeTaken}s</p>
            <p>Attempts: {result.attempts}</p>
          </div>

          {result.results && result.results.length > 0 && (
            <div className="result-details">
              {result.results.map((r, i) => (
                <div key={i} className={`result-item ${r.isCorrect ? 'correct' : 'wrong'}`}>
                  <p><strong>Q{i + 1}:</strong> {r.question}</p>
                  <p>Your answer: {r.userAnswer || '(empty)'} {r.isCorrect ? '✅' : '❌'}</p>
                  {!r.isCorrect && <p className="explanation">Correct: {r.correctAnswer} - {r.explanation}</p>}
                </div>
              ))}
            </div>
          )}

          {result.rewards && (
            <div className="rewards-section">
              <h2>🎁 Rewards Earned!</h2>
              <div className="rewards-grid">
                <div className="reward-item">
                  <span className="reward-icon">💎</span>
                  <span className="reward-value">+{result.rewards.points}</span>
                  <span className="reward-label">Points</span>
                </div>
                <div className="reward-item">
                  <span className="reward-icon">🔮</span>
                  <span className="reward-value">+{result.rewards.crystals}</span>
                  <span className="reward-label">Crystals</span>
                </div>
                <div className="reward-item">
                  <span className="reward-icon">✨</span>
                  <span className="reward-value">+{result.rewards.experience}</span>
                  <span className="reward-label">XP</span>
                </div>
              </div>
              {result.rewards.leveledUp && <div className="level-up-banner">⭐ LEVEL UP!</div>}
            </div>
          )}

          <div className="battle-actions">
            <Link to={`/activities/${activity.spaceLevel}`} className="btn-primary">More Activities</Link>
            <button onClick={() => window.location.reload()} className="btn-secondary">Retry</button>
          </div>
        </div>
      )}
    </div>
  )
}

export default ActivityPlay
