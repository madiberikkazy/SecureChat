import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// Чаттарды сортировка: бекітілгендер жоғарыда, содан кейін соңғы хабарлама бойынша
function sortChats(chats) {
  return [...chats].sort((a, b) => {
    // Бекітілген чаттар жоғарыда
    if (a.pinnedAt && !b.pinnedAt) return -1
    if (!a.pinnedAt && b.pinnedAt) return 1
    // Екеуі де бекітілген болса — бекіту уақыты бойынша
    if (a.pinnedAt && b.pinnedAt) return new Date(b.pinnedAt) - new Date(a.pinnedAt)
    // Қалғандары — соңғы хабарлама уақыты бойынша
    const ta = a.lastMessageAt || a.createdAt
    const tb = b.lastMessageAt || b.createdAt
    return new Date(tb) - new Date(ta)
  })
}

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
      setChats: (chats) => set({ chats: sortChats(chats) }),

      upsertChat: (chat) => set(state => {
        const idx = state.chats.findIndex(c => c.id === chat.id)
        let updated
        if (idx >= 0) {
          updated = [...state.chats]
          updated[idx] = chat
        } else {
          updated = [chat, ...state.chats]
        }
        return { chats: sortChats(updated) }
      }),

      // Чатты толығымен жою (delete немесе leave)
      removeChat: (chatId) => set(state => ({
        chats: state.chats.filter(c => c.id !== chatId),
        selectedChatId: state.selectedChatId === chatId ? null : state.selectedChatId,
        messages: Object.fromEntries(
          Object.entries(state.messages).filter(([k]) => Number(k) !== chatId)
        ),
      })),

      // Чатты бекіту (pin)
      pinChat: (chatId) => set(state => ({
        chats: sortChats(state.chats.map(c =>
          c.id === chatId ? { ...c, pinnedAt: new Date().toISOString() } : c
        )),
      })),

      // Чат бекітуін алу (unpin)
      unpinChat: (chatId) => set(state => ({
        chats: sortChats(state.chats.map(c =>
          c.id === chatId ? { ...c, pinnedAt: null } : c
        )),
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

        return {
          messages: { ...state.messages, [chatId]: updated },
          chats: sortChats(updatedChats),
        }
      }),

      // Хабарламаны жаңарту (өңдеу / оқылды / pin)
      updateMessage: (chatId, message) => set(state => ({
        messages: {
          ...state.messages,
          [chatId]: (state.messages[chatId] || []).map(m =>
            m.id === message.id ? message : m
          ),
        }
      })),

      // Хабарламаны өшіру store-дан (массивтен)
      removeMessage: (chatId, messageId) => set(state => ({
        messages: {
          ...state.messages,
          [chatId]: (state.messages[chatId] || []).filter(m => m.id !== messageId),
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
