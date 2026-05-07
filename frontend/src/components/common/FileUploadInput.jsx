import { useRef, useState } from 'react'
import './FileUploadInput.css'

export default function FileUploadInput({ onFileSelected, type = 'image', disabled = false }) {
  const fileInputRef = useRef(null)
  const [preview, setPreview] = useState(null)

  const accept = {
    image: 'image/jpeg,image/png,image/gif,image/webp',
    voice: 'audio/mpeg,audio/wav,audio/ogg,audio/webm,audio/mp4',
    file: '*'
  }[type] || '*'

  const label = {
    image: '📷 Сурет таңдау',
    voice: '🎤 Дыбыс таңдау',
    file: '📎 Файл таңдау'
  }[type] || 'Файл таңдау'

  const handleFileChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Preview
    if (type === 'image') {
      const reader = new FileReader()
      reader.onload = (e) => setPreview(e.target?.result)
      reader.readAsDataURL(file)
    }

    onFileSelected(file)
    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  return (
    <div className="file-upload-input">
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={handleFileChange}
        disabled={disabled}
        hidden
      />

      {preview && type === 'image' && (
        <div className="preview-container">
          <img src={preview} alt="Preview" className="preview-image" />
          <button 
            className="btn-remove-preview"
            onClick={() => {
              setPreview(null)
              if (fileInputRef.current) fileInputRef.current.value = ''
            }}
          >
            ✕
          </button>
        </div>
      )}

      <button
        className="btn btn-secondary btn-sm"
        onClick={() => fileInputRef.current?.click()}
        disabled={disabled || !!preview}
        type="button"
      >
        {label}
      </button>
    </div>
  )
}