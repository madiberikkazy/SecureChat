import axios from 'axios'

const BASE_URL = 'https://securechat-production-b7f9.up.railway.app/api'

const api = axios.create({ baseURL: BASE_URL })

api.interceptors.request.use(cfg => {
  const token = localStorage.getItem('token')
  if (token) cfg.headers.Authorization = `Bearer ${token}`
  return cfg
})

api.interceptors.response.use(
  r => r,
  err => {
    if (err.response?.status === 401) {
      localStorage.clear()
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

export const authAPI = {
  register:      d => api.post('/auth/register', d),
  login:         d => api.post('/auth/login', d),
  checkUsername: u => api.get('/auth/check-username', { params: { username: u } }),
}

export const userAPI = {
  getMe:          ()   => api.get('/users/me'),
  getById:        id   => api.get(`/users/${id}`),
  search:         q    => api.get(`/users/search?query=${encodeURIComponent(q)}`),
  updateProfile:  d    => api.patch('/users/me', d),
  uploadAvatar:   form => api.post('/users/me/avatar', form, { headers: { 'Content-Type': 'multipart/form-data' } }),
  deleteAvatar:   ()   => api.delete('/users/me/avatar'),
  changePassword: d    => api.post('/users/me/password', d),
  blockUser:      id   => api.post(`/users/${id}/block`),
  unblockUser:    id   => api.delete(`/users/${id}/block`),
  blockStatus:    id   => api.get(`/users/${id}/block-status`),
}

export const chatAPI = {
  getAll:            ()           => api.get('/chats'),
  getOne:            id           => api.get(`/chats/${id}`),
  create:            d            => api.post('/chats', d),
  update:            (id, d)      => api.patch(`/chats/${id}`, d),
  delete:            id           => api.delete(`/chats/${id}`),
  getMessages:       id           => api.get(`/chats/${id}/messages`),
  getPinnedMessages: id           => api.get(`/chats/${id}/pinned-messages`),
  addMember:         (id, d)      => api.post(`/chats/${id}/members`, d),
  removeMember:      (id, uid)    => api.delete(`/chats/${id}/members/${uid}`),
  changeMemberRole:  (id, uid, d) => api.patch(`/chats/${id}/members/${uid}/role`, d),
  setPin:            (id, pin)    => api.post(`/chats/${id}/pin`, { pin }),
  verifyPin:         (id, pin)    => api.post(`/chats/${id}/verify-pin`, { pin }),
  recoverPin:        (id, d)      => api.post(`/chats/${id}/pin/recover`, d),
  removePin:         id           => api.delete(`/chats/${id}/pin`),
  pinChat:           id           => api.post(`/chats/${id}/pin-chat`),
  unpinChat:         id           => api.delete(`/chats/${id}/pin-chat`),
  markRead:          (id, d)      => api.post(`/chats/${id}/read`, d),
  clearChat:         id           => api.delete(`/chats/${id}/messages`),
}

export const messageAPI = {
  send:      d        => api.post('/messages', d),
  edit:      (id, d)  => api.patch(`/messages/${id}`, d),
  pin:       id       => api.post(`/messages/${id}/pin`),
  unpin:     id       => api.delete(`/messages/${id}/pin`),
  forward:   d        => api.post('/messages/forward', d),
  sendImage: form     => api.post('/messages/image', form, { headers: { 'Content-Type': 'multipart/form-data' } }),
  sendVoice: form     => api.post('/messages/voice', form, { headers: { 'Content-Type': 'multipart/form-data' } }),
  sendFile:  form     => api.post('/messages/file',  form, { headers: { 'Content-Type': 'multipart/form-data' } }),
  delete:    id       => api.delete(`/messages/${id}`),
}

export default api
 
