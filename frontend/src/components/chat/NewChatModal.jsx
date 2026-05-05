import { useState, useEffect } from 'react'
import { userAPI, chatAPI } from '../../services/api'
import useChatStore from '../../store/chatStore'
import Avatar from '../common/Avatar'
import { useToast } from '../common/Toast'
import './NewChatModal.css'

export default function NewChatModal({ onClose }) {
  const [mode, setMode] = useState('private')
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [selected, setSelected] = useState([])
  const [groupName, setGroupName] = useState('')
  const [loading, setLoading] = useState(false)
  const [searching, setSearching] = useState(false)

  const { upsertChat, selectChat } = useChatStore()
  const toast = useToast()

  useEffect(() => {
    if (query.length < 2) { setResults([]); return }
    const timer = setTimeout(async () => {
      setSearching(true)
      try {
        const res = await userAPI.search(query)
        setResults(res.data)
      } catch { setResults([]) }
      finally { setSearching(false) }
    }, 300)
    return () => clearTimeout(timer)
  }, [query])

  const toggle = (u) => {
    if (mode === 'private') { setSelected([u]); return }
    setSelected(p => p.find(x => x.id === u.id) ? p.filter(x => x.id !== u.id) : [...p, u])
  }

  const handleCreate = async () => {
    if (selected.length === 0) { toast.error('Пайдаланушы таңдаңыз'); return }
    if (mode === 'group' && !groupName.trim()) { toast.error('Топ атауын енгізіңіз'); return }

    setLoading(true)
    try {
      const res = await chatAPI.create({
        type: mode.toUpperCase(),
        name: mode === 'group' ? groupName.trim() : null,
        memberIds: selected.map(u => u.id)
      })
      upsertChat(res.data)
      selectChat(res.data.id)
      onClose()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Қате орын алды')
    } finally { setLoading(false) }
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h3>Жаңа чат</h3>
          <button className="btn-icon" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          {/* Mode selector */}
          <div className="toggle-tabs" style={{ marginBottom: 16 }}>
            <button type="button" className={`toggle-tab ${mode==='private'?'active':''}`} onClick={() => { setMode('private'); setSelected([]) }}>💬 Жеке чат</button>
            <button type="button" className={`toggle-tab ${mode==='group'?'active':''}`}   onClick={() => { setMode('group'); setSelected([]) }}>👥 Топ</button>
          </div>

          {mode === 'group' && (
            <div className="form-group">
              <label>Топ атауы</label>
              <input className="input" placeholder="Топ атауы..." value={groupName} onChange={e => setGroupName(e.target.value)} />
            </div>
          )}

          <div className="form-group">
            <label>Пайдаланушы іздеу</label>
            <input className="input" placeholder="🔍 Никнейм, email немесе телефон..." value={query} onChange={e => setQuery(e.target.value)} />
          </div>

          {selected.length > 0 && (
            <div className="selected-chips">
              {selected.map(u => (
                <div key={u.id} className="chip">
                  <span>{u.name}</span>
                  <button onClick={() => toggle(u)}>✕</button>
                </div>
              ))}
            </div>
          )}

          <div className="search-results">
            {searching
              ? <div style={{ display:'flex', justifyContent:'center', padding:20 }}><span className="spinner" /></div>
              : results.length > 0 ? results.map(u => (
                  <div key={u.id} className={`result-item ${selected.find(s => s.id === u.id) ? 'selected' : ''}`} onClick={() => toggle(u)}>
                    <Avatar user={u} size={38} showOnline />
                    <div className="result-info">
                      <span className="result-name">{u.name}</span>
                      <span className="result-sub">@{u.username}</span>
                    </div>
                    {selected.find(s => s.id === u.id) && <span style={{ color:'var(--accent)', fontWeight:700 }}>✓</span>}
                  </div>
                ))
              : query.length >= 2 ? <p style={{ textAlign:'center', color:'var(--text-muted)', padding:20 }}>Нәтиже жоқ</p>
              : <p style={{ textAlign:'center', color:'var(--text-muted)', padding:20, fontSize:13 }}>Іздеу үшін кемінде 2 символ енгізіңіз</p>
            }
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Болдырмау</button>
          <button className="btn btn-primary" onClick={handleCreate} disabled={loading || selected.length === 0}>
            {loading ? <><span className="spinner" /> Жасалуда...</> : mode === 'group' ? '👥 Топ құру' : '💬 Чат бастау'}
          </button>
        </div>
      </div>
    </div>
  )
}
