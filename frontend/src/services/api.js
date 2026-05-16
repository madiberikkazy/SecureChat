import axios from 'axios'

const api = axios.create({ baseURL: '/api' })

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
  register: d => api.post('/auth/register', d),
  login:    d => api.post('/auth/login', d),
}

export const userAPI = {
  getMe:          ()   => api.get('/users/me'),
  getById:        id   => api.get(`/users/${id}`),
  search:         q    => api.get(`/users/search?query=${encodeURIComponent(q)}`),
  updateProfile:  d    => api.patch('/users/me', d),
  uploadAvatar:   form => api.post('/users/me/avatar', form, { headers: { 'Content-Type': 'multipart/form-data' } }),
  deleteAvatar:   ()   => api.delete('/users/me/avatar'),
  changePassword: d    => api.post('/users/me/password', d),
}

export const chatAPI = {
  getAll:           ()           => api.get('/chats'),
  getOne:           id           => api.get(`/chats/${id}`),
  create:           d            => api.post('/chats', d),
  update:           (id, d)      => api.patch(`/chats/${id}`, d),
  delete:           id           => api.delete(`/chats/${id}`),
  getMessages:      id           => api.get(`/chats/${id}/messages`),
  addMember:        (id, d)      => api.post(`/chats/${id}/members`, d),
  removeMember:     (id, uid)    => api.delete(`/chats/${id}/members/${uid}`),
  changeMemberRole: (id, uid, d) => api.patch(`/chats/${id}/members/${uid}/role`, d),
  setPin:           (id, pin)    => api.post(`/chats/${id}/pin`, { pin }),
  verifyPin:        (id, pin)    => api.post(`/chats/${id}/verify-pin`, { pin }),
  recoverPin:       (id, d)      => api.post(`/chats/${id}/pin/recover`, d),
  removePin:        id           => api.delete(`/chats/${id}/pin`),
  markRead:         (id, d)      => api.post(`/chats/${id}/read`, d),
}

export const messageAPI = {
  send:      d        => api.post('/messages', d),
  edit:      (id, d)  => api.patch(`/messages/${id}`, d),
  sendImage: form     => api.post('/messages/image', form, { headers: { 'Content-Type': 'multipart/form-data' } }),
  sendVoice: form     => api.post('/messages/voice', form, { headers: { 'Content-Type': 'multipart/form-data' } }),
  sendFile:  form     => api.post('/messages/file',  form, { headers: { 'Content-Type': 'multipart/form-data' } }),
  delete:    id       => api.delete(`/messages/${id}`),
}

export default api
