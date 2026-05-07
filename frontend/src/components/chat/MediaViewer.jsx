import { useState } from 'react'
import './MediaViewer.css'

export default function MediaViewer({ message, isOwn }) {
  const [error, setError] = useState(false)

  if (!message.fileUrl) return null

  const isImage = message.type === 'IMAGE'
  const isVoice = message.type === 'VOICE'
  const isFile = message.type === 'FILE'

  return (
    <div className={`media-wrapper ${isOwn ? 'own' : 'other'}`}>
      {isImage && (
        <a href={message.fileUrl} target="_blank" rel="noopener noreferrer" className="media-link">
          {!error ? (
            <img 
              src={message.fileUrl} 
              alt="Сурет" 
              className="media-image"
              onError={() => setError(true)}
            />
          ) : (
            <div className="media-error">
              <span>🖼</span>
              <p>Сурет жүктелмеді</p>
            </div>
          )}
        </a>
      )}

      {isVoice && (
        <div className="voice-player">
          <audio controls className="voice-audio">
            <source src={message.fileUrl} type="audio/mpeg" />
            Ваш браузер не поддерживает аудио
          </audio>
        </div>
      )}

      {isFile && (
        <a href={message.fileUrl} download className="file-link">
          <span className="file-icon">📎</span>
          <div className="file-info">
            <span className="file-name">{message.content || 'Файл'}</span>
            <span className="file-size">Түсіру</span>
          </div>
          <span className="download-icon">⬇</span>
        </a>
      )}

      {message.content && isImage && (
        <p className="media-caption">{message.content}</p>
      )}
    </div>
  )
}