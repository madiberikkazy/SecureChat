import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { authAPI } from '../../services/api'
import { useAuth } from '../../context/AuthContext'
import './Auth.css'

// ========================
//        LOGIN
// ========================
export function LoginForm() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [f, setF] = useState({ login: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPwd, setShowPwd] = useState(false)

  const set = k => e => { setF(p => ({ ...p, [k]: e.target.value })); setError('') }

  const submit = async e => {
    e.preventDefault()
    if (!f.login || !f.password) { setError('Барлық өрістерді толтырыңыз'); return }
    setLoading(true)
    try {
      const res = await authAPI.login(f)
      login(res.data.token, res.data.user)
      navigate('/')
    } catch (err) {
      setError(err.response?.data?.error || 'Кіру мүмкін болмады')
    } finally { setLoading(false) }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <div className="auth-logo-icon">💬</div>
          <h1>SecureChat</h1>
          <p>Қауіпсіз хабар алмасу</p>
        </div>

        <form onSubmit={submit}>
          <h2 className="auth-title">Кіру</h2>

          <div className="form-group">
            <label>Никнейм, Email немесе Телефон</label>
            <input className="input" type="text" placeholder="@username / email / +77001234567"
              value={f.login} onChange={set('login')} autoComplete="username" />
          </div>

          <div className="form-group">
            <label>Құпия сөз</label>
            <div className="input-eye">
              <input className="input" type={showPwd ? 'text' : 'password'} placeholder="••••••"
                value={f.password} onChange={set('password')} autoComplete="current-password" />
              <button type="button" className="eye-btn" onClick={() => setShowPwd(p => !p)}>
                {showPwd ? '🙈' : '👁'}
              </button>
            </div>
          </div>

          {error && <div className="auth-error">{error}</div>}

          <button className="btn btn-primary btn-full btn-lg" type="submit" disabled={loading}>
            {loading ? <><span className="spinner" /> Кіруде...</> : 'Кіру →'}
          </button>
        </form>

        <div className="auth-footer">
          Аккаунт жоқ па? <Link to="/register">Тіркелу</Link>
        </div>
      </div>
    </div>
  )
}

// ========================
//       REGISTER
// ========================
export function RegisterForm() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [f, setF] = useState({ username:'', name:'', email:'', phone:'', password:'', confirm:'', bio:'' })
  const [contactType, setContactType] = useState('email')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPwd, setShowPwd] = useState(false)
  const [step, setStep] = useState(1) // 1 = basic info, 2 = contact + password

  const set = k => e => { setF(p => ({ ...p, [k]: e.target.value })); setError('') }

  const nextStep = async e => {
    e.preventDefault()
    const username = f.username.trim().toLowerCase()

    // Жергілікті тексеру
    if (!username) { setError('Никнейм енгізіңіз'); return }
    if (username.length < 3) { setError('Никнейм кемінде 3 символ болуы керек'); return }
    if (username.length > 30) { setError('Никнейм 30 символдан аспауы керек'); return }
    if (!/^[a-z0-9_.−]+$/.test(username)) {
      setError('Никнейм тек латын әріптерін (a-z), сандарды, _ және . қамтуы мүмкін')
      return
    }
    if (!f.name.trim()) { setError('Атыңызды енгізіңіз'); return }

    // Серверден никнейм бос па екенін тексеру
    setLoading(true)
    try {
      const res = await authAPI.checkUsername(username)
      const { available, taken } = res.data
      if (taken) {
        setError(`@${username} никнеймі бұрыннан алынған. Басқа никнейм таңдаңыз.`)
        return
      }
      if (!available) {
        setError('Никнейм форматы дұрыс емес')
        return
      }
      setError('')
      setStep(2)
    } catch {
      setError('Тексеру мүмкін болмады. Қайталап көріңіз.')
    } finally {
      setLoading(false)
    }
  }

  const submit = async e => {
    e.preventDefault()
    if (contactType === 'email' && !f.email) { setError('Email енгізіңіз'); return }
    if (contactType === 'phone' && !f.phone) { setError('Телефон нөмірін енгізіңіз'); return }
    if (!f.password) { setError('Құпия сөз енгізіңіз'); return }
    if (f.password.length < 6) { setError('Кемінде 6 символ'); return }
    if (f.password !== f.confirm) { setError('Құпия сөздер сәйкес келмейді'); return }

    setLoading(true)
    try {
      const res = await authAPI.register({
        username: f.username.toLowerCase().trim(),
        name: f.name.trim(),
        email: contactType === 'email' ? f.email.trim() : null,
        phone: contactType === 'phone' ? f.phone.trim() : null,
        password: f.password,
        bio: f.bio.trim() || null,
      })
      login(res.data.token, res.data.user)
      navigate('/')
    } catch (err) {
      setError(err.response?.data?.error || 'Тіркелу мүмкін болмады')
    } finally { setLoading(false) }
  }

  return (
    <div className="auth-page">
      <div className="auth-card auth-card-wide">
        <div className="auth-logo">
          <div className="auth-logo-icon">💬</div>
          <h1>SecureChat</h1>
          <p>Жаңа аккаунт жасау</p>
        </div>

        {/* Қадам индикаторы */}
        <div className="auth-steps">
          <div className={`auth-step ${step >= 1 ? 'active' : ''}`}><span>1</span> Профиль</div>
          <div className="auth-step-line" />
          <div className={`auth-step ${step >= 2 ? 'active' : ''}`}><span>2</span> Байланыс</div>
        </div>

        {step === 1 && (
          <form onSubmit={nextStep}>
            <h2 className="auth-title">Профиль ақпараты</h2>

            <div className="form-group">
              <label>Никнейм <span className="required">*</span></label>
              <div className="input-prefix-wrap">
                <span className="input-prefix-icon">@</span>
                <input className="input" type="text" placeholder="username"
                  value={f.username} onChange={set('username')} />
              </div>
            </div>

            <div className="form-group">
              <label>Аты-жөні <span className="required">*</span></label>
              <input className="input" type="text" placeholder="Алибек Сейтов"
                value={f.name} onChange={set('name')} />
            </div>

            <div className="form-group">
              <label>Сипаттама (міндетті емес)</label>
              <input className="input" type="text" placeholder="Өзіңіз туралы бірнеше сөз..."
                value={f.bio} onChange={set('bio')} maxLength={255} />
            </div>

            {error && <div className="auth-error">{error}</div>}

            <button className="btn btn-primary btn-full btn-lg" type="submit" disabled={loading}>
              {loading ? <><span className="spinner" /> Тексерілуде...</> : 'Келесі →'}
            </button>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={submit}>
            <h2 className="auth-title">Байланыс және қауіпсіздік</h2>

            <div className="form-group">
              <label>Байланыс түрі <span className="required">*</span></label>
              <div className="toggle-tabs">
                <button type="button" className={`toggle-tab ${contactType==='email'?'active':''}`}
                  onClick={() => setContactType('email')}>📧 Email</button>
                <button type="button" className={`toggle-tab ${contactType==='phone'?'active':''}`}
                  onClick={() => setContactType('phone')}>📱 Телефон</button>
              </div>
              {contactType === 'email'
                ? <input className="input" type="email" placeholder="example@mail.com"
                    value={f.email} onChange={set('email')} />
                : <input className="input" type="tel" placeholder="+77001234567"
                    value={f.phone} onChange={set('phone')} />
              }
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Құпия сөз <span className="required">*</span></label>
                <div className="input-eye">
                  <input className="input" type={showPwd ? 'text' : 'password'} placeholder="Кемінде 6 символ"
                    value={f.password} onChange={set('password')} />
                  <button type="button" className="eye-btn" onClick={() => setShowPwd(p => !p)}>
                    {showPwd ? '🙈' : '👁'}
                  </button>
                </div>
              </div>
              <div className="form-group">
                <label>Қайталау <span className="required">*</span></label>
                <input className="input" type="password" placeholder="••••••"
                  value={f.confirm} onChange={set('confirm')} />
              </div>
            </div>

            {error && <div className="auth-error">{error}</div>}

            <div style={{ display:'flex', gap:10 }}>
              <button type="button" className="btn btn-secondary" onClick={() => { setStep(1); setError('') }}>
                ← Артқа
              </button>
              <button className="btn btn-primary btn-full btn-lg" type="submit" disabled={loading}>
                {loading ? <><span className="spinner" /> Тіркелуде...</> : 'Тіркелу ✓'}
              </button>
            </div>
          </form>
        )}

        <div className="auth-footer">
          Аккаунт бар ма? <Link to="/login">Кіру</Link>
        </div>
      </div>
    </div>
  )
}
