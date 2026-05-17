import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { userAPI } from '../../services/api'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext'
import { useLang } from '../../context/LanguageContext'
import { useToast } from '../common/Toast'
import { notificationService } from '../../services/notificationService'
import Avatar from '../common/Avatar'
import { LANGUAGES } from '../../i18n/index'
import './SettingsPage.css'

export default function SettingsPage() {
  const navigate = useNavigate()
  const { logout } = useAuth()
  const { t } = useLang()

  const SECTIONS = [
    { id: 'profile',       icon: '👤', labelKey: 'profile' },
    { id: 'appearance',    icon: '🎨', labelKey: 'appearance' },
    { id: 'datetime',      icon: '🕐', labelKey: 'datetime' },
    { id: 'security',      icon: '🔐', labelKey: 'security' },
    { id: 'notifications', icon: '🔔', labelKey: 'notifications' },
    { id: 'language',      icon: '🌐', labelKey: 'language' },
    { id: 'about',         icon: 'ℹ️',  labelKey: 'about' },
  ]

  const [active, setActive] = useState('profile')

  return (
    <div className="settings-page">
      {/* SIDEBAR */}
      <div className="settings-nav">
        <div className="settings-nav-header">
          <button className="btn-icon" onClick={() => navigate(-1)} title={t('back')}>←</button>
          <h2>{t('settingsTitle')}</h2>
        </div>
        {SECTIONS.map(s => (
          <button
            key={s.id}
            className={`settings-nav-item ${active === s.id ? 'active' : ''}`}
            onClick={() => setActive(s.id)}
          >
            <span className="settings-nav-icon">{s.icon}</span>
            <span>{t(s.labelKey)}</span>
          </button>
        ))}
        <div style={{ flex: 1 }} />
        <button className="settings-nav-item danger" onClick={logout}>
          <span className="settings-nav-icon">🚪</span>
          <span>{t('logout')}</span>
        </button>
      </div>

      {/* CONTENT */}
      <div className="settings-content">
        {active === 'profile'       && <ProfileSection />}
        {active === 'appearance'    && <AppearanceSection />}
        {active === 'datetime'      && <DateTimeSection />}
        {active === 'security'      && <SecuritySection />}
        {active === 'notifications' && <NotificationsSection />}
        {active === 'language'      && <LanguageSection />}
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
  const { t } = useLang()
  const toast   = useToast()
  const fileRef = useRef(null)

  const [f, setF] = useState({
    name:     user?.name     || '',
    username: user?.username || '',
    bio:      user?.bio      || '',
    email:    user?.email    || '',
    phone:    user?.phone    || '',
  })
  const [loading,       setLoading]       = useState(false)
  const [avatarLoading, setAvatarLoading] = useState(false)

  const set = k => e => setF(p => ({ ...p, [k]: e.target.value }))

  const save = async () => {
    // Никнейм валидациясы
    const username = f.username?.trim().toLowerCase()
    if (username) {
      if (username.length < 3) { toast.error('Никнейм кемінде 3 символ болуы керек'); return }
      if (username.length > 30) { toast.error('Никнейм 30 символдан аспауы керек'); return }
      if (!/^[a-z0-9_.−]+$/.test(username)) {
        toast.error('Никнейм тек латын әріптерін (a-z), сандарды, _ және . қамтуы мүмкін')
        return
      }
    }
    setLoading(true)
    try {
      const res = await userAPI.updateProfile({ ...f, username })
      updateUser(res.data)
      toast.success(t('profileSaved'))
    } catch (err) {
      toast.error(err.response?.data?.error || t('error'))
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
      toast.success(t('avatarUpdated'))
    } catch (err) {
      toast.error(err.response?.data?.error || t('error'))
    } finally { setAvatarLoading(false) }
  }

  const removeAvatar = async () => {
    setAvatarLoading(true)
    try {
      const res = await userAPI.deleteAvatar()
      updateUser(res.data)
      toast.success(t('avatarDeleted'))
    } catch (err) {
      toast.error(err.response?.data?.error || t('error'))
    } finally { setAvatarLoading(false) }
  }

  return (
    <div className="settings-section">
      <h3 className="settings-section-title">{t('profileInfo2')}</h3>

      <div className="avatar-section">
        <div className="avatar-preview">
          <Avatar user={user} size={90} />
          {avatarLoading && <div className="avatar-overlay"><span className="spinner" /></div>}
        </div>
        <div className="avatar-actions">
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={handleAvatarChange} />
          <button className="btn btn-secondary" onClick={() => fileRef.current?.click()} disabled={avatarLoading}>
            {t('uploadPhoto')}
          </button>
          {user?.avatarUrl && (
            <button className="btn btn-ghost" onClick={removeAvatar} disabled={avatarLoading}>
              {t('deletePhoto')}
            </button>
          )}
          <p className="avatar-hint">{t('photoHint')}</p>
        </div>
      </div>

      <div className="divider" />

      <div className="form-row">
        <div className="form-group">
          <label>{t('fullName')}</label>
          <input className="input" value={f.name} onChange={set('name')} placeholder={t('fullName')} />
        </div>
        <div className="form-group">
          <label>{t('username')}</label>
          <div className="input-prefix-wrap">
            <span className="input-prefix-icon">@</span>
            <input className="input" value={f.username} onChange={set('username')} placeholder="username" />
          </div>
        </div>
      </div>

      <div className="form-group">
        <label>{t('bio')}</label>
        <textarea
          className="textarea"
          value={f.bio}
          onChange={set('bio')}
          placeholder={t('aboutMe')}
          rows={3}
          maxLength={255}
        />
        <small style={{ color: 'var(--text-muted)' }}>{f.bio.length}/255</small>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>{t('email')}</label>
          <input className="input" type="email" value={f.email} onChange={set('email')} placeholder="email@example.com" />
        </div>
        <div className="form-group">
          <label>{t('phone')}</label>
          <input className="input" type="tel" value={f.phone} onChange={set('phone')} placeholder="+77001234567" />
        </div>
      </div>

      <button className="btn btn-primary" onClick={save} disabled={loading}>
        {loading ? <><span className="spinner" /> {t('saving')}</> : `💾 ${t('save')}`}
      </button>
    </div>
  )
}

// ══════════════════════════════════════════════
// APPEARANCE
// ══════════════════════════════════════════════
function AppearanceSection() {
  const { theme, setTheme } = useTheme()
  const { t } = useLang()
  const [fontSize, setFontSize] = useState(() => localStorage.getItem('fontSize') || 'medium')

  const themes = [
    { id: 'dark',  labelKey: 'dark',  preview: '#0e1117' },
    { id: 'light', labelKey: 'light', preview: '#f0f2f5' },
  ]
  const fonts = [
    { id: 'small',  labelKey: 'small',  size: '13px' },
    { id: 'medium', labelKey: 'medium', size: '14px' },
    { id: 'large',  labelKey: 'large',  size: '16px' },
  ]

  const applyFont = (id, size) => {
    setFontSize(id)
    document.body.style.fontSize = size
    localStorage.setItem('fontSize', id)
    localStorage.setItem('fontSizeValue', size)
  }

  return (
    <div className="settings-section">
      <h3 className="settings-section-title">{t('appearance')}</h3>

      <div className="settings-group">
        <h4 className="settings-group-title">{t('theme')}</h4>
        <div className="theme-grid">
          {themes.map(th => (
            <button key={th.id} className={`theme-card ${theme === th.id ? 'active' : ''}`}
              onClick={() => setTheme(th.id)}>
              <div className="theme-preview" style={{ background: th.preview }} />
              <span>{t(th.labelKey)}</span>
              {theme === th.id && <span className="theme-check">✓</span>}
            </button>
          ))}
        </div>
      </div>

      <div className="divider" />

      <div className="settings-group">
        <h4 className="settings-group-title">{t('fontSize')}</h4>
        <div className="font-grid">
          {fonts.map(f => (
            <button key={f.id} className={`font-card ${fontSize === f.id ? 'active' : ''}`}
              onClick={() => applyFont(f.id, f.size)}>
              <span style={{ fontSize: f.size }}>Aa</span>
              <span>{t(f.labelKey)}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════
// DATE & TIME
// ══════════════════════════════════════════════
function DateTimeSection() {
  const { t } = useLang()
  const toast = useToast()

  const [dateFormat, setDateFormat] = useState(() => localStorage.getItem('dateFormat') || 'dd.MM.yyyy')
  const [timeFormat, setTimeFormat] = useState(() => localStorage.getItem('timeFormat') || '24h')
  const [timezone,   setTimezone]   = useState(() => localStorage.getItem('timezone')   || Intl.DateTimeFormat().resolvedOptions().timeZone)
  const [firstDay,   setFirstDay]   = useState(() => localStorage.getItem('firstDay')   || 'monday')

  const dateFormats = [
    { id: 'dd.MM.yyyy',  label: 'КК.АА.ЖЖЖЖ',  example: '15.05.2026' },
    { id: 'MM/dd/yyyy',  label: 'АА/КК/ЖЖЖЖ',  example: '05/15/2026' },
    { id: 'yyyy-MM-dd',  label: 'ЖЖЖЖ-АА-КК',  example: '2026-05-15' },
    { id: 'dd MMM yyyy', label: 'КК АА ЖЖЖЖ',  example: '15 мам 2026' },
  ]
  const timeFormats = [
    { id: '24h', labelKey: 'h24', example: '14:30' },
    { id: '12h', labelKey: 'h12', example: '2:30 PM' },
  ]
  const commonTimezones = [
    { value: 'Asia/Almaty',      label: 'Алматы (UTC+5)' },
    { value: 'Asia/Astana',      label: 'Астана (UTC+5)' },
    { value: 'Europe/Moscow',    label: 'Мәскеу (UTC+3)' },
    { value: 'Europe/London',    label: 'Лондон (UTC+0/+1)' },
    { value: 'America/New_York', label: 'Нью-Йорк (UTC-5/-4)' },
    { value: 'Asia/Dubai',       label: 'Дубай (UTC+4)' },
    { value: 'Asia/Tokyo',       label: 'Токио (UTC+9)' },
    { value: 'Europe/Paris',     label: 'Париж (UTC+1/+2)' },
    { value: 'Asia/Tashkent',    label: 'Ташкент (UTC+5)' },
    { value: 'Asia/Bishkek',     label: 'Бішкек (UTC+6)' },
  ]

  const save = () => {
    localStorage.setItem('dateFormat', dateFormat)
    localStorage.setItem('timeFormat', timeFormat)
    localStorage.setItem('timezone',   timezone)
    localStorage.setItem('firstDay',   firstDay)
    toast.success(t('datetimeSaved'))
  }

  const previewTime = () => {
    try {
      return new Date().toLocaleString('ru-RU', {
        timeZone: timezone, hour: '2-digit', minute: '2-digit', hour12: timeFormat === '12h',
      })
    } catch { return '--:--' }
  }

  const previewDate = () => {
    try {
      const now = new Date()
      if (dateFormat === 'dd.MM.yyyy') return now.toLocaleDateString('ru-RU', { day:'2-digit', month:'2-digit', year:'numeric', timeZone: timezone })
      if (dateFormat === 'MM/dd/yyyy') return now.toLocaleDateString('en-US', { day:'2-digit', month:'2-digit', year:'numeric', timeZone: timezone })
      if (dateFormat === 'yyyy-MM-dd') return now.toISOString().split('T')[0]
      if (dateFormat === 'dd MMM yyyy') return now.toLocaleDateString('kk-KZ', { day:'numeric', month:'short', year:'numeric', timeZone: timezone })
      return now.toLocaleDateString()
    } catch { return '---' }
  }

  return (
    <div className="settings-section">
      <h3 className="settings-section-title">{t('datetime')}</h3>

      <div className="datetime-preview">
        <div className="datetime-preview-clock">{previewTime()}</div>
        <div className="datetime-preview-date">{previewDate()}</div>
        <div className="datetime-preview-tz">{timezone}</div>
      </div>

      <div className="divider" />

      <div className="settings-group">
        <h4 className="settings-group-title">{t('dateFormat')}</h4>
        <div className="option-list">
          {dateFormats.map(df => (
            <label key={df.id} className={`option-item ${dateFormat === df.id ? 'active' : ''}`}>
              <input type="radio" name="dateFormat" value={df.id}
                checked={dateFormat === df.id} onChange={() => setDateFormat(df.id)} />
              <div className="option-info">
                <span className="option-label">{df.label}</span>
                <span className="option-example">{df.example}</span>
              </div>
            </label>
          ))}
        </div>
      </div>

      <div className="divider" />

      <div className="settings-group">
        <h4 className="settings-group-title">{t('timeFormat')}</h4>
        <div className="option-list">
          {timeFormats.map(tf => (
            <label key={tf.id} className={`option-item ${timeFormat === tf.id ? 'active' : ''}`}>
              <input type="radio" name="timeFormat" value={tf.id}
                checked={timeFormat === tf.id} onChange={() => setTimeFormat(tf.id)} />
              <div className="option-info">
                <span className="option-label">{t(tf.labelKey)}</span>
                <span className="option-example">{tf.example}</span>
              </div>
            </label>
          ))}
        </div>
      </div>

      <div className="divider" />

      <div className="settings-group">
        <h4 className="settings-group-title">{t('timezone')}</h4>
        <select className="input tz-select" value={timezone} onChange={e => setTimezone(e.target.value)}>
          {commonTimezones.map(tz => (
            <option key={tz.value} value={tz.value}>{tz.label}</option>
          ))}
          <option value={Intl.DateTimeFormat().resolvedOptions().timeZone}>
            Автоматты ({Intl.DateTimeFormat().resolvedOptions().timeZone})
          </option>
        </select>
      </div>

      <div className="divider" />

      <div className="settings-group">
        <h4 className="settings-group-title">{t('firstDay')}</h4>
        <div className="option-list horizontal">
          {[{ id: 'monday', labelKey: 'monday' }, { id: 'sunday', labelKey: 'sunday' }].map(fd => (
            <label key={fd.id} className={`option-item ${firstDay === fd.id ? 'active' : ''}`}>
              <input type="radio" name="firstDay" value={fd.id}
                checked={firstDay === fd.id} onChange={() => setFirstDay(fd.id)} />
              <span className="option-label">{t(fd.labelKey)}</span>
            </label>
          ))}
        </div>
      </div>

      <button className="btn btn-primary" onClick={save}>💾 {t('save')}</button>
    </div>
  )
}

// ══════════════════════════════════════════════
// SECURITY
// ══════════════════════════════════════════════
function SecuritySection() {
  const { t } = useLang()
  const toast = useToast()
  const [f, setF] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' })
  const [loading, setLoading] = useState(false)
  const [showPwd, setShowPwd] = useState({ cur: false, new: false, con: false })

  const set = k => e => setF(p => ({ ...p, [k]: e.target.value }))

  const submit = async () => {
    if (f.newPassword !== f.confirmPassword) { toast.error(t('passwordMismatch2')); return }
    if (f.newPassword.length < 6) { toast.error(t('passwordMin2')); return }
    setLoading(true)
    try {
      await userAPI.changePassword({ currentPassword: f.currentPassword, newPassword: f.newPassword })
      setF({ currentPassword: '', newPassword: '', confirmPassword: '' })
      toast.success(t('passwordChanged'))
    } catch (err) {
      toast.error(err.response?.data?.error || t('error'))
    } finally { setLoading(false) }
  }

  const PwdField = ({ label, fieldKey, showKey }) => (
    <div className="form-group">
      <label>{label}</label>
      <div className="input-eye">
        <input className="input" type={showPwd[showKey] ? 'text' : 'password'}
          value={f[fieldKey]} onChange={set(fieldKey)} placeholder="••••••" />
        <button type="button" className="eye-btn"
          onClick={() => setShowPwd(p => ({ ...p, [showKey]: !p[showKey] }))}>
          {showPwd[showKey] ? '🙈' : '👁'}
        </button>
      </div>
    </div>
  )

  return (
    <div className="settings-section">
      <h3 className="settings-section-title">{t('security')}</h3>

      <div className="settings-group">
        <h4 className="settings-group-title">{t('changePassword')}</h4>
        <PwdField label={t('currentPassword')} fieldKey="currentPassword" showKey="cur" />
        <PwdField label={t('newPassword')}     fieldKey="newPassword"     showKey="new" />
        <PwdField label={t('confirmNewPassword')} fieldKey="confirmPassword" showKey="con" />
        <button className="btn btn-primary" onClick={submit}
          disabled={loading || !f.currentPassword || !f.newPassword}>
          {loading ? <><span className="spinner" /> {t('saving')}</> : `🔐 ${t('save')}`}
        </button>
      </div>

      <div className="divider" />

      <div className="settings-group">
        <h4 className="settings-group-title">{t('session')}</h4>
        <div className="info-row"><span>🖥</span><span>{t('sessionActive')}</span></div>
        <div className="info-row"><span>🔑</span><span>{t('jwtInfo')}</span></div>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════
// NOTIFICATIONS
// ══════════════════════════════════════════════
function NotificationsSection() {
  const { user } = useAuth()
  const { t } = useLang()
  const toast = useToast()

  const [notifEnabled, setNotifEnabled] = useState(() => localStorage.getItem('notif_enabled') !== 'false')
  const [sound,        setSound]        = useState(() => localStorage.getItem('notif_sound')   !== 'false')
  const [preview,      setPreview]      = useState(() => localStorage.getItem('notif_preview') !== 'false')
  const [permission,   setPermission]   = useState(() => 'Notification' in window ? Notification.permission : 'denied')

  const requestPermission = async () => {
    const granted = await notificationService.requestPermission()
    setPermission(granted ? 'granted' : 'denied')
    toast[granted ? 'success' : 'error'](granted ? t('permissionGrantedToast') : t('permissionDenied'))
  }

  const toggleNotif  = v => { setNotifEnabled(v); localStorage.setItem('notif_enabled', v) }
  const toggleSound  = v => { setSound(v);        localStorage.setItem('notif_sound', v) }
  const togglePreview = v => { setPreview(v);     localStorage.setItem('notif_preview', v) }

  const toggles = [
    { label: t('enableNotifications'), sub: t('enableNotificationsSub'), val: notifEnabled, set: toggleNotif },
    { label: t('enableSound'),         sub: t('enableSoundSub'),         val: sound,        set: toggleSound },
    { label: t('enablePreview'),       sub: t('enablePreviewSub'),       val: preview,      set: togglePreview },
  ]

  return (
    <div className="settings-section">
      <h3 className="settings-section-title">{t('notificationsTitle')}</h3>

      {permission !== 'granted' && (
        <div className="notif-permission-banner">
          <span>🔔</span>
          <div>
            <div className="notif-perm-title">{t('browserPermission')}</div>
            <div className="notif-perm-sub">{t('browserPermissionSub')}</div>
          </div>
          <button className="btn btn-primary btn-sm" onClick={requestPermission}>{t('grantPermission')}</button>
        </div>
      )}
      {permission === 'granted' && (
        <div className="notif-permission-banner granted">
          <span>✅</span>
          <div>
            <div className="notif-perm-title">{t('permissionGranted')}</div>
            <div className="notif-perm-sub">{t('permissionGrantedSub')}</div>
          </div>
        </div>
      )}

      <div className="divider" />

      <div className="settings-group">
        {toggles.map(item => (
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

      <div className="divider" />

      <div className="settings-group">
        <h4 className="settings-group-title">{t('testing')}</h4>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-secondary"
            onClick={() => { notificationService.playMessageSound(); toast.info(t('soundTested')) }}>
            {t('testSound')}
          </button>
          <button className="btn btn-secondary"
            onClick={() => notificationService.showBrowserNotification('SecureChat', 'Test!', null)}
            disabled={permission !== 'granted'}>
            {t('testNotification')}
          </button>
        </div>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════
// LANGUAGE  ← ЖАҢ БӨЛІМ
// ══════════════════════════════════════════════
function LanguageSection() {
  const { lang, setLang, t } = useLang()
  const toast = useToast()

  const apply = (code) => {
    setLang(code)
    toast.success(t('languageSaved'))
  }

  return (
    <div className="settings-section">
      <h3 className="settings-section-title">{t('languageTitle')}</h3>

      <div className="settings-group">
        <div className="option-list">
          {Object.entries(LANGUAGES).map(([code, info]) => (
            <label key={code} className={`option-item ${lang === code ? 'active' : ''}`}
              style={{ cursor: 'pointer' }} onClick={() => apply(code)}>
              <input type="radio" name="lang" value={code}
                checked={lang === code} onChange={() => apply(code)} />
              <div className="option-info" style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 24 }}>{info.flag}</span>
                <span className="option-label">{info.label}</span>
                {lang === code && <span style={{ marginLeft: 'auto', color: 'var(--color-accent)' }}>✓</span>}
              </div>
            </label>
          ))}
        </div>
      </div>
    </div>
  )
}

// ══════════════════════════════════════════════
// ABOUT
// ══════════════════════════════════════════════
function AboutSection() {
  const { t } = useLang()
  return (
    <div className="settings-section">
      <h3 className="settings-section-title">{t('aboutTitle')}</h3>
      <div className="about-card">
        <div style={{ fontSize: 72, marginBottom: 16 }}>💬</div>
        <h2>SecureChat</h2>
        <p>{t('version')}: 2.0.0</p>
        <p className="about-desc">{t('aboutDesc')}</p>
      </div>
      <div className="about-stack">
        {[
          '☕ Java 21 + Spring Boot 3',
          '⚛️ React 18 + Vite',
          '🐘 PostgreSQL 15',
          '🔌 WebSocket (STOMP)',
          '🐳 Docker + Docker Compose',
        ].map(item => (
          <div key={item} className="stack-item">{item}</div>
        ))}
      </div>
    </div>
  )
}
