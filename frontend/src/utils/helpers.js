import { format, isToday, isYesterday, formatDistanceToNow } from 'date-fns'
import { kk } from 'date-fns/locale'

export function formatMessageTime(dateStr) {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return format(date, 'HH:mm')
}

export function formatChatTime(dateStr) {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  if (isToday(date)) return format(date, 'HH:mm')
  if (isYesterday(date)) return 'Кеше'
  return format(date, 'dd.MM.yy')
}

export function formatLastSeen(dateStr, isOnline) {
  if (isOnline) return 'онлайн'
  if (!dateStr) return ''
  const date = new Date(dateStr)
  if (isToday(date)) return `соңғы рет ${format(date, 'HH:mm')}`
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
