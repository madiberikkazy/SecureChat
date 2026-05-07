import { useState, useRef, useEffect } from 'react'
import './AudioRecorder.css'

export default function AudioRecorder({ onRecordingComplete, onCancel }) {
  const [isRecording, setIsRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [audioBlob, setAudioBlob] = useState(null)
  const [isPlayback, setIsPlayback] = useState(false)

  const mediaRecorderRef = useRef(null)
  const audioContextRef = useRef(null)
  const audioChunksRef = useRef([])
  const timerRef = useRef(null)
  const audioElementRef = useRef(null)

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop()
      }
    }
  }, [])

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data)
      }

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        setAudioBlob(audioBlob)
        stream.getTracks().forEach(track => track.stop())
      }

      mediaRecorder.start()
      setIsRecording(true)
      setRecordingTime(0)

      // Таймер
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => {
          if (prev >= 300) { // 5 минут максимум
            mediaRecorder.stop()
            setIsRecording(false)
            return prev
          }
          return prev + 1
        })
      }, 1000)
    } catch (err) {
      console.error('Микрофон қосу қатесі:', err)
      alert('Микрофон құқығы берілмеген')
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
      clearInterval(timerRef.current)
    }
  }

  const sendRecording = () => {
    if (audioBlob) {
      onRecordingComplete(audioBlob)
    }
  }

  const cancelRecording = () => {
    setAudioBlob(null)
    setRecordingTime(0)
    setIsPlayback(false)
    onCancel()
  }

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="audio-recorder">
      {!audioBlob ? (
        // Запись
        <div className={`recorder-mode ${isRecording ? 'recording' : ''}`}>
          {isRecording && (
            <>
              <div className="recording-indicator">
                <span className="recording-pulse"></span>
                <span className="recording-time">{formatTime(recordingTime)}</span>
              </div>
              <button className="btn btn-danger btn-sm" onClick={stopRecording}>
                ⏹ Аяқтау
              </button>
            </>
          )}
          
          {!isRecording && recordingTime === 0 && (
            <>
              <button className="btn btn-primary btn-lg" onClick={startRecording}>
                🎤 Дыбыс жазу
              </button>
            </>
          )}
        </div>
      ) : (
        // Playback жөнеуі
        <div className="playback-mode">
          <div className="playback-controls">
            <button 
              className={`play-btn ${isPlayback ? 'playing' : ''}`}
              onClick={() => {
                if (isPlayback) {
                  audioElementRef.current?.pause()
                } else {
                  audioElementRef.current?.play()
                }
                setIsPlayback(!isPlayback)
              }}
            >
              {isPlayback ? '⏸' : '▶'}
            </button>
            <audio 
              ref={audioElementRef}
              src={URL.createObjectURL(audioBlob)}
              onEnded={() => setIsPlayback(false)}
              className="hidden-audio"
            />
            <span className="playback-time">{formatTime(recordingTime)}</span>
          </div>

          <div className="playback-actions">
            <button className="btn btn-ghost btn-sm" onClick={cancelRecording}>
              ✕ Орындықты таңда
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