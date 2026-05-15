import { useState, useEffect, useRef, useCallback } from 'react'
import { chatAPI, messageAPI } from '../../services/api'
import { wsService } from '../../services/websocket'
import useChatStore from '../../store/chatStore'
import { useAuth } from '../../context/AuthContext'
import { useChatWebSocket } from '../../hooks/useWebSocket'
import { useToast } from '../common/Toast'
import Avatar from '../common/Avatar'
import PinModal from './PinModal'
import MediaViewer from './MediaViewer'
import AudioRecorder from './AudioRecorder'
import { getChatName, getChatOtherUser, formatMessageTime, formatLastSeen, getInitials } from '../../utils/helpers'
import './ChatWindow.css'

export default function ChatWindow() {
  const { user } = useAuth()
  const {
    selectedChatId, chats, messages, setMessages, addMessage,
    typingUsers, isChatUnlocked, unlockChat, clearUnread, upsertChat
  } = useChatStore()
  const toast = useToast()

  const chat = chats.find(c => c.id === selectedChatId)
  const chatMessages = messages[selectedChatId] || []
  const typingSet = typingUsers[selectedChatId] || new Set()

  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [showPin, setShowPin] = useState(false)
  const [showInfo, setShowInfo] = useState(false)
  const [replyTo, setReplyTo] = useState(null)
  const [showAudioRecorder, setShowAudioRecorder] = useState(false)
  const [imageFile, setImageFile] = useState(null)
  const [imageCaption, setImageCaption] = useState('')
  const [uploadingMedia, setUploadingMedia] = useState(false)

  const bottomRef = useRef(null)
  const inputRef = useRef(null)
  const typingTimer = useRef(null)
  const fileInputRef = useRef(null)

  useChatWebSocket(selectedChatId)

  // ===== ХАБАРЛАМАЛАРДЫ ЖҮКТЕУ =====
  useEffect(() => {
    if (!selectedChatId) return
    if (chat?.hidden && !isChatUnlocked(selectedChatId)) {
      setLoading(false)
      return
    }

    setLoading(true)
    chatAPI.getMessages(selectedChatId)
      .then(res => {
        setMessages(selectedChatId, res.data)
        clearUnread(selectedChatId)
      })
      .catch(() => toast.error('Хабарламаларды жүктеу мүмкін болмады'))
      .finally(() => setLoading(false))

    inputRef.current?.focus()
  }, [selectedChatId, isChatUnlocked(selectedChatId)])

  // ===== СОҢҒЫ ХАБАРЛАМАҒА СКРОЛЛ =====
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages.length])

  // ===== TYPING =====
  const handleInputChange = (e) => {
    setInput(e.target.value)
    wsService.sendTyping(selectedChatId, true)
    clearTimeout(typingTimer.current)
    typingTimer.current = setTimeout(() => wsService.sendTyping(selectedChatId, false), 2000)
  }

  // ===== МӘТІН ЖІБЕРУ =====
  const handleSend = useCallback(async () => {
    const content = input.trim()
    if (!content || sending) return
    setInput('')
    setReplyTo(null)
    wsService.sendTyping(selectedChatId, false)

    setSending(true)
    try {
      const sent = wsService.sendMessage(selectedChatId, content, replyTo?.id)
      if (!sent) {
        const res = await messageAPI.send({ chatId: selectedChatId, content, replyToId: replyTo?.id })
        addMessage(selectedChatId, res.data)
      }
    } catch {
      toast.error('Хабарлама жіберу мүмкін болмады')
      setInput(content)
    } finally { setSending(false) }
  }, [input, selectedChatId, replyTo, sending])

  // ===== СУРЕТ ЖІБЕРУ =====
  const handleSendImage = useCallback(async (file) => {
    if (!file) return
    setUploadingMedia(true)
    try {
      const formData = new FormData()
      formData.append('chatId', selectedChatId)
      formData.append('file', file)
      if (imageCaption) formData.append('caption', imageCaption)
      if (replyTo) formData.append('replyToId', replyTo.id)

      const token = localStorage.getItem('token')
      const res = await fetch('/api/messages/image', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      })

      if (!res.ok) throw new Error('Жіберу мүмкін болмады')
      const data = await res.json()
      addMessage(selectedChatId, data)
      setImageFile(null)
      setImageCaption('')
      setReplyTo(null)
    } catch (err) {
      toast.error(err.message || 'Сурет жіберу мүмкін болмады')
    } finally { setUploadingMedia(false) }
  }, [selectedChatId, imageCaption, replyTo])

  // ===== ДЫБЫС ЖІБЕРУ =====
  const handleSendVoice = useCallback(async (audioBlob) => {
    setShowAudioRecorder(false)
    setUploadingMedia(true)
    try {
      const formData = new FormData()
      formData.append('chatId', selectedChatId)
      formData.append('file', audioBlob, 'voice.webm')
      if (replyTo) formData.append('replyToId', replyTo.id)

      const token = localStorage.getItem('token')
      const res = await fetch('/api/messages/voice', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      })

      if (!res.ok) throw new Error()
      const data = await res.json()
      addMessage(selectedChatId, data)
      setReplyTo(null)
    } catch {
      toast.error('Дыбыс жіберу мүмкін болмады')
    } finally { setUploadingMedia(false) }
  }, [selectedChatId, replyTo])

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  const handleDelete = async (msgId) => {
    try { await messageAPI.delete(msgId) }
    catch { toast.error('Өшіру мүмкін болмады') }
  }

  if (!chat) return null

  // ===== ЖАСЫРЫН ЧАТ =====
  const isLocked = chat.hidden && !isChatUnlocked(selectedChatId)
  if (isLocked) return (
    <div className="chat-locked">
      <div className="locked-content">
        <div className="locked-icon-wrap">🔒</div>
        <h3>Жасырын чат</h3>
        <p>Бұл чатты ашу үшін PIN-кодты енгізіңіз</p>
        <button className="btn btn-primary btn-lg" onClick={() => setShowPin(true)}>
          🔓 PIN енгізу
        </button>
      </div>
      {showPin && <PinModal chatId={selectedChatId} mode="verify" onClose={() => setShowPin(false)} />}
    </div>
  )

  const chatName = getChatName(chat, user)
  const otherUser = getChatOtherUser(chat, user)
  const typingList = [...typingSet].filter(u => u !== user?.username)

  return (
    <div className="chat-window">

      {/* ── HEADER ── */}
      <div className="chat-header">
        <div className="chat-header-info">
          <div className="chat-avatar-wrap">
            {chat.avatarUrl || otherUser?.avatarUrl
              ? <img src={chat.avatarUrl || otherUser?.avatarUrl} alt={chatName} className="chat-avatar-img" />
              : <div className="chat-avatar-initials">{getInitials(chatName)}</div>
            }
            {otherUser?.online && <span className="avatar-dot" />}
          </div>
          <div className="chat-header-text">
            <div className="chat-header-name">{chatName}</div>
            <div className="chat-header-sub">
              {typingList.length > 0
                ? <span className="typing-status">✏️ жазуда...</span>
                : chat.type === 'GROUP'
                  ? `${chat.members?.length || 0} мүше`
                  : formatLastSeen(otherUser?.lastSeen, otherUser?.online)}
            </div>
          </div>
        </div>

        <div className="chat-header-actions">
          {!chat.hidden
            ? (
              <button className="btn-icon header-btn" title="Жасырын чат орнату" onClick={() => setShowPin(true)}>
                🔒
              </button>
            )
            : (
              <button className="btn-icon header-btn" title="Жасырын режимді алу"
                onClick={async () => {
                  await chatAPI.removePin(selectedChatId)
                  upsertChat({ ...chat, hidden: false })
                  toast.success('Жасырын режим алынды')
                }}>
                🔓
              </button>
            )
          }
          <button className="btn-icon header-btn" title="Чат ақпараты" onClick={() => setShowInfo(v => !v)}>
            ℹ️
          </button>
        </div>
      </div>

      {/* ── INFO PANEL ── */}
      {showInfo && <ChatInfoPanel chat={chat} onClose={() => setShowInfo(false)} />}

      {/* ── MESSAGES ── */}
      <div className="messages-area">
        {loading
          ? (
            <div className="msgs-loading">
              <span className="spinner" style={{ width: 32, height: 32 }} />
            </div>
          )
          : chatMessages.length === 0
            ? (
              <div className="msgs-empty">
                <span>💬</span>
                <p>Хабарлама жоқ. Бірінші болып жазыңыз!</p>
              </div>
            )
            : chatMessages.map((msg, i) => {
                const isOwn = msg.sender?.id === user?.id
                const showDate = i === 0 || !sameDay(chatMessages[i-1]?.createdAt, msg.createdAt)
                const showSenderName = !isOwn && chat.type === 'GROUP'
                  && (i === 0 || chatMessages[i-1]?.sender?.id !== msg.sender?.id)

                return (
                  <div key={msg.id}>
                    {showDate && <DateDivider date={msg.createdAt} />}
                    <MessageBubble
                      message={msg}
                      isOwn={isOwn}
                      showSenderName={showSenderName}
                      onReply={() => setReplyTo(msg)}
                      onDelete={isOwn && !msg.deleted ? () => handleDelete(msg.id) : null}
                    />
                  </div>
                )
              })
        }
        <div ref={bottomRef} />
      </div>

      {/* ── TYPING INDICATOR ── */}
      {typingList.length > 0 && (
        <div className="typing-indicator">
          <div className="typing-dots"><span /><span /><span /></div>
          <span>{typingList.join(', ')} жазуда...</span>
        </div>
      )}

      {/* ── AUDIO RECORDER ── */}
      {showAudioRecorder && (
        <AudioRecorder
          onRecordingComplete={handleSendVoice}
          onCancel={() => setShowAudioRecorder(false)}
        />
      )}

      {/* ── IMAGE PREVIEW ── */}
      {imageFile && (
        <div className="image-upload-preview">
          <img src={URL.createObjectURL(imageFile)} alt="Preview" className="preview-thumb" />
          <div className="image-upload-form">
            <input
              type="text"
              className="input"
              placeholder="Сипаттама қосу (міндетті емес)..."
              value={imageCaption}
              onChange={(e) => setImageCaption(e.target.value)}
            />
            <div className="image-upload-actions">
              <button className="btn btn-ghost btn-sm" onClick={() => { setImageFile(null); setImageCaption(''); }}>
                ✕ Бас тарту
              </button>
              <button className="btn btn-primary btn-sm" onClick={() => handleSendImage(imageFile)} disabled={uploadingMedia}>
                {uploadingMedia
                  ? <><span className="spinner" style={{ width: 14, height: 14 }} /> Жіберілуде...</>
                  : '➤ Жіберу'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── REPLY PREVIEW ── */}
      {replyTo && (
        <div className="reply-preview">
          <div className="reply-bar" />
          <div className="reply-content">
            <span className="reply-sender">{replyTo.sender?.name}</span>
            <span className="reply-text">{replyTo.content || '📎 Медиа'}</span>
          </div>
          <button className="btn-icon" onClick={() => setReplyTo(null)}>✕</button>
        </div>
      )}

      {/* ── TOOLBAR ── */}
      <div className="input-toolbar">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp"
          hidden
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) setImageFile(file)
            e.target.value = ''
          }}
        />
        <button
          className="toolbar-btn"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploadingMedia || !!imageFile}
          title="Сурет жіберу"
        >
          📷
        </button>
        <button
          className={`toolbar-btn ${showAudioRecorder ? 'active' : ''}`}
          onClick={() => setShowAudioRecorder(v => !v)}
          disabled={uploadingMedia}
          title="Дыбыс хабарламасы"
        >
          🎤
        </button>
      </div>

      {/* ── INPUT ── */}
      <div className="chat-input-bar">
        <textarea
          ref={inputRef}
          className="chat-textarea"
          placeholder="Хабарлама жазыңыз..."
          value={input}
          onChange={handleInputChange}
          onKeyDown={handleKey}
          rows={1}
          disabled={uploadingMedia}
          onInput={e => {
            e.target.style.height = 'auto'
            e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'
          }}
        />
        <button
          className="send-btn"
          onClick={handleSend}
          disabled={!input.trim() || sending || uploadingMedia}
        >
          {sending || uploadingMedia
            ? <span className="spinner" style={{ width: 18, height: 18 }} />
            : <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
              </svg>
          }
        </button>
      </div>

      {showPin && <PinModal chatId={selectedChatId} mode="set" onClose={() => setShowPin(false)} />}
    </div>
  )
}

// ── MESSAGE BUBBLE ──
function MessageBubble({ message, isOwn, showSenderName, onReply, onDelete }) {
  const isMedia = message.type === 'IMAGE' || message.type === 'VOICE' || message.type === 'FILE'
  const isText = !message.type || message.type === 'TEXT'

  return (
    <div className={`msg-wrapper ${isOwn ? 'own' : 'other'}`}>
      <div className="msg-group">

        {showSenderName && (
          <span className="msg-sender-name">{message.sender?.name}</span>
        )}

        {message.replyTo && (
          <div className={`msg-reply-block ${isOwn ? 'own' : ''}`}>
            <span className="msg-reply-sender">{message.replyTo.sender?.name}</span>
            <span className="msg-reply-text">{message.replyTo.content || '📎 Медиа'}</span>
          </div>
        )}

        {/* МЕДИА ХАБАРЛАМАЛАР */}
        {isMedia && !message.deleted && (
          <div className={`msg-media-container ${isOwn ? 'own' : 'other'}`}>
            <MediaViewer message={message} isOwn={isOwn} />
            <span className="msg-time-media">{formatMessageTime(message.createdAt)}</span>
          </div>
        )}

        {/* МӘТІН ХАБАРЛАМАЛАР */}
        {(isText || message.deleted) && (
          <div className={`msg-bubble ${isOwn ? 'own' : 'other'} ${message.deleted ? 'deleted' : ''}`}>
            {message.deleted
              ? <span className="msg-deleted">🚫 Хабарлама өшірілді</span>
              : <span className="msg-text">{message.content}</span>
            }
            <span className="msg-time">{formatMessageTime(message.createdAt)}</span>
          </div>
        )}

        {/* IMAGE + CAPTION */}
        {message.type === 'IMAGE' && message.content && !message.deleted && (
          <div className={`msg-bubble ${isOwn ? 'own' : 'other'}`} style={{ marginTop: 4 }}>
            <span className="msg-text">{message.content}</span>
            <span className="msg-time">{formatMessageTime(message.createdAt)}</span>
          </div>
        )}

        {/* ACTIONS */}
        {!message.deleted && (
          <div className={`msg-actions ${isOwn ? 'own' : ''}`}>
            {onReply && (
              <button className="msg-action-btn" onClick={onReply} title="Жауап беру">
                ↩
              </button>
            )}
            {onDelete && (
              <button className="msg-action-btn danger" onClick={onDelete} title="Өшіру">
                🗑
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ── DATE DIVIDER ──
function DateDivider({ date }) {
  const d = new Date(date)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)

  let label
  if (sameDay(d, today)) label = 'Бүгін'
  else if (sameDay(d, yesterday)) label = 'Кеше'
  else label = d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })

  return (
    <div className="date-divider">
      <span>{label}</span>
    </div>
  )
}

// ── CHAT INFO PANEL ──
function ChatInfoPanel({ chat, onClose }) {
  return (
    <div className="info-panel">
      <div className="info-panel-header">
        <span>{chat.type === 'GROUP' ? '👥 Топ ақпараты' : '👤 Профиль'}</span>
        <button className="btn-icon" onClick={onClose}>✕</button>
      </div>
      <div className="info-panel-body">
        {chat.description && <p className="info-description">{chat.description}</p>}
        <div className="info-members">
          <h4>Мүшелер ({chat.members?.length || 0})</h4>
          {chat.members?.map(m => (
            <div key={m.id} className="info-member">
              <Avatar user={m.user} size={34} showOnline />
              <div>
                <span className="info-member-name">{m.user?.name}</span>
                <span className="info-member-role">{roleLabel(m.role)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function roleLabel(role) {
  return role === 'OWNER' ? '👑 Иесі' : role === 'ADMIN' ? '🛡 Әкімші' : '👤 Мүше'
}

function sameDay(d1, d2) {
  const a = new Date(d1), b = new Date(d2)
  return a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate()
}