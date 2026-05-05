import { useState, useRef, useEffect } from 'react'
import { chatAPI } from '../../services/api'
import useChatStore from '../../store/chatStore'
import { useToast } from '../common/Toast'
import './PinModal.css'

export default function PinModal({ chatId, mode, onClose }) {
  const PIN_LEN = 6
  const [digits, setDigits] = useState(Array(PIN_LEN).fill(''))
  const [confirm, setConfirm] = useState(Array(PIN_LEN).fill(''))
  const [step, setStep] = useState(mode === 'set' ? 'enter' : 'verify')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const refs = useRef([])
  const cRefs = useRef([])
  const { unlockChat, upsertChat, chats } = useChatStore()
  const toast = useToast()

  useEffect(() => { setTimeout(() => refs.current[0]?.focus(), 100) }, [])

  const handleInput = (i, val, arr, setArr, nextRefs) => {
    if (!/^\d*$/.test(val)) return
    const n = [...arr]; n[i] = val.slice(-1); setArr(n); setError('')
    if (val && i < PIN_LEN - 1) nextRefs.current[i + 1]?.focus()
  }

  const handleKey = (i, e, arr, setArr, curRefs) => {
    if (e.key === 'Backspace' && !arr[i] && i > 0) curRefs.current[i - 1]?.focus()
  }

  const pinStr = digits.join('')
  const confirmStr = confirm.join('')

  const submit = async () => {
    if (pinStr.length < 4) { setError('Кемінде 4 цифра'); return }

    if (mode === 'set') {
      if (step === 'enter') {
        setStep('confirm'); setTimeout(() => cRefs.current[0]?.focus(), 100); return
      }
      if (pinStr !== confirmStr) {
        setError('PIN-кодтар сәйкес келмейді'); setConfirm(Array(PIN_LEN).fill(''))
        setTimeout(() => cRefs.current[0]?.focus(), 100); return
      }
      setLoading(true)
      try {
        await chatAPI.setPin(chatId, pinStr)
        const chat = chats.find(c => c.id === chatId)
        if (chat) upsertChat({ ...chat, hidden: true })
        toast.success('PIN-код орнатылды 🔒')
        onClose()
      } catch (err) { setError(err.response?.data?.error || 'Қате') }
      finally { setLoading(false) }
    } else {
      setLoading(true)
      try {
        const res = await chatAPI.verifyPin(chatId, pinStr)
        if (res.data.valid) { unlockChat(chatId); onClose() }
        else { setError('Дұрыс емес PIN-код'); setDigits(Array(PIN_LEN).fill('')); setTimeout(() => refs.current[0]?.focus(), 100) }
      } catch { setError('Қате орын алды') }
      finally { setLoading(false) }
    }
  }

  const active = step === 'confirm'
  const activeDigits = active ? confirm : digits
  const activeSet = active ? setConfirm : setDigits
  const activeRefs = active ? cRefs : refs

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="pin-modal">
        <button className="btn-icon pin-close" onClick={onClose}>✕</button>
        <div className="pin-icon">🔐</div>
        <h3>{mode==='set' ? (step==='confirm' ? 'PIN-кодты растаңыз' : 'Жаңа PIN-код орнату') : 'PIN-код енгізіңіз'}</h3>
        <p>{mode==='set' ? (step==='confirm' ? 'PIN-кодыңызды қайта теріңіз' : '4-6 цифрлы PIN-код орнатыңыз') : 'Жасырын чатты ашу үшін PIN-кодыңызды енгізіңіз'}</p>

        <div className="pin-inputs">
          {activeDigits.map((d, i) => (
            <input key={i}
              ref={el => activeRefs.current[i] = el}
              type="password" inputMode="numeric" maxLength={1}
              value={d}
              className={`pin-box ${d ? 'filled' : ''}`}
              onChange={e => handleInput(i, e.target.value, activeDigits, activeSet, activeRefs)}
              onKeyDown={e => handleKey(i, e, activeDigits, activeSet, activeRefs)}
            />
          ))}
        </div>

        {error && <div className="pin-error">{error}</div>}

        <button className="btn btn-primary btn-full" onClick={submit}
          disabled={loading || pinStr.length < 4 || (active && confirmStr.length < 4)}>
          {loading ? <><span className="spinner" /> Күте тұрыңыз...</> :
           mode==='set' && step==='enter' ? 'Келесі →' :
           mode==='set' ? 'Орнату ✓' : 'Ашу 🔓'}
        </button>

        {mode==='set' && step==='confirm' && (
          <button className="btn btn-ghost btn-full" style={{ marginTop:8 }}
            onClick={() => { setStep('enter'); setConfirm(Array(PIN_LEN).fill('')); setError('') }}>
            ← Артқа
          </button>
        )}
      </div>
    </div>
  )
}
