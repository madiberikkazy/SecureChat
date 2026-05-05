import { getInitials } from '../../utils/helpers'

export default function Avatar({ user, size = 40, showOnline = false, className = '' }) {
  const style = { width: size, height: size, fontSize: size * 0.35 }

  return (
    <div
      className={`avatar ${showOnline && user?.online ? 'avatar-online' : ''} ${className}`}
      style={style}
    >
      {user?.avatarUrl
        ? <img src={user.avatarUrl} alt={user?.name || ''} />
        : <span>{getInitials(user?.name || user?.username || '?')}</span>
      }
    </div>
  )
}
