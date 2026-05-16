import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { userAPI } from '../../services/api'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext'
import { useToast } from '../common/Toast'
import { notificationService } from '../../services/notificationService'
import Avatar from '../common/Avatar'
import './SettingsPage.css'

const SECTIONS = [
  { id: 'profile',      icon: '👤', label: 'Профиль' },
  { id: 'appearance',   icon: '🎨', label: 'Сыртқы көрініс' },
  { id: 'datetime',     icon: '🕐', label: 'Күн мен уақыт' },
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
        <div style={{ flex: 1 }} />
        <button className="settings-nav-item danger" onClick={logout}>
          <span className="settings-nav-icon">🚪</span>
          <span>Шығу</span>
        </button>
      </div>

      {/* CONTENT */}
      <div className="settings-content">
        {active === 'profile'       && <ProfileSection />}
        {active === 'appearance'    && <AppearanceSection />}
        {active === 'datetime'      && <DateTimeSection />}
        {active === 'security'      && <SecuritySection />}
        {active === 'notifications' && <NotificationsSection />}
        {active === 'about'         && <AboutSection />}
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════
// PROFILE
// ══════════════════════════════════════════════
function ProfileSection() {
  const { user, updateUser } = useAuth()
  const toast    = useToast()
  const fileRef  = useRef(null)

  const [f, setF] = useState({
    name:     user?.name     || '',
    username: user?.username || '',
    bio:      user?.bio      || '',
    email:    user?.email    || '',
    phone:    user?.phone    || '',
  })
  const [loading, setLoading]           = useState(false)
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
    const form = new FormData()
    form.append('file', file)
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
    setAvatarLoading(true)
    try {
      const res = await userAPI.deleteAvatar()
      updateUser(res.data)
      toast.success('Аватар жойылды')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Жою мүмкін болмады')
    } finally { setAvatarLoading(false) }
  }

  return (
    <div className="settings-section">
      <h3 className="settings-section-title">Профиль ақпараты</h3>

      {/* AVATAR */}
      <div className="avatar-section">
        <div className="avatar-preview">
          <Avatar user={user} size={90} />
          {avatarLoading && (
            <div className="avatar-overlay">
              <span className="spinner" />
            </div>
          )}
        </div>
        <div className="avatar-actions">
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            hidden
            onChange={handleAvatarChange}
          />
          <button
            className="btn btn-secondary"
            onClick={() => fileRef.current?.click()}
            disabled={avatarLoading}
          >
            📷 Сурет жүктеу
          </button>
          {user?.avatarUrl && (
            <button
              className="btn btn-ghost"
              onClick={removeAvatar}
              disabled={avatarLoading}
            >
              🗑 Жою
            </button>
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
        <textarea
          className="textarea"
          value={f.bio}
          onChange={set('bio')}
          placeholder="Өзіңіз туралы бірнеше сөз..."
          rows={3}
          maxLength={255}
        />
        <small style={{ color: 'var(--text-muted)' }}>{f.bio.length}/255</small>
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

// ══════════════════════════════════════════════
// APPEARANCE
// ══════════════════════════════════════════════
function AppearanceSection() {
  const { theme, setTheme } = useTheme()
  const [fontSize, setFontSize] = useState(() => localStorage.getItem('fontSize') || 'medium')

  const themes = [
    { id: 'dark',  label: 'Қараңғы', preview: '#0e1117' },
    { id: 'light', label: 'Жарық',   preview: '#f0f2f5' },
  ]
  const fonts = [
    { id: 'small',  label: 'Кіші',   size: '13px' },
    { id: 'medium', label: 'Орташа', size: '14px' },
    { id: 'large',  label: 'Үлкен',  size: '16px' },
  ]

  const applyFont = (id, size) => {
    setFontSize(id)
    document.body.style.fontSize = size
    localStorage.setItem('fontSize', id)
    localStorage.setItem('fontSizeValue', size)
  }

  return (
    <div className="settings-section">
      <h3 className="settings-section-title">Сыртқы көрініс</h3>

      <div className="settings-group">
        <h4 className="settings-group-title">Тема</h4>
        <div className="theme-grid">
          {themes.map(t => (
            <button
              key={t.id}
              className={`theme-card ${theme === t.id ? 'active' : ''}`}
              onClick={() => setTheme(t.id)}
            >
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
            <button
              key={f.id}
              className={`font-card ${fontSize === f.id ? 'active' : ''}`}
              onClick={() => applyFont(f.id, f.size)}
            >
              <span style={{ fontSize: f.size }}>Aa</span>
              <span>{f.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════
// DATE & TIME  ← ЖАҢ БӨЛІМ
// ══════════════════════════════════════════════
function DateTimeSection() {
  const toast = useToast()

  const [dateFormat,  setDateFormat]  = useState(() => localStorage.getItem('dateFormat')  || 'dd.MM.yyyy')
  const [timeFormat,  setTimeFormat]  = useState(() => localStorage.getItem('timeFormat')  || '24h')
  const [timezone,    setTimezone]    = useState(() => localStorage.getItem('timezone')    || Intl.DateTimeFormat().resolvedOptions().timeZone)
  const [firstDay,    setFirstDay]    = useState(() => localStorage.getItem('firstDay')    || 'monday')

  const dateFormats = [
    { id: 'dd.MM.yyyy', label: 'КК.АА.ЖЖЖЖ',  example: '15.05.2026' },
    { id: 'MM/dd/yyyy', label: 'АА/КК/ЖЖЖЖ',  example: '05/15/2026' },
    { id: 'yyyy-MM-dd', label: 'ЖЖЖЖ-АА-КК',  example: '2026-05-15' },
    { id: 'dd MMM yyyy',label: 'КК АА ЖЖЖЖ',  example: '15 мам 2026' },
  ]

  const timeFormats = [
    { id: '24h', label: '24 сағаттық', example: '14:30' },
    { id: '12h', label: '12 сағаттық', example: '2:30 PM' },
  ]

  const commonTimezones = [
    { value: 'Asia/Almaty',      label: 'Алматы (UTC+5)'        },
    { value: 'Asia/Astana',      label: 'Астана (UTC+5)'        },
    { value: 'Europe/Moscow',    label: 'Мәскеу (UTC+3)'       },
    { value: 'Europe/London',    label: 'Лондон (UTC+0/+1)'    },
    { value: 'America/New_York', label: 'Нью-Йорк (UTC-5/-4)'  },
    { value: 'Asia/Dubai',       label: 'Дубай (UTC+4)'         },
    { value: 'Asia/Tokyo',       label: 'Токио (UTC+9)'         },
    { value: 'Europe/Paris',     label: 'Париж (UTC+1/+2)'      },
    { value: 'Asia/Tashkent',    label: 'Ташкент (UTC+5)'       },
    { value: 'Asia/Bishkek',     label: 'Бішкек (UTC+6)'        },
  ]

  const firstDays = [
    { id: 'monday', label: 'Дүйсенбі' },
    { id: 'sunday', label: 'Жексенбі' },
  ]

  const save = () => {
    localStorage.setItem('dateFormat', dateFormat)
    localStorage.setItem('timeFormat', timeFormat)
    localStorage.setItem('timezone',   timezone)
    localStorage.setItem('firstDay',   firstDay)
    toast.success('Уақыт баптаулары сақталды ✓')
  }

  // Ағымдағы уақытты таңдалған форматта көрсету
  const previewTime = () => {
    try {
      const now = new Date()
      return now.toLocaleString('ru-RU', {
        timeZone: timezone,
        hour:     '2-digit',
        minute:   '2-digit',
        hour12:   timeFormat === '12h',
      })
    } catch { return '--:--' }
  }

  const previewDate = () => {
    try {
      const now = new Date()
      if (dateFormat === 'dd.MM.yyyy') {
        return now.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: timezone })
      }
      if (dateFormat === 'MM/dd/yyyy') {
        return now.toLocaleDateString('en-US', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: timezone })
      }
      if (dateFormat === 'yyyy-MM-dd') {
        return now.toISOString().split('T')[0]
      }
      if (dateFormat === 'dd MMM yyyy') {
        return now.toLocaleDateString('kk-KZ', { day: 'numeric', month: 'short', year: 'numeric', timeZone: timezone })
      }
      return now.toLocaleDateString()
    } catch { return '---' }
  }

  return (
    <div className="settings-section">
      <h3 className="settings-section-title">Күн мен уақыт</h3>

      {/* PREVIEW */}
      <div className="datetime-preview">
        <div className="datetime-preview-clock">{previewTime()}</div>
        <div className="datetime-preview-date">{previewDate()}</div>
        <div className="datetime-preview-tz">{timezone}</div>
      </div>

      <div className="divider" />

      {/* DATE FORMAT */}
      <div className="settings-group">
        <h4 className="settings-group-title">Күн форматы</h4>
        <div className="option-list">
          {dateFormats.map(df => (
            <label key={df.id} className={`option-item ${dateFormat === df.id ? 'active' : ''}`}>
              <input
                type="radio"
                name="dateFormat"
                value={df.id}
                checked={dateFormat === df.id}
                onChange={() => setDateFormat(df.id)}
              />
              <div className="option-info">
                <span className="option-label">{df.label}</span>
                <span className="option-example">{df.example}</span>
              </div>
            </label>
          ))}
        </div>
      </div>

      <div className="divider" />

      {/* TIME FORMAT */}
      <div className="settings-group">
        <h4 className="settings-group-title">Уақыт форматы</h4>
        <div className="option-list">
          {timeFormats.map(tf => (
            <label key={tf.id} className={`option-item ${timeFormat === tf.id ? 'active' : ''}`}>
              <input
                type="radio"
                name="timeFormat"
                value={tf.id}
                checked={timeFormat === tf.id}
                onChange={() => setTimeFormat(tf.id)}
              />
              <div className="option-info">
                <span className="option-label">{tf.label}</span>
                <span className="option-example">{tf.example}</span>
              </div>
            </label>
          ))}
        </div>
      </div>

      <div className="divider" />

      {/* TIMEZONE */}
      <div className="settings-group">
        <h4 className="settings-group-title">Уақыт белдеуі</h4>
        <select
          className="input tz-select"
          value={timezone}
          onChange={e => setTimezone(e.target.value)}
        >
          {commonTimezones.map(tz => (
            <option key={tz.value} value={tz.value}>{tz.label}</option>
          ))}
          <option value={Intl.DateTimeFormat().resolvedOptions().timeZone}>
            Автоматты ({Intl.DateTimeFormat().resolvedOptions().timeZone})
          </option>
        </select>
      </div>

      <div className="divider" />

      {/* FIRST DAY OF WEEK */}
      <div className="settings-group">
        <h4 className="settings-group-title">Аптаның бірінші күні</h4>
        <div className="option-list horizontal">
          {firstDays.map(fd => (
            <label key={fd.id} className={`option-item ${firstDay === fd.id ? 'active' : ''}`}>
              <input
                type="radio"
                name="firstDay"
                value={fd.id}
                checked={firstDay === fd.id}
                onChange={() => setFirstDay(fd.id)}
              />
              <span className="option-label">{fd.label}</span>
            </label>
          ))}
        </div>
      </div>

      <button className="btn btn-primary" onClick={save}>
        💾 Сақтау
      </button>
    </div>
  )
}

// ══════════════════════════════════════════════
// SECURITY
// ══════════════════════════════════════════════
function SecuritySection() {
  const toast = useToast()
  const [f, setF] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' })
  const [loading, setLoading] = useState(false)
  const [showPwd, setShowPwd] = useState({ cur: false, new: false, con: false })

  const set = k => e => setF(p => ({ ...p, [k]: e.target.value }))

  const submit = async () => {
    if (f.newPassword !== f.confirmPassword) { toast.error('Жаңа құпия сөздер сәйкес келмейді'); return }
    if (f.newPassword.length < 6) { toast.error('Кемінде 6 символ'); return }
    setLoading(true)
    try {
      await userAPI.changePassword({ currentPassword: f.currentPassword, newPassword: f.newPassword })
      setF({ currentPassword: '', newPassword: '', confirmPassword: '' })
      toast.success('Құпия сөз сәтті өзгертілді ✓')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Өзгерту мүмкін болмады')
    } finally { setLoading(false) }
  }

  const PwdField = ({ label, fieldKey, showKey }) => (
    <div className="form-group">
      <label>{label}</label>
      <div className="input-eye">
        <input
          className="input"
          type={showPwd[showKey] ? 'text' : 'password'}
          value={f[fieldKey]}
          onChange={set(fieldKey)}
          placeholder="••••••"
        />
        <button
          type="button"
          className="eye-btn"
          onClick={() => setShowPwd(p => ({ ...p, [showKey]: !p[showKey] }))}
        >
          {showPwd[showKey] ? '🙈' : '👁'}
        </button>
      </div>
    </div>
  )

  return (
    <div className="settings-section">
      <h3 className="settings-section-title">Қауіпсіздік</h3>

      <div className="settings-group">
        <h4 className="settings-group-title">Құпия сөзді өзгерту</h4>
        <PwdField label="Ағымдағы құпия сөз" fieldKey="currentPassword" showKey="cur" />
        <PwdField label="Жаңа құпия сөз"     fieldKey="newPassword"     showKey="new" />
        <PwdField label="Жаңа құпия сөзді растау" fieldKey="confirmPassword" showKey="con" />

        <button
          className="btn btn-primary"
          onClick={submit}
          disabled={loading || !f.currentPassword || !f.newPassword}
        >
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

// ══════════════════════════════════════════════
// NOTIFICATIONS
// ══════════════════════════════════════════════
function NotificationsSection() {
  const { user, updateUser } = useAuth()
  const toast = useToast()

  const [notifEnabled, setNotifEnabled] = useState(() => localStorage.getItem('notif_enabled') !== 'false')
  const [sound,        setSound]        = useState(() => localStorage.getItem('notif_sound')   !== 'false')
  const [preview,      setPreview]      = useState(() => localStorage.getItem('notif_preview') !== 'false')
  const [permission,   setPermission]   = useState(() => 'Notification' in window ? Notification.permission : 'denied')

  const requestPermission = async () => {
    const granted = await notificationService.requestPermission()
    setPermission(granted ? 'granted' : 'denied')
    if (granted) {
      toast.success('Хабарландырулар қосылды ✓')
    } else {
      toast.error('Браузер рұқсатты бермеді')
    }
  }

  const testSound = () => {
    notificationService.playMessageSound()
    toast.info('Дыбыс тексерілді 🔊')
  }

  const testNotif = () => {
    notificationService.showBrowserNotification(
      'SecureChat',
      'Бұл тест хабарландыруы!',
      null
    )
  }

  const toggleNotif = (val) => {
    setNotifEnabled(val)
    localStorage.setItem('notif_enabled', val)
  }

  const toggleSound = (val) => {
    setSound(val)
    localStorage.setItem('notif_sound', val)
  }

  const togglePreview = (val) => {
    setPreview(val)
    localStorage.setItem('notif_preview', val)
  }

  return (
    <div className="settings-section">
      <h3 className="settings-section-title">Хабарландырулар</h3>

      {/* BROWSER PERMISSION */}
      {permission !== 'granted' && (
        <div className="notif-permission-banner">
          <span>🔔</span>
          <div>
            <div className="notif-perm-title">Браузер рұқсаты жоқ</div>
            <div className="notif-perm-sub">Push-хабарландыруларды алу үшін рұқсат беріңіз</div>
          </div>
          <button className="btn btn-primary btn-sm" onClick={requestPermission}>
            Рұқсат беру
          </button>
        </div>
      )}

      {permission === 'granted' && (
        <div className="notif-permission-banner granted">
          <span>✅</span>
          <div>
            <div className="notif-perm-title">Браузер рұқсаты берілген</div>
            <div className="notif-perm-sub">Push-хабарландырулар жұмыс жасайды</div>
          </div>
        </div>
      )}

      <div className="divider" />

      {/* TOGGLES */}
      <div className="settings-group">
        {[
          {
            label: 'Хабарландырулар',
            sub: 'Жаңа хабарламалар үшін хабарландыру',
            val: notifEnabled,
            set: toggleNotif
          },
          {
            label: 'Дыбыс',
            sub: 'Хабарлама келгенде дыбыс ойнату',
            val: sound,
            set: toggleSound
          },
          {
            label: 'Хабарлама алдын ала қарауы',
            sub: 'Push-хабарландыруда мазмұнды көрсету',
            val: preview,
            set: togglePreview
          },
        ].map(item => (
          <div key={item.label} className="notif-row">
            <div>
              <div className="notif-label">{item.label}</div>
              <div className="notif-sub">{item.sub}</div>
            </div>
            <label className="switch">
              <input
                type="checkbox"
                checked={item.val}
                onChange={e => item.set(e.target.checked)}
              />
              <span className="switch-slider" />
            </label>
          </div>
        ))}
      </div>

      <div className="divider" />

      {/* TEST BUTTONS */}
      <div className="settings-group">
        <h4 className="settings-group-title">Тексеру</h4>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-secondary" onClick={testSound}>
            🔊 Дыбысты тексеру
          </button>
          <button
            className="btn btn-secondary"
            onClick={testNotif}
            disabled={permission !== 'granted'}
          >
            🔔 Хабарландыруды тексеру
          </button>
        </div>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════
// ABOUT
// ══════════════════════════════════════════════
function AboutSection() {
  return (
    <div className="settings-section">
      <h3 className="settings-section-title">SecureChat туралы</h3>
      <div className="about-card">
        <div style={{ fontSize: 72, marginBottom: 16 }}>💬</div>
        <h2>SecureChat</h2>
        <p>Нұсқа: 2.0.0</p>
        <p className="about-desc">
          Қауіпсіз және жылдам хабар алмасу мессенджері.
          Spring Boot + React + PostgreSQL технологияларында жасалған.
        </p>
      </div>
      <div className="about-stack">
        {[
          '☕ Java 21 + Spring Boot 3',
          '⚛️ React 18 + Vite',
          '🐘 PostgreSQL 15',
          '🔌 WebSocket (STOMP)',
          '🐳 Docker + Docker Compose',
        ].map(t => (
          <div key={t} className="stack-item">{t}</div>
        ))}
      </div>
    </div>
  )
}