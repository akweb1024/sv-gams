import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import axios from 'axios'
import { useAuth } from '../context/AuthContext'
import { useLanguage } from '../context/LanguageContext'

function Register() {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    displayName: ''
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const { t } = useLanguage()
  const navigate = useNavigate()

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const response = await axios.post('/api/auth/register', formData)
      login(response.data.user, response.data.token)
      navigate('/')
    } catch (error) {
      setError(error.response?.data?.message || t('error'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-header">
          <h1>⚔️ {t('register')}</h1>
          <p>{t('joinUniverse')}</p>
        </div>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label>{t('username')}</label>
            <input type="text" name="username" value={formData.username} onChange={handleChange} required placeholder={t('username')} />
          </div>
          <div className="form-group">
            <label>{t('email')}</label>
            <input type="email" name="email" value={formData.email} onChange={handleChange} required placeholder={t('email')} />
          </div>
          <div className="form-group">
            <label>{t('displayName')}</label>
            <input type="text" name="displayName" value={formData.displayName} onChange={handleChange} required placeholder={t('displayName')} />
          </div>
          <div className="form-group">
            <label>{t('password')}</label>
            <input type="password" name="password" value={formData.password} onChange={handleChange} required placeholder={t('password')} />
          </div>
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? t('loading') : t('register')}
          </button>
        </form>

        <p className="auth-switch">
          {t('haveAccount')} <Link to="/login">{t('login')}</Link>
        </p>
      </div>
    </div>
  )
}

export default Register
