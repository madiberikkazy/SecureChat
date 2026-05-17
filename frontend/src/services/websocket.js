import { Client } from '@stomp/stompjs'
import SockJS from 'sockjs-client'

class WebSocketService {
  constructor() {
    this.client = null
    this.subscriptions = {}
    this.messageHandlers = {}
    this.onlineHandlers = []
    this.connected = false
  }

  connect(token, onConnected) {
    if (this.client?.active) return

    this.client = new Client({
      webSocketFactory: () => new SockJS((import.meta.env.VITE_WS_URL || 'https://securechat-production-b7f9.up.railway.app/ws')),
      connectHeaders: { Authorization: `Bearer ${token}` },
      reconnectDelay: 3000,
      heartbeatIncoming: 10000,
      heartbeatOutgoing: 10000,

      onConnect: () => {
        this.connected = true
        console.log('✅ WebSocket connected')

        // Онлайн статус арнасына жазылу
        this.client.subscribe('/topic/online', (msg) => {
          const data = JSON.parse(msg.body)
          this.onlineHandlers.forEach(h => h(data))
        })

        onConnected?.()
      },

      onDisconnect: () => {
        this.connected = false
        console.log('❌ WebSocket disconnected')
      },

      onStompError: (frame) => {
        console.error('STOMP error:', frame)
      }
    })

    this.client.activate()
  }

  // Чат арнасына жазылу
  subscribeToChat(chatId, callback) {
    if (!this.client?.connected) return null
    const key = `chat-${chatId}`

    if (this.subscriptions[key]) {
      this.subscriptions[key].unsubscribe()
    }

    this.subscriptions[key] = this.client.subscribe(
      `/topic/chat/${chatId}`,
      (msg) => callback(JSON.parse(msg.body))
    )
    return this.subscriptions[key]
  }

  unsubscribeFromChat(chatId) {
    const key = `chat-${chatId}`
    this.subscriptions[key]?.unsubscribe()
    delete this.subscriptions[key]
  }

  // Хабарлама жіберу (WebSocket)
  sendMessage(chatId, content, replyToId = null) {
    if (!this.client?.connected) return false
    this.client.publish({
      destination: '/app/message.send',
      body: JSON.stringify({ chatId, content, replyToId })
    })
    return true
  }

  // Typing индикатор
  sendTyping(chatId, typing) {
    if (!this.client?.connected) return
    this.client.publish({
      destination: '/app/message.typing',
      body: JSON.stringify({ chatId, typing })
    })
  }

  // Онлайн статус handler
  onOnlineStatus(handler) {
    this.onlineHandlers.push(handler)
    return () => {
      this.onlineHandlers = this.onlineHandlers.filter(h => h !== handler)
    }
  }

  disconnect() {
    this.client?.deactivate()
    this.client = null
    this.connected = false
    this.subscriptions = {}
  }

  isConnected() { return this.connected }
}

export const wsService = new WebSocketService()
export default wsService
