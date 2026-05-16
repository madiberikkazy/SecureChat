import { useState, useRef, useEffect } from 'react'
import { chatAPI } from '../../services/api'
import useChatStore from '../../store/chatStore'
import { useToast } from '../common/Toast'
import { useLang } from '../../context/LanguageContext'
import './PinModal.css'

// mode: 'set' | 'verify' | 'recover'
export default function PinModal({ chatId, mode, onClose }) {
  const PIN_LEN = 6
  const [digits,   setDigits]   = useState(Array(PIN_LEN).fill(''))
  const [confirm,  setConfirm]  = useState(Array(PIN_LEN).fill(''))
  const [step,     setStep]     = useState(mode === 'set' ? 'enter' : 'verify')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')

  // Recover mode
  const [password, setPassword] = useState('')
  const [newPin,   setNewPin]   = useState('')

  const refs  = useRef([])
  const cRefs = useRef([])
  const { unlockChat, upsertChat, chats } = useChatStore()
  const toast = useToast()
  const { t } = useLang()

  useEffect(() => { setTimeout(() => refs.current[0]?.focus(), 100) }, [])

  const handleInput = (i, val, arr, setArr, nextRefs) => {
    if (!/^\d*$/.test(val)) return
    const n = [...arr]; n[i] = val.slice(-1); setArr(n); setError('')
    if (val && i < PIN_LEN - 1) nextRefs.current[i + 1]?.focus()
  }

  const handleKey = (i, e, arr, setArr, curRefs) => {
    if (e.key === 'Backspace' && !arr[i] && i > 0) curRefs.current[i - 1]?.focus()
  }

  const pinStr     = digits.join('')
  const confirmStr = confirm.join('')

  const submit = async () => {
    if (pinStr.length < 4) { setError(t('pinMinError')); return }

    if (mode === 'set') {
      if (step === 'enter') {
        setStep('confirm')
        setTimeout(() => cRefs.current[0]?.focus(), 100)
        return
      }
      if (pinStr !== confirmStr) {
        setError(t('pinMismatch'))
        setConfirm(Array(PIN_LEN).fill(''))
        setTimeout(() => cRefs.current[0]?.focus(), 100)
        return
      }
      setLoading(true)
      try {
        await chatAPI.setPin(chatId, pinStr)
        const chat = chats.find(c => c.id === chatId)
        if (chat) upsertChat({ ...chat, hidden: true })
        toast.success(t('pinSuccess'))
        onClose()
      } catch (err) {
        setError(err.response?.data?.error || t('error'))
      } finally { setLoading(false) }

    } else if (mode === 'verify') {
      setLoading(true)
      try {
        const res = await chatAPI.verifyPin(chatId, pinStr)
        if (res.data.valid) {
          unlockChat(chatId)
          onClose()
        } else {
          setError('Дұрыс емес PIN-код')
          setDigits(Array(PIN_LEN).fill(''))
          setTimeout(() => refs.current[0]?.focus(), 100)
        }
      } catch { setError(t('error')) }
      finally { setLoading(false) }
    }
  }

  const submitRecover = async (e) => {
    e.preventDefault()
    if (!password) { setError(t('required')); return }
    if (!newPin.match(/^\d{4,6}$/)) { setError(t('pinMinError')); return }
    setLoading(true)
    try {
      await chatAPI.recoverPin(chatId, { password, newPin })
      toast.success(t('pinRecoverSuccess'))
      onClose()
    } catch (err) {
      setError(err.response?.data?.error || t('error'))
    } finally { setLoading(false) }
  }

  const active      = step === 'confirm'
  const activeDigits = active ? confirm : digits
  const activeSet    = active ? setConfirm : setDigits
  const activeRefs   = active ? cRefs : refs

  const title = mode === 'recover'
    ? t('pinTitle_recover')
    : mode === 'set'
      ? (step === 'confirm' ? t('pinTitle_confirm') : t('pinTitle_set'))
      : t('pinTitle_verify')

  const sub = mode === 'recover'
    ? t('pinSub_recover')
    : mode === 'set'
      ? (step === 'confirm' ? t('pinSub_confirm') : t('pinSub_set'))
      : t('pinSub_verify')

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="pin-modal">
        <button className="btn-icon pin-close" onClick={onClose}>✕</button>
        <div className="pin-icon">🔐</div>
        <h3>{title}</h3>
        <p>{sub}</p>

        {/* ── RECOVER MODE ── */}
        {mode === 'recover' ? (
          <form onSubmit={submitRecover} style={{ width: '100%' }}>
            <div className="pin-recover-fields">
              <input
                type="password"
                className="input"
                placeholder={t('mainPassword')}
                value={password}
                onChange={e => { setPassword(e.target.value); setError('') }}
                required
              />
              <input
                type="text"
                className="input"
                placeholder={t('newPin')}
                value={newPin}
                onChange={e => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                maxLength={6}
                inputMode="numeric"
                required
              />
            </div>
            {error && <div className="pin-error">{error}</div>}
            <button
              type="submit"
              className="btn btn-primary btn-full"
              disabled={loading || !password || newPin.length < 4}
            >
              {loading
                ? <><span className="spinner" /> {t('pinWait')}</>
                : t('pinRecover')}
            </button>
            <button
              type="button"
              className="btn btn-ghost btn-full"
              style={{ marginTop: 8 }}
              onClick={onClose}
            >
              {t('cancel')}
            </button>
          </form>
        ) : (
          /* ── SET / VERIFY MODE ── */
          <>
            <div className="pin-inputs">
              {activeDigits.map((d, i) => (
                <input
                  key={i}
                  ref={el => activeRefs.current[i] = el}
                  type="password"
                  inputMode="numeric"
                  maxLength={1}
                  value={d}
                  className={`pin-box ${d ? 'filled' : ''}`}
                  onChange={e => handleInput(i, e.target.value, activeDigits, activeSet, activeRefs)}
                  onKeyDown={e => handleKey(i, e, activeDigits, activeSet, activeRefs)}
                />
              ))}
            </div>

            {error && <div className="pin-error">{error}</div>}

            <button
              className="btn btn-primary btn-full"
              onClick={submit}
              disabled={loading || pinStr.length < 4 || (active && confirmStr.length < 4)}
            >
              {loading
                ? <><span className="spinner" /> {t('pinWait')}</>
                : mode === 'set' && step === 'enter'
                  ? t('pinNext')
                  : mode === 'set'
                    ? t('pinSet')
                    : t('pinOpen')}
            </button>

            {mode === 'set' && step === 'confirm' && (
              <button
                className="btn btn-ghost btn-full"
                style={{ marginTop: 8 }}
                onClick={() => { setStep('enter'); setConfirm(Array(PIN_LEN).fill('')); setError('') }}
              >
                ← {t('back')}
              </button>
            )}

            {/* Verify режимінде — PIN ұмытқанда қалпына келтіру */}
            {mode === 'verify' && (
              <button
                className="btn btn-ghost btn-full"
                style={{ marginTop: 8, fontSize: 13, color: 'var(--text-muted)' }}
                onClick={() => {
                  // PinModal-ді recover режимінде қайта ашу — parent арқылы басқарылады
                  onClose()
                  // Кішкене кешіктіріп recover modal ашу үшін event жіберу
                  window.dispatchEvent(new CustomEvent('openPinRecover', { detail: { chatId } }))
                }}
              >
                {t('forgotPin')}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  )
}
