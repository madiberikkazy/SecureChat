import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const useChatStore = create(
  persist(
    (set, get) => ({
      chats: [],
      selectedChatId: null,
      messages: {},
      typingUsers: {},
      onlineUsers: {},
      unlockedChats: new Set(),

      // ===== ЧАТТАР =====
      setChats: (chats) => set({ chats }),

      upsertChat: (chat) => set(state => {
        const idx = state.chats.findIndex(c => c.id === chat.id)
        if (idx >= 0) {
          const updated = [...state.chats]
          updated[idx] = chat
          return { chats: updated }
        }
        return { chats: [chat, ...state.chats] }
      }),

      // Чатты толығымен жою (delete немесе leave)
      removeChat: (chatId) => set(state => ({
        chats: state.chats.filter(c => c.id !== chatId),
        selectedChatId: state.selectedChatId === chatId ? null : state.selectedChatId,
        messages: Object.fromEntries(
          Object.entries(state.messages).filter(([k]) => Number(k) !== chatId)
        ),
      })),

      selectChat: (id) => set({ selectedChatId: id }),

      getSelectedChat: () => {
        const state = get()
        return state.chats.find(c => c.id === state.selectedChatId) || null
      },

      // ===== ХАБАРЛАМАЛАР =====
      setMessages: (chatId, messages) => set(state => ({
        messages: { ...state.messages, [chatId]: messages }
      })),

      addMessage: (chatId, message) => set(state => {
        const existing = state.messages[chatId] || []
        const idx = existing.findIndex(m => m.id === message.id)
        let updated
        if (idx >= 0) {
          updated = [...existing]
          updated[idx] = message
        } else {
          updated = [...existing, message]
        }

        const updatedChats = state.chats.map(c =>
          c.id === chatId
            ? { ...c, lastMessage: message, lastMessageAt: message.createdAt }
            : c
        )
        updatedChats.sort((a, b) => {
          const ta = a.lastMessageAt || a.createdAt
          const tb = b.lastMessageAt || b.createdAt
          return new Date(tb) - new Date(ta)
        })

        return {
          messages: { ...state.messages, [chatId]: updated },
          chats: updatedChats,
        }
      }),

      // Хабарламаны жаңарту (өңдеу / оқылды)
      updateMessage: (chatId, message) => set(state => ({
        messages: {
          ...state.messages,
          [chatId]: (state.messages[chatId] || []).map(m =>
            m.id === message.id ? message : m
          ),
        }
      })),

      // ===== TYPING =====
      setTyping: (chatId, username, isTyping) => set(state => {
        const current = new Set(state.typingUsers[chatId] || [])
        if (isTyping) current.add(username)
        else current.delete(username)
        return { typingUsers: { ...state.typingUsers, [chatId]: current } }
      }),

      // ===== ОНЛАЙН =====
      setOnline: (username, online) => set(state => ({
        onlineUsers: { ...state.onlineUsers, [username]: online }
      })),

      isOnline: (username) => get().onlineUsers[username] ?? false,

      // ===== ЖАСЫРЫН ЧАТ =====
      unlockChat: (chatId) => set(state => ({
        unlockedChats: new Set([...state.unlockedChats, chatId])
      })),

      isChatUnlocked: (chatId) => get().unlockedChats.has(chatId),

      // ===== ОҚЫЛМАҒАН САНДЫ ТАЗАЛАУ =====
      clearUnread: (chatId) => set(state => ({
        chats: state.chats.map(c =>
          c.id === chatId ? { ...c, unreadCount: 0 } : c
        )
      })),
    }),
    {
      name: 'securechat-store',
      partialize: (state) => ({
        chats: state.chats,
        selectedChatId: state.selectedChatId,
      }),
    }
  )
)

export default useChatStore
