# SecureChat 💬 v2.0

Толыққанды мессенджер — Spring Boot + React + PostgreSQL + WebSocket

## Функциялар
- ✅ Тіркелу / Кіру (JWT)
- ✅ Жеке чаттар (нақты уақытта)
- ✅ Топтық чаттар (Owner / Admin / Member)
- ✅ Пайдаланушы іздеу (никнейм / email / телефон)
- ✅ Онлайн / офлайн статус
- ✅ Typing индикаторы
- ✅ Хабарламаға жауап беру
- ✅ Хабарлама өшіру
- ✅ 🔒 Жасырын чат (PIN-код)
- ✅ Профиль редакциялау
- ✅ Аватар жүктеу
- ✅ Баптаулар беті (профиль, тема, қауіпсіздік, хабарландырулар)
- ✅ Dark Mode / Light Mode
- ✅ Мобильді responsive дизайн
- ✅ Кез келген device-тан ашу

---

## 🚀 Mac-та іске қосу

### 1. Docker Desktop орнату
https://www.docker.com/products/docker-desktop/
→ "Download for Mac" → Chip түрін таңдау (Apple Silicon / Intel)
→ .dmg файлды ашу → Docker.app-ты Applications-ға апару
→ Docker іске қосу → "Engine running" белгісін күту

### 2. Terminal ашу (Command + Space → "Terminal")

### 3. Жоба папкасына өту
```bash
cd ~/Desktop/securechat2
```

### 4. Іске қосу (бірінші рет 5-10 минут)
```bash
docker-compose up --build
```

### 5. Браузерде ашу
http://localhost:3000

### 6. Тоқтату
```bash
Ctrl + C
docker-compose down
```

---

## 📱 Басқа device-тан ашу (телефон, планшет)

1. Mac-тың IP мекенжайын біл:
   - System Settings → Wi-Fi → Details → IP Address
   - немесе Terminal: `ipconfig getifaddr en0`

2. Телефонда браузер ашып: `http://192.168.x.x:3000`
   (192.168.x.x орнына Mac-тың IP мекенжайын жаз)

> ⚠️ Mac пен телефон бір Wi-Fi желісінде болуы керек!

---

## 📁 Жоба құрылымы

```
securechat2/
├── backend/
│   ├── src/main/java/com/securechat/
│   │   ├── config/          ← Security, WebSocket, CORS баптаулары
│   │   ├── controller/      ← REST API + WebSocket контроллерлері
│   │   ├── dto/             ← Request/Response объектілері
│   │   ├── entity/          ← Database кестелері
│   │   ├── repository/      ← Database сұраныстары (JPA)
│   │   ├── security/        ← JWT логикасы
│   │   ├── service/         ← Бизнес логика
│   │   └── websocket/       ← WebSocket оқиға тыңдаушылар
│   ├── src/main/resources/
│   │   └── application.properties
│   ├── pom.xml
│   └── Dockerfile
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── auth/        ← Тіркелу/кіру формалары
│   │   │   ├── chat/        ← ChatWindow, PinModal, NewChatModal
│   │   │   ├── sidebar/     ← Sidebar, ChatItem
│   │   │   ├── settings/    ← SettingsPage (профиль, тема, PIN, т.б.)
│   │   │   └── common/      ← Avatar, Toast
│   │   ├── context/         ← AuthContext, ThemeContext
│   │   ├── hooks/           ← useWebSocket
│   │   ├── pages/           ← MainLayout
│   │   ├── services/        ← api.js, websocket.js
│   │   ├── store/           ← chatStore (Zustand)
│   │   └── utils/           ← helpers.js
│   ├── nginx.conf
│   ├── Dockerfile
│   └── package.json
│
├── docker-compose.yml
└── README.md
```

---

## 🔑 API эндпоинттері

| Метод | URL | Auth | Мақсаты |
|-------|-----|------|---------|
| POST | /api/auth/register | - | Тіркелу |
| POST | /api/auth/login | - | Кіру |
| GET | /api/users/me | JWT | Өз профилі |
| PATCH | /api/users/me | JWT | Профильді жаңарту |
| POST | /api/users/me/avatar | JWT | Аватар жүктеу |
| POST | /api/users/me/password | JWT | Құпия сөз өзгерту |
| GET | /api/users/search?query= | JWT | Пайдаланушы іздеу |
| GET | /api/chats | JWT | Чаттар тізімі |
| POST | /api/chats | JWT | Жаңа чат/топ |
| GET | /api/chats/{id}/messages | JWT | Хабарлама тарихы |
| POST | /api/chats/{id}/members | JWT | Мүше қосу |
| DELETE | /api/chats/{id}/members/{uid} | JWT | Мүшені шығару |
| POST | /api/chats/{id}/pin | JWT | PIN орнату |
| POST | /api/chats/{id}/verify-pin | JWT | PIN тексеру |
| WS | /ws | JWT header | WebSocket |

---

## 🌐 WebSocket оқиғалары

| Оқиға | Арна | Сипаттама |
|-------|------|-----------|
| NEW_MESSAGE | /topic/chat/{id} | Жаңа хабарлама |
| DELETE_MESSAGE | /topic/chat/{id} | Хабарлама өшірілді |
| TYPING | /topic/chat/{id} | Пайдаланушы жазуда |
| ONLINE_STATUS | /topic/online | Онлайн/офлайн |
