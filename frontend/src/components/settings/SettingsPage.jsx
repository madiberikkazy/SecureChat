import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { userAPI } from '../../services/api'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext'
import { useToast } from '../common/Toast'
import Avatar from '../common/Avatar'
import './SettingsPage.css'

const SECTIONS = [
  { id: 'profile',      icon: '👤', label: 'Профиль' },
  { id: 'appearance',   icon: '🎨', label: 'Сыртқы көрініс' },
  { id: 'security',     icon: '🔐', label: 'Қауіпсіздік' },
  { id: 'notifications',icon: '🔔', label: 'Хабарландырулар' },
  { id: 'about',        icon: 'ℹ️',  label: 'Туралы' },
]

export default function SettingsPage() {
  const [active, setActive] = useState('profile')
  const navigate = useNavigate()
  const { logout } = useAuth()

  return (
    <div className="settings-page">
      {/* SIDEBAR */}
      <div className="settings-nav">
        <div className="settings-nav-header">
          <button className="btn-icon" onClick={() => navigate(-1)} title="Артқа">←</button>
          <h2>Баптаулар</h2>
        </div>
        {SECTIONS.map(s => (
          <button
            key={s.id}
            className={`settings-nav-item ${active === s.id ? 'active' : ''}`}
            onClick={() => setActive(s.id)}
          >
            <span className="settings-nav-icon">{s.icon}</span>
            <span>{s.label}</span>
          </button>
        ))}
        <div style={{ flex:1 }} />
        <button className="settings-nav-item danger" onClick={logout}>
          <span className="settings-nav-icon">🚪</span>
          <span>Шығу</span>
        </button>
      </div>

      {/* CONTENT */}
      <div className="settings-content">
        {active === 'profile'       && <ProfileSection />}
        {active === 'appearance'    && <AppearanceSection />}
        {active === 'security'      && <SecuritySection />}
        {active === 'notifications' && <NotificationsSection />}
        {active === 'about'         && <AboutSection />}
      </div>
    </div>
  )
}

// ── PROFILE ──
function ProfileSection() {
  const { user, updateUser } = useAuth()
  const toast = useToast()
  const fileRef = useRef(null)

  const [f, setF] = useState({
    name: user?.name || '',
    username: user?.username || '',
    bio: user?.bio || '',
    email: user?.email || '',
    phone: user?.phone || '',
  })
  const [loading, setLoading] = useState(false)
  const [avatarLoading, setAvatarLoading] = useState(false)

  const set = k => e => setF(p => ({ ...p, [k]: e.target.value }))

  const save = async () => {
    setLoading(true)
    try {
      const res = await userAPI.updateProfile(f)
      updateUser(res.data)
      toast.success('Профиль сәтті сақталды ✓')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Сақтау мүмкін болмады')
    } finally { setLoading(false) }
  }

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const form = new FormData(); form.append('file', file)
    setAvatarLoading(true)
    try {
      const res = await userAPI.uploadAvatar(form)
      updateUser(res.data)
      toast.success('Аватар жаңартылды ✓')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Жүктеу мүмкін болмады')
    } finally { setAvatarLoading(false) }
  }

  const removeAvatar = async () => {
    try {
      const res = await userAPI.deleteAvatar()
      updateUser(res.data)
      toast.success('Аватар жойылды')
    } catch { toast.error('Жою мүмкін болмады') }
  }

  return (
    <div className="settings-section">
      <h3 className="settings-section-title">Профиль ақпараты</h3>

      {/* AVATAR */}
      <div className="avatar-section">
        <div className="avatar-preview">
          <Avatar user={user} size={90} />
          {avatarLoading && <div className="avatar-overlay"><span className="spinner" /></div>}
        </div>
        <div className="avatar-actions">
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={handleAvatarChange} />
          <button className="btn btn-secondary" onClick={() => fileRef.current?.click()} disabled={avatarLoading}>
            📷 Сурет жүктеу
          </button>
          {user?.avatarUrl && (
            <button className="btn btn-ghost" onClick={removeAvatar}>🗑 Жою</button>
          )}
          <p className="avatar-hint">JPG, PNG, GIF — максимум 5MB</p>
        </div>
      </div>

      <div className="divider" />

      <div className="form-row">
        <div className="form-group">
          <label>Аты-жөні</label>
          <input className="input" value={f.name} onChange={set('name')} placeholder="Аты-жөні" />
        </div>
        <div className="form-group">
          <label>Никнейм</label>
          <div className="input-prefix-wrap">
            <span className="input-prefix-icon">@</span>
            <input className="input" value={f.username} onChange={set('username')} placeholder="username" />
          </div>
        </div>
      </div>

      <div className="form-group">
        <label>Сипаттама</label>
        <textarea className="textarea" value={f.bio} onChange={set('bio')}
          placeholder="Өзіңіз туралы бірнеше сөз..." rows={3} maxLength={255} />
        <small style={{ color:'var(--text-muted)' }}>{f.bio.length}/255</small>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>Email</label>
          <input className="input" type="email" value={f.email} onChange={set('email')} placeholder="email@example.com" />
        </div>
        <div className="form-group">
          <label>Телефон</label>
          <input className="input" type="tel" value={f.phone} onChange={set('phone')} placeholder="+77001234567" />
        </div>
      </div>

      <button className="btn btn-primary" onClick={save} disabled={loading}>
        {loading ? <><span className="spinner" /> Сақталуда...</> : '💾 Сақтау'}
      </button>
    </div>
  )
}

// ── APPEARANCE ──
function AppearanceSection() {
  const { theme, setTheme } = useTheme()
  const [fontSize, setFontSize] = useState(() => localStorage.getItem('fontSize') || 'medium')
  const [chatBg, setChatBg] = useState(() => localStorage.getItem('chatBg') || 'default')

  const themes = [
    { id:'dark',  label:'Қараңғы', preview:'#0e1117' },
    { id:'light', label:'Жарық',   preview:'#f0f2f5' },
  ]
  const fonts = [
    { id:'small',  label:'Кіші',    size:'13px' },
    { id:'medium', label:'Орташа',  size:'14px' },
    { id:'large',  label:'Үлкен',   size:'16px' },
  ]

  const applyFont = (id, size) => {
    setFontSize(id)
    document.body.style.fontSize = size
    localStorage.setItem('fontSize', id)
  }

  return (
    <div className="settings-section">
      <h3 className="settings-section-title">Сыртқы көрініс</h3>

      <div className="settings-group">
        <h4 className="settings-group-title">Тема</h4>
        <div className="theme-grid">
          {themes.map(t => (
            <button key={t.id} className={`theme-card ${theme===t.id?'active':''}`} onClick={() => setTheme(t.id)}>
              <div className="theme-preview" style={{ background: t.preview }} />
              <span>{t.label}</span>
              {theme === t.id && <span className="theme-check">✓</span>}
            </button>
          ))}
        </div>
      </div>

      <div className="divider" />

      <div className="settings-group">
        <h4 className="settings-group-title">Мәтін өлшемі</h4>
        <div className="font-grid">
          {fonts.map(f => (
            <button key={f.id} className={`font-card ${fontSize===f.id?'active':''}`}
              onClick={() => applyFont(f.id, f.size)}>
              <span style={{ fontSize: f.size }}>Aa</span>
              <span>{f.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── SECURITY ──
function SecuritySection() {
  const toast = useToast()
  const [f, setF] = useState({ currentPassword:'', newPassword:'', confirmPassword:'' })
  const [loading, setLoading] = useState(false)
  const [showPwd, setShowPwd] = useState({ cur:false, new:false, con:false })

  const set = k => e => setF(p => ({ ...p, [k]: e.target.value }))

  const submit = async () => {
    if (f.newPassword !== f.confirmPassword) { toast.error('Жаңа құпия сөздер сәйкес келмейді'); return }
    if (f.newPassword.length < 6) { toast.error('Кемінде 6 символ'); return }
    setLoading(true)
    try {
      await userAPI.changePassword({ currentPassword: f.currentPassword, newPassword: f.newPassword })
      setF({ currentPassword:'', newPassword:'', confirmPassword:'' })
      toast.success('Құпия сөз сәтті өзгертілді ✓')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Өзгерту мүмкін болмады')
    } finally { setLoading(false) }
  }

  const PwdField = ({ label, key_, show_, toggle_ }) => (
    <div className="form-group">
      <label>{label}</label>
      <div className="input-eye">
        <input className="input" type={show_ ? 'text' : 'password'} value={f[key_]}
          onChange={set(key_)} placeholder="••••••" />
        <button type="button" className="eye-btn" onClick={toggle_}>{show_ ? '🙈' : '👁'}</button>
      </div>
    </div>
  )

  return (
    <div className="settings-section">
      <h3 className="settings-section-title">Қауіпсіздік</h3>

      <div className="settings-group">
        <h4 className="settings-group-title">Құпия сөзді өзгерту</h4>
        <PwdField label="Ағымдағы құпия сөз" key_="currentPassword"
          show_={showPwd.cur} toggle_={() => setShowPwd(p => ({ ...p, cur:!p.cur }))} />
        <PwdField label="Жаңа құпия сөз" key_="newPassword"
          show_={showPwd.new} toggle_={() => setShowPwd(p => ({ ...p, new:!p.new }))} />
        <PwdField label="Жаңа құпия сөзді растау" key_="confirmPassword"
          show_={showPwd.con} toggle_={() => setShowPwd(p => ({ ...p, con:!p.con }))} />

        <button className="btn btn-primary" onClick={submit} disabled={loading || !f.currentPassword || !f.newPassword}>
          {loading ? <><span className="spinner" /> Өзгертілуде...</> : '🔐 Сақтау'}
        </button>
      </div>

      <div className="divider" />

      <div className="settings-group">
        <h4 className="settings-group-title">Сеанс ақпараты</h4>
        <div className="info-row"><span>🖥</span><span>Ағымдағы сеанс белсенді</span></div>
        <div className="info-row"><span>🔑</span><span>JWT токені — 7 күн жарамды</span></div>
      </div>
    </div>
  )
}

// ── NOTIFICATIONS ──
function NotificationsSection() {
  const { user, updateUser } = useAuth()
  const toast = useToast()
  const [enabled, setEnabled] = useState(user?.notificationsEnabled ?? true)
  const [sound, setSound] = useState(() => localStorage.getItem('notif_sound') !== 'false')
  const [preview, setPreview] = useState(() => localStorage.getItem('notif_preview') !== 'false')

  const saveNotif = async (val) => {
    setEnabled(val)
    try {
      const res = await userAPI.updateProfile({ notificationsEnabled: val })
      updateUser(res.data)
      toast.success(val ? 'Хабарландырулар қосылды' : 'Хабарландырулар өшірілді')
    } catch { toast.error('Сақтау мүмкін болмады') }
  }

  return (
    <div className="settings-section">
      <h3 className="settings-section-title">Хабарландырулар</h3>

      <div className="settings-group">
        {[
          { label:'Хабарландырулар', sub:'Жаңа хабарламалар үшін хабарландыру', val:enabled, set:saveNotif },
          { label:'Дыбыс', sub:'Хабарлама дыбыстық сигналы', val:sound, set:v => { setSound(v); localStorage.setItem('notif_sound', v) } },
          { label:'Алдын-ала қарау', sub:'Хабарлама мазмұнын хабарландыруда көрсету', val:preview, set:v => { setPreview(v); localStorage.setItem('notif_preview', v) } },
        ].map(item => (
          <div key={item.label} className="notif-row">
            <div>
              <div className="notif-label">{item.label}</div>
              <div className="notif-sub">{item.sub}</div>
            </div>
            <label className="switch">
              <input type="checkbox" checked={item.val} onChange={e => item.set(e.target.checked)} />
              <span className="switch-slider" />
            </label>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── ABOUT ──
function AboutSection() {
  return (
    <div className="settings-section">
      <h3 className="settings-section-title">SecureChat туралы</h3>
      <div className="about-card">
        <div style={{ fontSize:72, marginBottom:16 }}>💬</div>
        <h2>SecureChat</h2>
        <p>Нұсқа: 2.0.0</p>
        <p className="about-desc">Қауіпсіз және жылдам хабар алмасу мессенджері. Spring Boot + React + PostgreSQL технологияларында жасалған.</p>
      </div>
      <div className="about-stack">
        {['☕ Java 21 + Spring Boot 3','⚛️ React 18 + Vite','🐘 PostgreSQL 15','🔌 WebSocket (STOMP)','🐳 Docker + Docker Compose'].map(t => (
          <div key={t} className="stack-item">{t}</div>
        ))}
      </div>
    </div>
  )
}
