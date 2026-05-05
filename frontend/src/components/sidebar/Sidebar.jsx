import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import useChatStore from '../../store/chatStore'
import { chatAPI, userAPI } from '../../services/api'
import { useToast } from '../common/Toast'
import Avatar from '../common/Avatar'
import NewChatModal from '../chat/NewChatModal'
import { getChatName, getChatAvatar, getChatOtherUser, formatChatTime, getInitials } from '../../utils/helpers'
import './Sidebar.css'

export default function Sidebar() {
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const { chats, selectedChatId, selectChat } = useChatStore()
  const toast = useToast()

  const [search, setSearch] = useState('')
  const [showNewChat, setShowNewChat] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)

  const filtered = chats.filter(c => {
    const name = getChatName(c, user)
    return name.toLowerCase().includes(search.toLowerCase())
  })

  const handleSelectChat = (chat) => {
    selectChat(chat.id)
  }

  return (
    <aside className="sidebar">
      {/* ── HEADER ── */}
      <div className="sidebar-header">
        <div className="sidebar-me" onClick={() => setShowUserMenu(v => !v)}>
          <Avatar user={user} size={38} showOnline />
          <div className="sidebar-me-info">
            <span className="sidebar-me-name">{user?.name}</span>
            <span className="sidebar-me-username">@{user?.username}</span>
          </div>
          <span className="sidebar-me-arrow">▾</span>
        </div>

        <div className="sidebar-actions">
          <button className="btn-icon" onClick={() => setShowNewChat(true)} title="Жаңа чат">✏️</button>
          <button className="btn-icon" onClick={() => navigate('/settings')} title="Баптаулар">⚙️</button>
        </div>

        {showUserMenu && (
          <div className="user-dropdown" onClick={() => setShowUserMenu(false)}>
            <button className="dropdown-item" onClick={() => navigate('/settings')}>
              ⚙️ Баптаулар
            </button>
            <div className="dropdown-divider" />
            <button className="dropdown-item danger" onClick={logout}>
              🚪 Шығу
            </button>
          </div>
        )}
      </div>

      {/* ── SEARCH ── */}
      <div className="sidebar-search">
        <div className="search-wrap">
          <span className="search-icon">🔍</span>
          <input className="input" type="text" placeholder="Іздеу..."
            value={search} onChange={e => setSearch(e.target.value)} />
          {search && <button className="search-clear" onClick={() => setSearch('')}>✕</button>}
        </div>
      </div>

      {/* ── CHAT LIST ── */}
      <div className="chat-list">
        {filtered.length === 0 ? (
          <div className="chat-list-empty">
            {search ? (
              <p>«{search}» бойынша нәтиже жоқ</p>
            ) : (
              <>
                <span>💬</span>
                <p>Чат жоқ</p>
                <button className="btn btn-primary btn-sm" onClick={() => setShowNewChat(true)}>
                  Бастау
                </button>
              </>
            )}
          </div>
        ) : (
          filtered.map(chat => (
            <ChatItem
              key={chat.id}
              chat={chat}
              currentUser={user}
              isSelected={chat.id === selectedChatId}
              onClick={() => handleSelectChat(chat)}
            />
          ))
        )}
      </div>

      {showNewChat && (
        <NewChatModal onClose={() => setShowNewChat(false)} />
      )}
    </aside>
  )
}

// ── CHAT ITEM ──
function ChatItem({ chat, currentUser, isSelected, onClick }) {
  const name = getChatName(chat, currentUser)
  const avatarUrl = getChatAvatar(chat, currentUser)
  const otherUser = getChatOtherUser(chat, currentUser)
  const lastMsg = chat.lastMessage
  const isOnline = otherUser?.online

  return (
    <div className={`chat-item ${isSelected ? 'selected' : ''}`} onClick={onClick}>
      <div className={`chat-item-avatar ${isOnline ? 'online' : ''}`}>
        {avatarUrl
          ? <img src={avatarUrl} alt={name} />
          : <span>{getInitials(name)}</span>
        }
        {chat.hidden && <span className="hidden-lock">🔒</span>}
        {chat.type === 'GROUP' && <span className="group-badge">👥</span>}
      </div>

      <div className="chat-item-body">
        <div className="chat-item-top">
          <span className="chat-item-name">{name}</span>
          {lastMsg && <span className="chat-item-time">{formatChatTime(lastMsg.createdAt)}</span>}
        </div>
        <div className="chat-item-bottom">
          <span className="chat-item-preview">
            {lastMsg
              ? lastMsg.deleted
                ? '🚫 Хабарлама өшірілді'
                : lastMsg.sender?.id === currentUser?.id
                  ? `Сіз: ${lastMsg.content}`
                  : lastMsg.content
              : 'Хабарлама жоқ'}
          </span>
          {chat.unreadCount > 0 && (
            <span className="badge">{chat.unreadCount > 99 ? '99+' : chat.unreadCount}</span>
          )}
        </div>
      </div>
    </div>
  )
}
