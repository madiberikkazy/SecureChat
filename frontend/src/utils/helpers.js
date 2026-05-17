import { formatDistanceToNow } from 'date-fns'
import { kk } from 'date-fns/locale'

// localStorage-дан timezone оқу (Settings-те сақталған)
function getTz() {
  return localStorage.getItem('timezone') || Intl.DateTimeFormat().resolvedOptions().timeZone
}

function get12h() {
  return localStorage.getItem('timeFormat') === '12h'
}

/**
 * Backend LocalDateTime жібереді — timezone белгісізсіз ("2026-05-16T05:31:00").
 * Browser оны LOCAL уақыт деп қабылдайды, бірақ backend UTC-да жұмыс жасайды.
 * Шешім: соңына "Z" қосып UTC деп белгілейміз → browser дұрыс конвертациялайды.
 */
function parseUTC(dateStr) {
  if (!dateStr) return null
  // Егер timezone бар болса — өзгертпейміз
  if (dateStr.endsWith('Z') || dateStr.includes('+') || dateStr.includes('-', 10)) {
    return new Date(dateStr)
  }
  // Timezone жоқ → UTC деп белгілеу
  return new Date(dateStr + 'Z')
}

// Уақытты settings timezone-ына сай форматтау
function toTzTime(date) {
  if (!date || isNaN(date)) return ''
  return date.toLocaleTimeString('ru-RU', {
    timeZone: getTz(),
    hour:   '2-digit',
    minute: '2-digit',
    hour12: get12h(),
  })
}

// Берілген датаның YYYY-MM-DD күнін settings timezone-ында қайтарады
function toTzDateStr(date) {
  return date.toLocaleDateString('en-CA', { timeZone: getTz() }) // 'YYYY-MM-DD'
}

export function formatMessageTime(dateStr) {
  const date = parseUTC(dateStr)
  if (!date) return ''
  return toTzTime(date)
}

export function formatChatTime(dateStr) {
  const date = parseUTC(dateStr)
  if (!date) return ''

  const dateDayStr    = toTzDateStr(date)
  const todayDayStr   = toTzDateStr(new Date())
  const yestDate      = new Date(Date.now() - 86400000)
  const yesterDayStr  = toTzDateStr(yestDate)

  if (dateDayStr === todayDayStr)   return toTzTime(date)
  if (dateDayStr === yesterDayStr)  return 'Кеше'
  return date.toLocaleDateString('ru-RU', {
    day: '2-digit', month: '2-digit', year: '2-digit', timeZone: getTz()
  })
}

export function formatLastSeen(dateStr, isOnline) {
  if (isOnline) return 'онлайн'
  const date = parseUTC(dateStr)
  if (!date) return ''

  const dateDayStr  = toTzDateStr(date)
  const todayDayStr = toTzDateStr(new Date())

  if (dateDayStr === todayDayStr)
    return `соңғы рет ${toTzTime(date)}`
  return `соңғы рет ${formatDistanceToNow(date, { locale: kk, addSuffix: true })}`
}

export function getInitials(name) {
  if (!name) return '?'
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
}

export function getChatName(chat, currentUser) {
  if (!chat) return ''
  if (chat.type === 'GROUP') return chat.name || 'Топ'
  const other = chat.members?.find(m => m.user?.id !== currentUser?.id)
  return other?.user?.name || other?.user?.username || 'Пайдаланушы'
}

export function getChatAvatar(chat, currentUser) {
  if (chat.type === 'GROUP') return chat.avatarUrl
  const other = chat.members?.find(m => m.user?.id !== currentUser?.id)
  return other?.user?.avatarUrl
}

export function getChatOtherUser(chat, currentUser) {
  if (chat.type !== 'PRIVATE') return null
  const other = chat.members?.find(m => m.user?.id !== currentUser?.id)
  return other?.user || null
}
