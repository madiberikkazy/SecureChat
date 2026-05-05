import { useEffect, useState } from 'react'
import { chatAPI } from '../services/api'
import useChatStore from '../store/chatStore'
import { useToast } from '../components/common/Toast'
import Sidebar from '../components/sidebar/Sidebar'
import ChatWindow from '../components/chat/ChatWindow'
import './MainLayout.css'

export default function MainLayout() {
  const { setChats, selectedChatId, upsertChat } = useChatStore()
  const toast = useToast()
  const [loading, setLoading] = useState(true)
  const [mobileChatOpen, setMobileChatOpen] = useState(false)

  useEffect(() => {
    chatAPI.getAll()
      .then(res => setChats(res.data))
      .catch(() => toast.error('Чаттарды жүктеу мүмкін болмады'))
      .finally(() => setLoading(false))
  }, [])

  // Mobile: чат ашылғанда sidebar жасыру
  useEffect(() => {
    if (selectedChatId) setMobileChatOpen(true)
  }, [selectedChatId])

  return (
    <div className="main-layout">
      <div className={`sidebar-wrapper ${mobileChatOpen ? 'mobile-hidden' : ''}`}>
        {loading
          ? <div className="loading-screen"><span className="spinner" style={{width:32,height:32}} /></div>
          : <Sidebar />
        }
      </div>

      <div className={`chat-wrapper ${!selectedChatId ? 'no-chat' : ''} ${!mobileChatOpen ? 'mobile-hidden' : ''}`}>
        {selectedChatId
          ? <>
              {/* Mobile back button */}
              <button className="mobile-back-btn" onClick={() => { setMobileChatOpen(false) }}>
                ← Артқа
              </button>
              <ChatWindow />
            </>
          : <WelcomeScreen />
        }
      </div>
    </div>
  )
}

function WelcomeScreen() {
  return (
    <div className="welcome-screen">
      <div className="welcome-content">
        <div style={{ fontSize:80 }}>💬</div>
        <h2>SecureChat-қа қош келдіңіз!</h2>
        <p>Сол жақтан чат таңдаңыз немесе жаңа чат бастаңыз</p>
        <div className="welcome-features">
          {[['💬','Жеке хабарлама'],['👥','Топтық чат'],['🔒','Жасырын чат'],['⚡','Нақты уақыт']].map(([icon, label]) => (
            <div key={label} className="welcome-feature">
              <span>{icon}</span><span>{label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
