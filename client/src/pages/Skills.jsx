import React, { useEffect, useState } from 'react'
import axios from 'axios'
import { useAuth } from '../context/AuthContext'

const CLASS_ICON = { warrior: '⚔️', mage: '🔮', assassin: '🗡️', guardian: '🛡️' }

function Skills() {
  const { updateUser } = useAuth()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)

  const token = localStorage.getItem('token')
  const auth = { headers: { Authorization: `Bearer ${token}` } }

  const load = async () => {
    try {
      const res = await axios.get('/api/skills', auth)
      setData(res.data)
      updateUser({ className: res.data.className, skillPoints: res.data.skillPoints })
    } catch (error) {
      console.error('Skills load error:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const run = async (fn) => {
    setBusy(true)
    try { await fn() } catch (error) { alert(error.response?.data?.message || 'Action failed') }
    finally { setBusy(false) }
  }

  const chooseClass = (key) => run(async () => {
    await axios.post('/api/skills/class', { className: key }, auth)
    await load()
  })

  const unlock = (skill) => run(async () => {
    await axios.post('/api/skills/unlock', { skillKey: skill.key }, auth)
    await load()
  })

  const reset = () => run(async () => {
    if (!confirm(`Reset your class and skills for ${data.resetCostCrystals} crystals? Skill points are refunded.`)) return
    await axios.post('/api/skills/reset', {}, auth)
    await load()
  })

  if (loading) {
    return <div className="loading-screen"><div className="loading-spinner"></div><p>Loading skills...</p></div>
  }

  const { classes, skills, className, skillPoints } = data
  const unlockedKeys = new Set(skills.filter((s) => s.unlocked).map((s) => s.key))
  const canUnlock = (s) =>
    !s.unlocked && skillPoints >= s.cost && (!s.requires || unlockedKeys.has(s.requires))

  // No class chosen yet — show class picker.
  if (!className) {
    return (
      <div className="skills-page">
        <div className="page-header">
          <h1>🎯 Choose Your Class</h1>
          <p>Your class shapes your combat style. Choose wisely — changing it later costs crystals.</p>
        </div>
        <div className="class-grid">
          {classes.map((c) => (
            <div key={c.key} className="card class-card">
              <span className="class-icon">{CLASS_ICON[c.key]}</span>
              <h2>{c.label}</h2>
              <p>{c.description}</p>
              <div className="class-mods">
                <span className="item-stat">⚡ ×{c.powerMult}</span>
                <span className="item-stat">❤️ ×{c.healthMult}</span>
              </div>
              <button className="btn-primary" disabled={busy} onClick={() => chooseClass(c.key)}>Become {c.label}</button>
            </div>
          ))}
        </div>
      </div>
    )
  }

  const myClass = classes.find((c) => c.key === className)
  const mySkills = skills.filter((s) => s.className === className)
  const tiers = [...new Set(mySkills.map((s) => s.tier))].sort()

  return (
    <div className="skills-page">
      <div className="page-header">
        <h1>{CLASS_ICON[className]} {myClass?.label} Skill Tree</h1>
        <p>{myClass?.description}</p>
      </div>

      <div className="skills-bar card">
        <span className="stat">🌟 {skillPoints} skill points</span>
        <span className="stat">Earn more by leveling up and completing quests</span>
        <button className="btn-secondary" disabled={busy} onClick={reset}>Reset Class ({data.resetCostCrystals}🔮)</button>
      </div>

      <div className="skill-tree">
        {tiers.map((tier) => (
          <div key={tier} className="skill-tier">
            <h3 className="skill-tier-label">Tier {tier}</h3>
            <div className="skill-row">
              {mySkills.filter((s) => s.tier === tier).map((s) => (
                <div key={s.key} className={`card skill-node ${s.unlocked ? 'unlocked' : canUnlock(s) ? 'available' : 'locked'}`}>
                  <h4>{s.name}</h4>
                  <p>{s.description}</p>
                  {s.requires && !unlockedKeys.has(s.requires) && (
                    <p className="skill-req">Requires: {skills.find((x) => x.key === s.requires)?.name}</p>
                  )}
                  {s.unlocked ? (
                    <span className="unlocked-badge">✓ Unlocked</span>
                  ) : (
                    <button className="btn-primary" disabled={busy || !canUnlock(s)} onClick={() => unlock(s)}>
                      Unlock ({s.cost}🌟)
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default Skills
