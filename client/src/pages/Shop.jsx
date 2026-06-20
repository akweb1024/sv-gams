import React, { useEffect, useState } from 'react'
import axios from 'axios'
import { useAuth } from '../context/AuthContext'

const RARITY_ORDER = ['common', 'rare', 'epic', 'legendary', 'mythic', 'celestial']
const SLOT_ICON = { weapon: '⚔️', armor: '🛡️', accessory: '💍', potion: '🧪' }

function Shop() {
  const { user, updateUser } = useAuth()
  const [tab, setTab] = useState('shop')
  const [items, setItems] = useState([])
  const [wallet, setWallet] = useState({ points: 0, crystals: 0, level: 1 })
  const [inventory, setInventory] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(null)

  const token = localStorage.getItem('token')
  const auth = { headers: { Authorization: `Bearer ${token}` } }

  const load = async () => {
    try {
      const [shopRes, invRes] = await Promise.all([
        axios.get('/api/shop', auth),
        axios.get('/api/shop/inventory', auth),
      ])
      setItems(shopRes.data.items)
      setWallet(shopRes.data.wallet)
      setInventory(invRes.data.inventory)
      setStats(invRes.data.stats)
    } catch (error) {
      console.error('Shop load error:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const syncWallet = (w) => { if (w) { setWallet((prev) => ({ ...prev, ...w })); updateUser(w) } }

  const act = async (fn, id) => {
    setBusy(id)
    try { await fn() } catch (error) { alert(error.response?.data?.message || 'Action failed') }
    finally { setBusy(null) }
  }

  const buy = (item) => act(async () => {
    const res = await axios.post('/api/shop/buy', { shopItemId: item.id }, auth)
    syncWallet(res.data.wallet)
    await load()
  }, item.id)

  const equip = (item) => act(async () => {
    const url = item.equipped ? 'unequip' : 'equip'
    await axios.post(`/api/shop/inventory/${item.id}/${url}`, {}, auth)
    await load()
  }, item.id)

  const upgrade = (item) => act(async () => {
    const res = await axios.post(`/api/shop/inventory/${item.id}/upgrade`, {}, auth)
    syncWallet(res.data.wallet)
    await load()
  }, item.id)

  const sell = (item) => act(async () => {
    if (!confirm(`Sell ${item.itemName} for ${item.sellValue} points?`)) return
    const res = await axios.post(`/api/shop/inventory/${item.id}/sell`, {}, auth)
    syncWallet(res.data.wallet)
    await load()
  }, item.id)

  if (loading) {
    return <div className="loading-screen"><div className="loading-spinner"></div><p>Loading shop...</p></div>
  }

  const canAfford = (i) => wallet.points >= i.pricePoints && wallet.crystals >= i.priceCrystals
  const meetsLevel = (i) => wallet.level >= i.minLevel

  return (
    <div className="shop-page">
      <div className="page-header">
        <h1>🛒 Cosmic Bazaar</h1>
        <p>Buy, equip, upgrade, and sell gear to grow your power</p>
      </div>

      <div className="shop-wallet card">
        <span className="stat points">💎 {wallet.points} points</span>
        <span className="stat crystals">🔮 {wallet.crystals} crystals</span>
        {stats && <span className="stat power">⚡ Power {stats.totalPower}</span>}
        {stats && <span className="stat">❤️ Health {stats.totalHealth}</span>}
      </div>

      <div className="shop-tabs">
        <button className={tab === 'shop' ? 'btn-primary' : 'btn-secondary'} onClick={() => setTab('shop')}>Shop</button>
        <button className={tab === 'inventory' ? 'btn-primary' : 'btn-secondary'} onClick={() => setTab('inventory')}>
          Inventory ({inventory.length})
        </button>
      </div>

      {tab === 'shop' ? (
        <div className="shop-grid">
          {items.map((item) => (
            <div key={item.id} className={`card shop-item rarity-${item.rarity}`}>
              <div className="shop-item-head">
                <span className="item-icon">{SLOT_ICON[item.slot] || '📦'}</span>
                <span className={`rarity-badge ${item.rarity}`}>{item.rarity}</span>
              </div>
              <h3 className="item-name">{item.name}</h3>
              <p className="item-desc">{item.description}</p>
              <div className="item-bonuses">
                {item.powerBonus > 0 && <span className="item-stat">⚡ +{item.powerBonus}</span>}
                {item.healthBonus > 0 && <span className="item-stat">❤️ +{item.healthBonus}</span>}
              </div>
              <div className="item-price">
                {item.pricePoints > 0 && <span>💎 {item.pricePoints}</span>}
                {item.priceCrystals > 0 && <span>🔮 {item.priceCrystals}</span>}
              </div>
              <button
                className="btn-primary"
                disabled={busy === item.id || !canAfford(item) || !meetsLevel(item)}
                onClick={() => buy(item)}
              >
                {!meetsLevel(item) ? `Requires Lv.${item.minLevel}` : !canAfford(item) ? 'Not enough' : busy === item.id ? '...' : 'Buy'}
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="shop-grid">
          {inventory.length === 0 && <div className="card empty-state-card"><p>No items yet. Visit the shop or win battles!</p></div>}
          {inventory.map((item) => (
            <div key={item.id} className={`card shop-item rarity-${item.rarity} ${item.equipped ? 'equipped' : ''}`}>
              <div className="shop-item-head">
                <span className="item-icon">{SLOT_ICON[item.slot] || '📦'}</span>
                <span className={`rarity-badge ${item.rarity}`}>{item.rarity}</span>
                {item.equipped && <span className="equipped-badge">Equipped</span>}
              </div>
              <h3 className="item-name">{item.itemName}{item.upgradeLevel > 0 && <span className="upgrade-tag"> +{item.upgradeLevel}</span>}</h3>
              <div className="item-bonuses">
                {item.powerBonus > 0 && <span className="item-stat">⚡ +{Math.round(item.powerBonus * (1 + 0.1 * item.upgradeLevel))}</span>}
                {item.healthBonus > 0 && <span className="item-stat">❤️ +{Math.round(item.healthBonus * (1 + 0.1 * item.upgradeLevel))}</span>}
              </div>
              <div className="item-actions">
                {item.slot && (
                  <button className={item.equipped ? 'btn-secondary' : 'btn-success'} disabled={busy === item.id} onClick={() => equip(item)}>
                    {item.equipped ? 'Unequip' : 'Equip'}
                  </button>
                )}
                {item.slot && item.upgradeCost && (
                  <button className="btn-primary" disabled={busy === item.id} onClick={() => upgrade(item)} title={`💎 ${item.upgradeCost.points} 🔮 ${item.upgradeCost.crystals}`}>
                    Upgrade
                  </button>
                )}
                <button className="btn-danger" disabled={busy === item.id} onClick={() => sell(item)}>
                  Sell ({item.sellValue}💎)
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default Shop
