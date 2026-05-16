import { useState, useRef, useEffect } from 'react'
import './AudioRecorder.css'

export default function AudioRecorder({ onRecordingComplete, onCancel }) {
  const [isRecording, setIsRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [audioBlob, setAudioBlob] = useState(null)
  const [audioUrl, setAudioUrl]   = useState(null)
  const [isPlaying, setIsPlaying] = useState(false)

  const mediaRecorderRef = useRef(null)
  const audioChunksRef   = useRef([])
  const timerRef         = useRef(null)
  const audioRef         = useRef(null)

  useEffect(() => {
    return () => {
      clearInterval(timerRef.current)
      if (mediaRecorderRef.current?.state === 'recording') {
        mediaRecorderRef.current.stop()
      }
      if (audioUrl) URL.revokeObjectURL(audioUrl)
    }
  }, [])

  // ===== ЖАЗУДЫ БАСТАУ =====
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })

      // Браузер қолдайтын mime type-ты анықтаймыз
      const mimeType = getSupportedMimeType()
      const options  = mimeType ? { mimeType } : {}
      const recorder = new MediaRecorder(stream, options)

      mediaRecorderRef.current = recorder
      audioChunksRef.current   = []

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data)
      }

      recorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, {
          type: mimeType || 'audio/webm'
        })
        const url = URL.createObjectURL(blob)
        setAudioBlob(blob)
        setAudioUrl(url)
        stream.getTracks().forEach(t => t.stop())
      }

      recorder.start(250) // 250ms chunk-тармен жаз
      setIsRecording(true)
      setRecordingTime(0)

      timerRef.current = setInterval(() => {
        setRecordingTime(prev => {
          if (prev >= 300) {
            stopRecording()
            return prev
          }
          return prev + 1
        })
      }, 1000)

    } catch (err) {
      if (err.name === 'NotAllowedError') {
        alert('Микрофон рұқсатын беріңіз (Settings → Privacy → Microphone)')
      } else {
        alert('Микрофонға қосылу мүмкін болмады: ' + err.message)
      }
    }
  }

  // ===== ЖАЗУДЫ ТОҚТАТУ =====
  const stopRecording = () => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop()
    }
    setIsRecording(false)
    clearInterval(timerRef.current)
  }

  // ===== ЖІБЕРУ =====
  const sendRecording = () => {
    if (audioBlob) onRecordingComplete(audioBlob)
  }

  // ===== БОЛДЫРМАУ =====
  const cancelRecording = () => {
    if (audioUrl) URL.revokeObjectURL(audioUrl)
    setAudioBlob(null)
    setAudioUrl(null)
    setRecordingTime(0)
    setIsPlaying(false)
    onCancel()
  }

  // ===== ТЫҢДАТУ =====
  const togglePlayback = () => {
    if (!audioRef.current) return
    if (isPlaying) {
      audioRef.current.pause()
    } else {
      audioRef.current.play()
    }
    setIsPlaying(!isPlaying)
  }

  const formatTime = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

  return (
    <div className="audio-recorder">
      {!audioBlob ? (
        /* ── ЖАЗУ РЕЖИМІ ── */
        <div className="recorder-controls">
          {!isRecording ? (
            <button className="rec-start-btn" onClick={startRecording}>
              <span className="rec-icon">🎙</span>
              <span>Жазуды бастау</span>
            </button>
          ) : (
            <div className="recording-active">
              <div className="recording-pulse-wrap">
                <span className="recording-pulse" />
                <span className="rec-live">● REC</span>
              </div>
              <span className="rec-timer">{formatTime(recordingTime)}</span>
              <button className="btn btn-danger btn-sm" onClick={stopRecording}>
                ⏹ Тоқтату
              </button>
            </div>
          )}
          <button className="btn btn-ghost btn-sm" onClick={cancelRecording}>
            ✕
          </button>
        </div>
      ) : (
        /* ── PLAYBACK РЕЖИМІ ── */
        <div className="playback-controls">
          <button className="play-btn" onClick={togglePlayback}>
            {isPlaying ? '⏸' : '▶'}
          </button>

          <audio
            ref={audioRef}
            src={audioUrl}
            onEnded={() => setIsPlaying(false)}
          />

          <div className="playback-info">
            <span className="playback-label">Жазылды</span>
            <span className="playback-time">{formatTime(recordingTime)}</span>
          </div>

          <div className="playback-actions">
            <button className="btn btn-ghost btn-sm" onClick={cancelRecording}>
              ✕ Жою
            </button>
            <button className="btn btn-primary btn-sm" onClick={sendRecording}>
              ➤ Жіберу
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// Браузер қолдайтын mime type-ты анықтаймыз
function getSupportedMimeType() {
  const types = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/ogg;codecs=opus',
    'audio/ogg',
    'audio/mp4',
  ]
  for (const type of types) {
    if (MediaRecorder.isTypeSupported(type)) return type
  }
  return null
}