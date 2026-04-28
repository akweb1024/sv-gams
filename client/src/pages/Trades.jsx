import React, { useEffect, useState } from 'react'
import axios from 'axios'
import { useAuth } from '../context/AuthContext'

function Trades() {
  const { user } = useAuth()
  const [trades, setTrades] = useState([])
  const [inventory, setInventory] = useState([])
  const [showCreate, setShowCreate] = useState(false)
  const [newTrade, setNewTrade] = useState({
    receiverId: '',
    offerType: 'points',
    offerAmount: 0,
    offerItemId: '',
    requestType: 'points',
    requestAmount: 0,
    requestItemId: ''
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token')
      const [tradesRes, userRes] = await Promise.all([
        axios.get('/api/trade/my', { headers: { Authorization: `Bearer ${token}` } }),
        axios.get('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } })
      ])
      setTrades(tradesRes.data.trades)
      setInventory(userRes.data.user.inventory || [])
    } catch (error) {
      console.error('Fetch trades error:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateTrade = async (e) => {
    e.preventDefault()
    try {
      const token = localStorage.getItem('token')
      await axios.post('/api/trade/create', newTrade, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setShowCreate(false)
      setNewTrade({
        receiverId: '',
        offerType: 'points',
        offerAmount: 0,
        offerItemId: '',
        requestType: 'points',
        requestAmount: 0,
        requestItemId: ''
      })
      fetchData()
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to create trade')
    }
  }

  const handleAccept = async (id) => {
    try {
      const token = localStorage.getItem('token')
      await axios.post(`/api/trade/${id}/accept`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      })
      fetchData()
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to accept trade')
    }
  }

  const handleReject = async (id) => {
    try {
      const token = localStorage.getItem('token')
      await axios.post(`/api/trade/${id}/reject`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      })
      fetchData()
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to reject trade')
    }
  }

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner"></div>
        <p>Loading trades...</p>
      </div>
    )
  }

  return (
    <div className="trades-page">
      <div className="page-header">
        <h1>💱 Trade Center</h1>
        <p>Exchange points, crystals, and items with other warriors</p>
      </div>

      {!showCreate ? (
        <button onClick={() => setShowCreate(true)} className="btn-primary">
          ➕ Create Trade
        </button>
      ) : (
        <div className="card create-trade">
          <h2>Create Trade Offer</h2>
          <form onSubmit={handleCreateTrade}>
            <div className="trade-section">
              <h3>You Give:</h3>
              <div className="form-group">
                <label>Type</label>
                <select 
                  value={newTrade.offerType} 
                  onChange={(e) => setNewTrade({ ...newTrade, offerType: e.target.value })}
                >
                  <option value="points">Points</option>
                  <option value="crystals">Crystals</option>
                  <option value="item">Item</option>
                </select>
              </div>
              {newTrade.offerType !== 'item' ? (
                <div className="form-group">
                  <label>Amount</label>
                  <input
                    type="number"
                    value={newTrade.offerAmount}
                    onChange={(e) => setNewTrade({ ...newTrade, offerAmount: parseInt(e.target.value) || 0 })}
                    min="1"
                  />
                </div>
              ) : (
                <div className="form-group">
                  <label>Select Item</label>
                  <select
                    value={newTrade.offerItemId}
                    onChange={(e) => setNewTrade({ ...newTrade, offerItemId: e.target.value })}
                  >
                    <option value="">Choose item...</option>
                    {inventory.map(item => (
                      <option key={item.id} value={item.id}>
                        {item.itemName} ({item.rarity}) x{item.quantity}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="trade-section">
              <h3>You Receive:</h3>
              <div className="form-group">
                <label>Type</label>
                <select 
                  value={newTrade.requestType} 
                  onChange={(e) => setNewTrade({ ...newTrade, requestType: e.target.value })}
                >
                  <option value="points">Points</option>
                  <option value="crystals">Crystals</option>
                </select>
              </div>
              <div className="form-group">
                <label>Amount</label>
                <input
                  type="number"
                  value={newTrade.requestAmount}
                  onChange={(e) => setNewTrade({ ...newTrade, requestAmount: parseInt(e.target.value) || 0 })}
                  min="1"
                />
              </div>
            </div>

            <div className="form-group">
              <label>Trade With (User ID)</label>
              <input
                type="text"
                value={newTrade.receiverId}
                onChange={(e) => setNewTrade({ ...newTrade, receiverId: e.target.value })}
                required
                placeholder="Enter user's ID"
              />
            </div>

            <div className="form-actions">
              <button type="submit" className="btn-primary">Create Offer</button>
              <button type="button" onClick={() => setShowCreate(false)} className="btn-secondary">Cancel</button>
            </div>
          </form>
        </div>
      )}

      <div className="trades-list">
        <h2>Your Trades</h2>
        {trades.length === 0 ? (
          <p>No pending trades.</p>
        ) : (
          trades.map(trade => (
            <div key={trade.id} className="card trade-card">
              <div className="trade-header">
                <span className={`trade-direction ${trade.senderId === user?.id ? 'sent' : 'received'}`}>
                  {trade.senderId === user?.id ? 'Sent to' : 'Received from'} 
                  {trade.senderId === user?.id 
                    ? ` ${trade.receiver.displayName || trade.receiver.username}`
                    : ` ${trade.sender.displayName || trade.sender.username}`
                  }
                </span>
              </div>
              
              <div className="trade-details">
                <div className="trade-offer">
                  <h4>Offering:</h4>
                  <p>
                    {trade.offerType === 'item' ? 'Item' : trade.offerType === 'points' ? '💎 Points' : '🔮 Crystals'}: 
                    {trade.offerAmount > 0 && ` ${trade.offerAmount}`}
                  </p>
                </div>
                <div className="trade-arrow">⇄</div>
                <div className="trade-request">
                  <h4>Requesting:</h4>
                  <p>
                    {trade.requestType === 'points' ? '💎 Points' : '🔮 Crystals'}: 
                    {trade.requestAmount > 0 && ` ${trade.requestAmount}`}
                  </p>
                </div>
              </div>
              
              {trade.receiverId === user?.id && (
                <div className="trade-actions">
                  <button onClick={() => handleAccept(trade.id)} className="btn-success">
                    ✓ Accept
                  </button>
                  <button onClick={() => handleReject(trade.id)} className="btn-danger">
                    ✕ Reject
                  </button>
                </div>
              )}
              
              {trade.senderId === user?.id && (
                <p className="trade-status">Waiting for response...</p>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export default Trades
