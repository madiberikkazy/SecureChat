import { useState, useEffect, useRef, useCallback } from 'react'
import { chatAPI, messageAPI } from '../../services/api'
import { wsService } from '../../services/websocket'
import useChatStore from '../../store/chatStore'
import { useAuth } from '../../context/AuthContext'
import { useLang } from '../../context/LanguageContext'
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
  const { t } = useLang()
  const {
    selectedChatId, chats, messages, setMessages, addMessage,
    typingUsers, isChatUnlocked, unlockChat, clearUnread, upsertChat, removeChat,
  } = useChatStore()
  const toast = useToast()

  const chat        = chats.find(c => c.id === selectedChatId)
  const chatMessages = messages[selectedChatId] || []
  const typingSet    = typingUsers[selectedChatId] || new Set()

  const [input,          setInput]          = useState('')
  const [loading,        setLoading]        = useState(false)
  const [sending,        setSending]        = useState(false)
  const [showPin,        setShowPin]        = useState(false)
  const [pinMode,        setPinMode]        = useState('verify')  // 'set' | 'verify' | 'recover'
  const [showInfo,       setShowInfo]       = useState(false)
  const [replyTo,        setReplyTo]        = useState(null)
  const [editingMsg,     setEditingMsg]     = useState(null)   // { id, content }
  const [showAudioRec,   setShowAudioRec]   = useState(false)
  const [imageFile,      setImageFile]      = useState(null)
  const [imageCaption,   setImageCaption]   = useState('')
  const [uploadingMedia, setUploadingMedia] = useState(false)

  const bottomRef   = useRef(null)
  const inputRef    = useRef(null)
  const typingTimer = useRef(null)
  const fileInputRef = useRef(null)

  useChatWebSocket(selectedChatId)

  // PIN recover event listener
  useEffect(() => {
    const handler = (e) => {
      if (e.detail?.chatId === selectedChatId) {
        setPinMode('recover')
        setShowPin(true)
      }
    }
    window.addEventListener('openPinRecover', handler)
    return () => window.removeEventListener('openPinRecover', handler)
  }, [selectedChatId])

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
      .catch(() => toast.error(t('failLoadMessages')))
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
      toast.error(t('failSend'))
      setInput(content)
    } finally { setSending(false) }
  }, [input, selectedChatId, replyTo, sending])

  // ===== ХАБАРЛАМАНЫ ӨҢДЕУ =====
  const handleEditSubmit = useCallback(async () => {
    if (!editingMsg || !input.trim()) return
    setSending(true)
    try {
      await messageAPI.edit(editingMsg.id, { content: input.trim() })
      // EDIT_MESSAGE WS event через useWebSocket сам обновит store
    } catch {
      toast.error(t('failEdit'))
    } finally {
      setSending(false)
      setEditingMsg(null)
      setInput('')
    }
  }, [editingMsg, input])

  const startEdit = (msg) => {
    setEditingMsg(msg)
    setInput(msg.content)
    setReplyTo(null)
    inputRef.current?.focus()
  }

  const cancelEdit = () => {
    setEditingMsg(null)
    setInput('')
  }

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
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      })
      if (!res.ok) throw new Error()
      const data = await res.json()
      addMessage(selectedChatId, data)
      setImageFile(null)
      setImageCaption('')
      setReplyTo(null)
    } catch {
      toast.error(t('failSendImage'))
    } finally { setUploadingMedia(false) }
  }, [selectedChatId, imageCaption, replyTo])

  // ===== ДЫБЫС ЖІБЕРУ =====
  const handleSendVoice = useCallback(async (audioBlob) => {
    setShowAudioRec(false)
    setUploadingMedia(true)
    try {
      const formData = new FormData()
      formData.append('chatId', selectedChatId)
      formData.append('file', audioBlob, 'voice.webm')
      if (replyTo) formData.append('replyToId', replyTo.id)

      const token = localStorage.getItem('token')
      const res = await fetch('/api/messages/voice', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      })
      if (!res.ok) throw new Error()
      const data = await res.json()
      addMessage(selectedChatId, data)
      setReplyTo(null)
    } catch {
      toast.error(t('failSendVoice'))
    } finally { setUploadingMedia(false) }
  }, [selectedChatId, replyTo])

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      editingMsg ? handleEditSubmit() : handleSend()
    }
    if (e.key === 'Escape' && editingMsg) cancelEdit()
  }

  const handleDelete = async (msgId) => {
    try { await messageAPI.delete(msgId) }
    catch { toast.error(t('failDelete')) }
  }

  if (!chat) return null

  // ===== ЖАСЫРЫН ЧАТ =====
  const isLocked = chat.hidden && !isChatUnlocked(selectedChatId)
  if (isLocked) return (
    <div className="chat-locked">
      <div className="locked-content">
        <div className="locked-icon-wrap">🔒</div>
        <h3>{t('hiddenChat')}</h3>
        <p>{t('hiddenChatDesc')}</p>
        <button className="btn btn-primary btn-lg" onClick={() => { setPinMode('verify'); setShowPin(true) }}>
          {t('enterPin')}
        </button>
      </div>
      {showPin && (
        <PinModal
          chatId={selectedChatId}
          mode={pinMode}
          onClose={() => setShowPin(false)}
        />
      )}
    </div>
  )

  const chatName  = getChatName(chat, user)
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
                ? <span className="typing-status">✏️ {t('typing')}</span>
                : chat.type === 'GROUP'
                  ? `${chat.members?.length || 0} ${t('members')}`
                  : formatLastSeen(otherUser?.lastSeen, otherUser?.online)}
            </div>
          </div>
        </div>

        <div className="chat-header-actions">
          {!chat.hidden
            ? (
              <button className="btn-icon header-btn" title={t('setPinTitle')}
                onClick={() => { setPinMode('set'); setShowPin(true) }}>
                🔒
              </button>
            )
            : (
              <button className="btn-icon header-btn" title={t('removePinTitle')}
                onClick={async () => {
                  await chatAPI.removePin(selectedChatId)
                  upsertChat({ ...chat, hidden: false })
                  toast.success(t('hiddenChatRemoved'))
                }}>
                🔓
              </button>
            )
          }
          <button className="btn-icon header-btn" title={t('chatInfo')}
            onClick={() => setShowInfo(v => !v)}>
            ℹ️
          </button>
        </div>
      </div>

      {/* ── INFO PANEL ── */}
      {showInfo && (
        <ChatInfoPanel
          chat={chat}
          currentUser={user}
          onClose={() => setShowInfo(false)}
          onChatDeleted={() => { removeChat(chat.id); setShowInfo(false) }}
          onChatUpdated={(updated) => upsertChat(updated)}
        />
      )}

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
                <p>{t('noMessagesHint')}</p>
              </div>
            )
            : chatMessages.map((msg, i) => {
                const isOwn        = msg.sender?.id === user?.id
                const showDate     = i === 0 || !sameDay(chatMessages[i - 1]?.createdAt, msg.createdAt)
                const showSenderName = !isOwn && chat.type === 'GROUP'
                  && (i === 0 || chatMessages[i - 1]?.sender?.id !== msg.sender?.id)

                return (
                  <div key={msg.id}>
                    {showDate && <DateDivider date={msg.createdAt} t={t} />}
                    <MessageBubble
                      message={msg}
                      isOwn={isOwn}
                      showSenderName={showSenderName}
                      onReply={() => { setReplyTo(msg); setEditingMsg(null) }}
                      onDelete={isOwn && !msg.deleted ? () => handleDelete(msg.id) : null}
                      onEdit={isOwn && !msg.deleted && msg.type === 'TEXT'
                        ? () => startEdit(msg)
                        : null}
                      t={t}
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
          <span>{typingList.join(', ')} {t('typing')}</span>
        </div>
      )}

      {/* ── AUDIO RECORDER ── */}
      {showAudioRec && (
        <AudioRecorder
          onRecordingComplete={handleSendVoice}
          onCancel={() => setShowAudioRec(false)}
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
              placeholder={t('addCaption')}
              value={imageCaption}
              onChange={e => setImageCaption(e.target.value)}
            />
            <div className="image-upload-actions">
              <button className="btn btn-ghost btn-sm"
                onClick={() => { setImageFile(null); setImageCaption('') }}>
                ✕ {t('cancel')}
              </button>
              <button className="btn btn-primary btn-sm"
                onClick={() => handleSendImage(imageFile)}
                disabled={uploadingMedia}>
                {uploadingMedia
                  ? <><span className="spinner" style={{ width: 14, height: 14 }} /> {t('sending')}</>
                  : `➤ ${t('send')}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── EDIT / REPLY PREVIEW ── */}
      {editingMsg && (
        <div className="reply-preview">
          <div className="reply-bar" style={{ background: 'var(--color-accent)' }} />
          <div className="reply-content">
            <span className="reply-sender">{t('editingMessage')}</span>
            <span className="reply-text">{editingMsg.content}</span>
          </div>
          <button className="btn-icon" onClick={cancelEdit}>✕</button>
        </div>
      )}
      {replyTo && !editingMsg && (
        <div className="reply-preview">
          <div className="reply-bar" />
          <div className="reply-content">
            <span className="reply-sender">{replyTo.sender?.name}</span>
            <span className="reply-text">{replyTo.content || t('media')}</span>
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
          onChange={e => {
            const file = e.target.files?.[0]
            if (file) setImageFile(file)
            e.target.value = ''
          }}
        />
        <button className="toolbar-btn"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploadingMedia || !!imageFile}
          title={t('sendImage')}>
          📷
        </button>
        <button className={`toolbar-btn ${showAudioRec ? 'active' : ''}`}
          onClick={() => setShowAudioRec(v => !v)}
          disabled={uploadingMedia}
          title={t('sendVoice')}>
          🎤
        </button>
      </div>

      {/* ── INPUT ── */}
      <div className="chat-input-bar">
        <textarea
          ref={inputRef}
          className="chat-textarea"
          placeholder={t('typeMessage')}
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
          onClick={editingMsg ? handleEditSubmit : handleSend}
          disabled={!input.trim() || sending || uploadingMedia}
        >
          {sending || uploadingMedia
            ? <span className="spinner" style={{ width: 18, height: 18 }} />
            : editingMsg
              ? <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>
              : <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
          }
        </button>
      </div>

      {/* ── PIN MODAL ── */}
      {showPin && (
        <PinModal
          chatId={selectedChatId}
          mode={pinMode}
          onClose={() => setShowPin(false)}
        />
      )}
    </div>
  )
}

// ── MESSAGE BUBBLE ──
function MessageBubble({ message, isOwn, showSenderName, onReply, onDelete, onEdit, t }) {
  const isMedia = message.type === 'IMAGE' || message.type === 'VOICE' || message.type === 'FILE'
  const isText  = !message.type || message.type === 'TEXT'

  return (
    <div className={`msg-wrapper ${isOwn ? 'own' : 'other'}`}>
      <div className="msg-group">

        {showSenderName && (
          <span className="msg-sender-name">{message.sender?.name}</span>
        )}

        {message.replyTo && (
          <div className={`msg-reply-block ${isOwn ? 'own' : ''}`}>
            <span className="msg-reply-sender">{message.replyTo.sender?.name}</span>
            <span className="msg-reply-text">{message.replyTo.content || t('media')}</span>
          </div>
        )}

        {/* МЕДИА */}
        {isMedia && !message.deleted && (
          <div className={`msg-media-container ${isOwn ? 'own' : 'other'}`}>
            <MediaViewer message={message} isOwn={isOwn} />
            <span className="msg-time-media">{formatMessageTime(message.createdAt)}</span>
          </div>
        )}

        {/* МӘТІН */}
        {(isText || message.deleted) && (
          <div className={`msg-bubble ${isOwn ? 'own' : 'other'} ${message.deleted ? 'deleted' : ''}`}>
            {message.deleted
              ? <span className="msg-deleted">{t('msgDeleted')}</span>
              : <span className="msg-text">{message.content}</span>
            }
            <div className="msg-meta">
              {message.editedAt && !message.deleted && (
                <span className="msg-edited">✎</span>
              )}
              <span className="msg-time">{formatMessageTime(message.createdAt)}</span>
              {isOwn && !message.deleted && (
                <span
                  className={`msg-read-tick ${message.read ? 'read' : ''}`}
                  title={message.read ? t('read') : t('delivered')}
                >
                  {message.read ? t('readTick') : t('deliveredTick')}
                </span>
              )}
            </div>
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
              <button className="msg-action-btn" onClick={onReply} title={t('reply')}>↩</button>
            )}
            {onEdit && (
              <button className="msg-action-btn" onClick={onEdit} title={t('editMessage')}>✏️</button>
            )}
            {onDelete && (
              <button className="msg-action-btn danger" onClick={onDelete} title={t('deleteMessage')}>🗑</button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ── DATE DIVIDER ──
function DateDivider({ date, t }) {
  const d         = new Date(date)
  const today     = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)

  let label
  if (sameDay(d, today))     label = t('today')
  else if (sameDay(d, yesterday)) label = t('yesterday')
  else label = d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })

  return <div className="date-divider"><span>{label}</span></div>
}

// ── CHAT INFO PANEL ──
function ChatInfoPanel({ chat, currentUser, onClose, onChatDeleted, onChatUpdated }) {
  const { t } = useLang()
  const toast  = useToast()

  const myRole  = chat.members?.find(m => m.user?.id === currentUser?.id)?.role
  const isOwner = myRole === 'OWNER'

  const handleLeave = async () => {
    if (!window.confirm(t('leaveConfirm'))) return
    try {
      await chatAPI.removeMember(chat.id, currentUser.id)
      onChatDeleted()
    } catch (err) {
      toast.error(err.response?.data?.error || t('failLeave'))
    }
  }

  const handleDelete = async () => {
    if (!window.confirm(t('deleteConfirm'))) return
    try {
      await chatAPI.delete(chat.id)
      onChatDeleted()
    } catch (err) {
      toast.error(err.response?.data?.error || t('failDeleteChat'))
    }
  }

  const handleRoleChange = async (member) => {
    const newRole = member.role === 'ADMIN' ? 'MEMBER' : 'ADMIN'
    try {
      const res = await chatAPI.changeMemberRole(chat.id, member.user.id, { role: newRole })
      onChatUpdated(res.data)
    } catch (err) {
      toast.error(err.response?.data?.error || t('failRoleChange'))
    }
  }

  const roleLabel = (role) => {
    if (role === 'OWNER')  return t('roleOwner')
    if (role === 'ADMIN')  return t('roleAdmin')
    return t('roleMember')
  }

  return (
    <div className="info-panel">
      <div className="info-panel-header">
        <span>{chat.type === 'GROUP' ? t('groupInfo') : t('profileInfo')}</span>
        <button className="btn-icon" onClick={onClose}>✕</button>
      </div>
      <div className="info-panel-body">
        {chat.description && <p className="info-description">{chat.description}</p>}

        <div className="info-members">
          <h4>{t('membersCount')} ({chat.members?.length || 0})</h4>
          {chat.members?.map(m => (
            <div key={m.id} className="info-member">
              <Avatar user={m.user} size={34} showOnline />
              <div style={{ flex: 1 }}>
                <span className="info-member-name">{m.user?.name}</span>
                <span className="info-member-role">{roleLabel(m.role)}</span>
              </div>
              {/* Owner-ға мүше рөлін өзгерту */}
              {isOwner && m.user?.id !== currentUser?.id && m.role !== 'OWNER' && (
                <button
                  className="btn btn-ghost btn-xs"
                  title={m.role === 'ADMIN' ? t('demoteAdmin') : t('promoteAdmin')}
                  onClick={() => handleRoleChange(m)}
                >
                  {m.role === 'ADMIN' ? '👤' : '🛡'}
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Шығу / жою */}
        {chat.type === 'GROUP' && (
          <div className="info-panel-actions">
            {!isOwner && (
              <button className="btn btn-ghost" style={{ color: 'var(--color-error)' }}
                onClick={handleLeave}>
                {t('leaveGroup')}
              </button>
            )}
            {isOwner && (
              <button className="btn btn-danger" onClick={handleDelete}>
                {t('deleteGroup')}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function sameDay(d1, d2) {
  const a = new Date(d1), b = new Date(d2)
  return a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate()
}
