// ════════════════════════════════════════════
//   NOTIFICATION SERVICE
//   — дыбыс (Web Audio API)
//   — браузер хабарландыруы (Notifications API)
// ════════════════════════════════════════════

class NotificationService {
  constructor() {
    this.audioCtx       = null
    this.permissionGiven = false
    this._init()
  }

  // ── Инициализация ──────────────────────────
  async _init() {
    // Браузер рұқсатын тексеру
    if ('Notification' in window) {
      if (Notification.permission === 'granted') {
        this.permissionGiven = true
      } else if (Notification.permission !== 'denied') {
        const result = await Notification.requestPermission()
        this.permissionGiven = result === 'granted'
      }
    }
  }

  // ── Рұқсат сұрату (бетте бірінші іс-қимыл кезінде) ──
  async requestPermission() {
    if (!('Notification' in window)) return false
    if (Notification.permission === 'granted') {
      this.permissionGiven = true
      return true
    }
    if (Notification.permission !== 'denied') {
      const result = await Notification.requestPermission()
      this.permissionGiven = result === 'granted'
      return this.permissionGiven
    }
    return false
  }

  // ── AudioContext (lazy) ─────────────────────
  _getAudioCtx() {
    if (!this.audioCtx) {
      this.audioCtx = new (window.AudioContext || window.webkitAudioContext)()
    }
    return this.audioCtx
  }

  // ── Хабарлама дыбысы (Telegram стилі) ──────
  playMessageSound() {
    const soundEnabled = localStorage.getItem('notif_sound') !== 'false'
    if (!soundEnabled) return

    try {
      const ctx      = this._getAudioCtx()
      const now      = ctx.currentTime

      // Екі нота: "ping-ping"
      this._beep(ctx, 880, now,       0.08, 'sine')
      this._beep(ctx, 1100, now + 0.1, 0.06, 'sine')
    } catch (e) {
      // AudioContext блокталса тыныш өт
    }
  }

  // ── Жіберілген хабарлама дыбысы ─────────────
  playSentSound() {
    const soundEnabled = localStorage.getItem('notif_sound') !== 'false'
    if (!soundEnabled) return

    try {
      const ctx = this._getAudioCtx()
      this._beep(ctx, 660, ctx.currentTime, 0.06, 'sine')
    } catch (e) {
      // тыныш
    }
  }

  // ── Бір нота генераторы ─────────────────────
  _beep(ctx, frequency, startTime, duration, type = 'sine') {
    const oscillator = ctx.createOscillator()
    const gainNode   = ctx.createGain()

    oscillator.connect(gainNode)
    gainNode.connect(ctx.destination)

    oscillator.type            = type
    oscillator.frequency.value = frequency

    // Дыбыс конвертасы: fade in → fade out
    gainNode.gain.setValueAtTime(0, startTime)
    gainNode.gain.linearRampToValueAtTime(0.25, startTime + 0.01)
    gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration)

    oscillator.start(startTime)
    oscillator.stop(startTime + duration)
  }

  // ── Браузер push-хабарландыруы ──────────────
  showBrowserNotification(senderName, messageText, avatarUrl = null) {
    const previewEnabled = localStorage.getItem('notif_preview') !== 'false'
    const notifEnabled   = localStorage.getItem('notif_enabled') !== 'false'

    if (!notifEnabled) return
    if (!this.permissionGiven) return
    if (document.hasFocus()) return // Қолданба ашық болса — push керек емес

    const title = senderName || 'SecureChat'
    const body  = previewEnabled
      ? (messageText || 'Жаңа хабарлама')
      : 'Жаңа хабарлама'

    const options = {
      body,
      icon:   avatarUrl || '/favicon.ico',
      badge:  '/favicon.ico',
      tag:    'securechat-msg',   // бірдей тег — алдыңғысын ауыстырады
      silent: true,               // дыбысты Web Audio API арқылы береміз
    }

    try {
      const notif = new Notification(title, options)
      notif.onclick = () => {
        window.focus()
        notif.close()
      }
      // 5 секундтан кейін автоматты жабу
      setTimeout(() => notif.close(), 5000)
    } catch (e) {
      // тыныш
    }
  }

  // ── Жаңа хабарлама: дыбыс + push ───────────
  onNewMessage(senderName, messageText, avatarUrl, isOwn = false) {
    if (isOwn) return // өз хабарламаңа дыбыс жоқ

    this.playMessageSound()
    this.showBrowserNotification(senderName, messageText, avatarUrl)
  }
}

export const notificationService = new NotificationService()
export default notificationService