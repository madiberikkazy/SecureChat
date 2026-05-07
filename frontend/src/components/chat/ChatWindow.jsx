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
import FileUploadInput from '../common/FileUploadInput'
import { getChatName, getChatOtherUser, formatMessageTime, formatLastSeen, getInitials } from '../../utils/helpers'
import './ChatWindow.css'

export default function ChatWindow() {
  const { user } = useAuth()
  const { selectedChatId, chats, messages, setMessages, addMessage, typingUsers, isChatUnlocked, unlockChat, clearUnread, upsertChat } = useChatStore()
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

  // WebSocket арнасына жазылу
  useChatWebSocket(selectedChatId)

  // Хабарламаларды жүктеу
  useEffect(() => {
    if (!selectedChatId) return
    if (chat?.hidden && !isChatUnlocked(selectedChatId)) return

    setLoading(true)
    chatAPI.getMessages(selectedChatId)
      .then(res => {
        setMessages(selectedChatId, res.data)
        clearUnread(selectedChatId)
      })
      .catch((err) => {
        // PIN қажет болса
        if (err.response?.status === 403 || err.response?.data?.error?.includes('жасырын')) {
          setShowPin(true)
          toast.info('PIN-кодты енгізіңіз')
        } else {
          toast.error('Хабарламаларды жүктеу мүмкін болмады')
        }
      })
      .finally(() => setLoading(false))

    inputRef.current?.focus()
  }, [selectedChatId, isChatUnlocked(selectedChatId)])

  // Соңғы хабарламаға скролл
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages.length])

  // Typing индикаторы
  const handleInputChange = (e) => {
    setInput(e.target.value)
    wsService.sendTyping(selectedChatId, true)
    clearTimeout(typingTimer.current)
    typingTimer.current = setTimeout(() => wsService.sendTyping(selectedChatId, false), 2000)
  }

  // ===== МӘТІН ХАБАРЛАМАСЫ ЖІБЕРУ =====
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

      const res = await fetch('/api/messages/image', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: formData
      })

      if (!res.ok) throw new Error('Жіберу мүмкін болмады')

      const data = await res.json()
      addMessage(selectedChatId, data)
      setImageFile(null)
      setImageCaption('')
      setReplyTo(null)
      toast.success('Сурет жіберілді ✓')
    } catch (err) {
      toast.error(err.message || 'Сурет жіберу мүмкін болмады')
    } finally {
      setUploadingMedia(false)
    }
  }, [selectedChatId, imageCaption, replyTo])

  // ===== ДЫБЫС ХАБАРЛАМАСЫ ЖІБЕРУ =====
  const handleSendVoice = useCallback(async (audioBlob) => {
    setShowAudioRecorder(false)
    setUploadingMedia(true)
    try {
      const formData = new FormData()
      formData.append('chatId', selectedChatId)
      formData.append('file', audioBlob, 'voice.webm')
      if (replyTo) formData.append('replyToId', replyTo.id)

      const res = await fetch('/api/messages/voice', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: formData
      })

      if (!res.ok) throw new Error('Жіберу мүмкін болмады')

      const data = await res.json()
      addMessage(selectedChatId, data)
      setReplyTo(null)
      toast.success('Дыбыс жіберілді ✓')
    } catch (err) {
      toast.error(err.message || 'Дыбыс жіберу мүмкін болмады')
    } finally {
      setUploadingMedia(false)
    }
  }, [selectedChatId, replyTo])

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  const handleDelete = async (msgId) => {
    try { await messageAPI.delete(msgId) }
    catch { toast.error('Өшіру мүмкін болмады') }
  }

  if (!chat) return null

  // ===== ЖАСЫРЫН ЧАТ - АШЫЛМАҒАН =====
  const isLocked = chat.hidden && !isChatUnlocked(selectedChatId)
  if (isLocked) return (
    <div className="chat-locked">
      <div className="locked-content">
        <span className="locked-icon">🔒</span>
        <h3>Жасырын чат</h3>
        <p>Бұл чатты ашу үшін PIN-кодты енгізіңіз</p>
        <button className="btn btn-primary btn-lg" onClick={() => setShowPin(true)}>
          PIN енгізу
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
          <div className="chat-avatar">
            {chat.avatarUrl || otherUser?.avatarUrl
              ? <img src={chat.avatarUrl || otherUser?.avatarUrl} alt={chatName} />
              : <span>{getInitials(chatName)}</span>
            }
            {otherUser?.online && <span className="avatar-dot" />}
          </div>
          <div>
            <div className="chat-header-name">{chatName}</div>
            <div className="chat-header-sub">
              {chat.type === 'GROUP'
                ? `${chat.members?.length || 0} мүше`
                : formatLastSeen(otherUser?.lastSeen, otherUser?.online)}
            </div>
          </div>
        </div>

        <div className="chat-header-actions">
          {!chat.hidden
            ? <button className="btn-icon" title="Жасырын чат орнату" onClick={() => setShowPin(true)}>🔒</button>
            : <button className="btn-icon" title="Жасырын режимді алу" onClick={async () => {
                await chatAPI.removePin(selectedChatId)
                upsertChat({ ...chat, hidden: false })
                toast.success('Жасырын режим алынды')
              }}>🔓</button>
          }
          <button className="btn-icon" title="Чат ақпараты" onClick={() => setShowInfo(v => !v)}>ℹ️</button>
        </div>
      </div>

      {/* ── INFO PANEL ── */}
      {showInfo && <ChatInfoPanel chat={chat} user={user} onClose={() => setShowInfo(false)} />}

      {/* ── MESSAGES ── */}
      <div className="messages-area">
        {loading
          ? <div className="msgs-loading"><span className="spinner" /></div>
          : chatMessages.length === 0
            ? <div className="msgs-empty"><span>💬</span><p>Хабарлама жоқ. Бірінші болып жазыңыз!</p></div>
            : <>
                {chatMessages.map((msg, i) => {
                  const isOwn = msg.sender?.id === user?.id
                  const showDate = i === 0 || !sameDay(chatMessages[i-1]?.createdAt, msg.createdAt)
                  return (
                    <div key={msg.id}>
                      {showDate && <DateDivider date={msg.createdAt} />}
                      <MessageBubble
                        message={msg}
                        isOwn={isOwn}
                        showAvatar={chat.type === 'GROUP'}
                        onReply={() => setReplyTo(msg)}
                        onDelete={isOwn ? () => handleDelete(msg.id) : null}
                      />
                    </div>
                  )
                })}
              </>
        }
        <div ref={bottomRef} />
      </div>

      {/* ── TYPING ── */}
      {typingList.length > 0 && (
        <div className="typing-indicator">
          <span className="typing-dots"><span/><span/><span/></span>
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

      {/* ── IMAGE UPLOAD ── */}
      {imageFile && (
        <div className="image-upload-preview">
          <img src={URL.createObjectURL(imageFile)} alt="Preview" className="preview-thumb" />
          <div className="image-upload-form">
            <input 
              type="text"
              className="input"
              placeholder="Сурет сипаттамасы (міндетті емес)"
              value={imageCaption}
              onChange={(e) => setImageCaption(e.target.value)}
            />
            <div className="image-upload-buttons">
              <button className="btn btn-ghost btn-sm" onClick={() => { setImageFile(null); setImageCaption(''); }}>
                ✕ Бас тарту
              </button>
              <button className="btn btn-primary btn-sm" onClick={() => handleSendImage(imageFile)} disabled={uploadingMedia}>
                {uploadingMedia ? <><span className="spinner" style={{width:14,height:14}} /> Жүктелуде...</> : '➤ Жіберу'}
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
            <span className="reply-text">{replyTo.content || '[Медиа]'}</span>
          </div>
          <button className="btn-icon" onClick={() => setReplyTo(null)}>✕</button>
        </div>
      )}

      {/* ── INPUT TOOLS ── */}
      <div className="input-tools">
        <FileUploadInput type="image" onFileSelected={setImageFile} disabled={uploadingMedia || !!imageFile} />
        <button className="btn btn-secondary btn-sm" onClick={() => setShowAudioRecorder(!showAudioRecorder)} disabled={uploadingMedia}>
          🎤 Дыбыс
        </button>
      </div>

      {/* ── INPUT ── */}
      <div className="chat-input-bar">
        <textarea
          ref={inputRef}
          className="chat-textarea"
          placeholder="Хабарлама жазыңыз... (Enter — жіберу, Shift+Enter — жаңа жол)"
          value={input}
          onChange={handleInputChange}
          onKeyDown={handleKey}
          rows={1}
          style={{ height: 'auto' }}
          onInput={e => { e.target.style.height = 'auto'; e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px' }}
          disabled={uploadingMedia}
        />
        <button className="send-btn" onClick={handleSend} disabled={!input.trim() || sending || uploadingMedia}>
          {sending || uploadingMedia ? <span className="spinner" style={{width:18,height:18}} /> : '➤'}
        </button>
      </div>

      {showPin && <PinModal chatId={selectedChatId} mode="set" onClose={() => setShowPin(false)} />}
    </div>
  )
}

// ── MESSAGE BUBBLE ──
function MessageBubble({ message, isOwn, showAvatar, onReply, onDelete }) {
  const [showMenu, setShowMenu] = useState(false)

  return (
    <div className={`msg-wrapper ${isOwn ? 'own' : 'other'}`}
      onMouseLeave={() => setShowMenu(false)}>

      {!isOwn && showAvatar && (
        <Avatar user={message.sender} size={30} className="msg-avatar" />
      )}

      <div className="msg-group">
        {!isOwn && showAvatar && (
          <span className="msg-sender">{message.sender?.name}</span>
        )}

        {message.replyTo && (
          <div className="msg-reply">
            <span className="msg-reply-sender">{message.replyTo.sender?.name}</span>
            <span className="msg-reply-text">{message.replyTo.content || '[Медиа]'}</span>
          </div>
        )}

        {/* МЕДИА КӨРСЕТКІШ */}
        <MediaViewer message={message} isOwn={isOwn} />

        {/* МӘТІН ҚАБЫҒЫ */}
        {message.content && message.type === 'TEXT' && (
          <div className={`msg-bubble ${isOwn ? 'own' : 'other'} ${message.deleted ? 'deleted' : ''}`}>
            {message.deleted
              ? <span className="msg-deleted">🚫 Хабарлама өшірілді</span>
              : <span className="msg-text">{message.content}</span>
            }
            <span className="msg-time">
              {formatMessageTime(message.createdAt)}
              {message.editedAt && ' ✎'}
            </span>
          </div>
        )}

        {/* IMAGE CAPTION ПУЗЫРЬ */}
        {message.content && message.type === 'IMAGE' && (
          <div className={`msg-bubble ${isOwn ? 'own' : 'other'}`}>
            <span className="msg-text">{message.content}</span>
            <span className="msg-time">{formatMessageTime(message.createdAt)}</span>
          </div>
        )}

        {/* Action buttons */}
        {!message.deleted && (
          <div className="msg-actions">
            {onReply && <button className="msg-action-btn" onClick={onReply} title="Жауап беру">↩</button>}
            {onDelete && <button className="msg-action-btn danger" onClick={onDelete} title="Өшіру">🗑</button>}
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
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1)

  let label
  if (sameDay(d, today)) label = 'Бүгін'
  else if (sameDay(d, yesterday)) label = 'Кеше'
  else label = d.toLocaleDateString('ru-RU', { day:'numeric', month:'long', year:'numeric' })

  return <div className="date-divider"><span>{label}</span></div>
}

// ── CHAT INFO PANEL ──
function ChatInfoPanel({ chat, user, onClose }) {
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
  return a.getFullYear()===b.getFullYear() && a.getMonth()===b.getMonth() && a.getDate()===b.getDate()
}