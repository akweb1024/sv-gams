import React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useSocket } from '../context/SocketContext'
import { useLanguage } from '../context/LanguageContext'

function Navbar() {
  const { user, logout } = useAuth()
  const { connected } = useSocket()
  const { lang, toggleLanguage, t } = useLanguage()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <nav className="navbar">
      <div className="nav-brand">
        <Link to="/">
          <span className="logo-icon">⚔️</span>
          <span className="logo-text">{t('appName')}</span>
        </Link>
      </div>
      
      {user && (
        <>
          <div className="nav-links">
            <Link to="/spaces">{t('spaces')}</Link>
            <Link to="/activities/1">{t('activities')}</Link>
            <Link to="/alliances">{t('alliances')}</Link>
            <Link to="/trades">{t('trades')}</Link>
            <Link to="/leaderboard">{t('leaderboard')}</Link>
          </div>
          
          <div className="nav-user">
            <button onClick={toggleLanguage} className="lang-toggle" title="Toggle Language">
              {lang === 'en' ? '🇮🇳 हिंदी' : '🇬🇧 English'}
            </button>
            <div className="user-stats">
              <span className="stat points">💎 {user.points}</span>
              <span className="stat crystals">🔮 {user.crystals}</span>
              <span className="stat level">⭐ {t('level')} {user.level}</span>
              <span className={`connection-dot ${connected ? 'connected' : 'disconnected'}`} title={connected ? t('online') : t('offline')}></span>
            </div>
            <Link to={`/profile/${user.username}`} className="user-name">
              {user.displayName || user.username}
            </Link>
            <button onClick={handleLogout} className="logout-btn">{t('logout')}</button>
          </div>
        </>
      )}
    </nav>
  )
}

export default Navbar
