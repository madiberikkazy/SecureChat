import { useEffect, useRef } from 'react'
import { wsService } from '../services/websocket'
import useChatStore from '../store/chatStore'
import { notificationService } from '../services/notificationService'

export function useChatWebSocket(chatId) {
  const addMessage    = useChatStore(s => s.addMessage)
  const updateMessage = useChatStore(s => s.updateMessage)
  const setTyping     = useChatStore(s => s.setTyping)
  const typingTimers  = useRef({})

  // Аутентифицирленген пайдаланушыны алу
  const currentUser = (() => {
    try {
      return JSON.parse(localStorage.getItem('user') || '{}')
    } catch { return {} }
  })()

  useEffect(() => {
    if (!chatId) return

    const sub = wsService.subscribeToChat(chatId, (wsMsg) => {
      const { event, data } = wsMsg

      switch (event) {
        case 'NEW_MESSAGE': {
          addMessage(chatId, data)

          // Хабарлама өзімнің хабарламам емес болса — дыбыс + хабарландыру
          const isOwn = data.sender?.id === currentUser?.id
          if (!isOwn) {
            const senderName = data.sender?.name || data.sender?.username || 'Белгісіз'
            const text       = data.deleted
              ? '🚫 Хабарлама өшірілді'
              : data.type === 'IMAGE'  ? '📷 Сурет'
              : data.type === 'VOICE'  ? '🎤 Дыбыс хабарламасы'
              : data.type === 'FILE'   ? '📎 Файл'
              : (data.content || '')

            notificationService.onNewMessage(
              senderName,
              text,
              data.sender?.avatarUrl,
              false
            )
          }
          break
        }

        case 'DELETE_MESSAGE':
          updateMessage(chatId, data)
          break

        case 'TYPING':
          if (data.typing) {
            setTyping(chatId, data.username, true)
            clearTimeout(typingTimers.current[data.username])
            typingTimers.current[data.username] = setTimeout(() => {
              setTyping(chatId, data.username, false)
            }, 3000)
          } else {
            clearTimeout(typingTimers.current[data.username])
            setTyping(chatId, data.username, false)
          }
          break

        case 'READ':
          break
      }
    })

    return () => {
      wsService.unsubscribeFromChat(chatId)
      Object.values(typingTimers.current).forEach(clearTimeout)
    }
  }, [chatId])
}