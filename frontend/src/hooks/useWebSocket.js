import { useEffect, useRef } from 'react'
import { wsService } from '../services/websocket'
import useChatStore from '../store/chatStore'

export function useChatWebSocket(chatId) {
  const addMessage = useChatStore(s => s.addMessage)
  const updateMessage = useChatStore(s => s.updateMessage)
  const setTyping = useChatStore(s => s.setTyping)
  const typingTimers = useRef({})

  useEffect(() => {
    if (!chatId) return

    const sub = wsService.subscribeToChat(chatId, (wsMsg) => {
      const { event, data } = wsMsg

      switch (event) {
        case 'NEW_MESSAGE':
          addMessage(chatId, data)
          break

        case 'DELETE_MESSAGE':
          updateMessage(chatId, data)
          break

        case 'TYPING':
          if (data.typing) {
            setTyping(chatId, data.username, true)
            // 3 секундтан кейін typing-ді өшіру
            clearTimeout(typingTimers.current[data.username])
            typingTimers.current[data.username] = setTimeout(() => {
              setTyping(chatId, data.username, false)
            }, 3000)
          } else {
            setTyping(chatId, data.username, false)
          }
          break

        case 'READ':
          // Оқылды белгісі (болашақта UI-да көрсетуге болады)
          break
      }
    })

    return () => {
      wsService.unsubscribeFromChat(chatId)
      Object.values(typingTimers.current).forEach(clearTimeout)
    }
  }, [chatId])
}
