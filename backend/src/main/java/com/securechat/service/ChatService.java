package com.securechat.service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import java.util.stream.Collectors;

import org.springframework.data.domain.PageRequest;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.securechat.dto.request.Requests.CreateChatRequest;
import com.securechat.dto.request.Requests.UpdateGroupRequest;
import com.securechat.dto.response.Responses.ChatDto;
import com.securechat.dto.response.Responses.MessageDto;
import com.securechat.entity.Chat;
import com.securechat.entity.ChatMember;
import com.securechat.entity.HiddenChat;
import com.securechat.entity.User;
import com.securechat.repository.ChatMemberRepository;
import com.securechat.repository.ChatRepository;
import com.securechat.repository.HiddenChatRepository;
import com.securechat.repository.MessageReadStatusRepository;
import com.securechat.repository.MessageRepository;
import com.securechat.repository.UserRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class ChatService {

    private final ChatRepository chatRepo;
    private final ChatMemberRepository memberRepo;
    private final MessageRepository messageRepo;
    private final MessageReadStatusRepository readStatusRepo;
    private final HiddenChatRepository hiddenRepo;
    private final UserRepository userRepo;
    private final PasswordEncoder encoder;
    private final MapperService mapper;

    // ===== БАРЛЫҚ ЧАТТАРДЫ АЛУ =====
    public List<ChatDto> getUserChats(User user) {
        return chatRepo.findAllByUserId(user.getId())
                .stream()
                .map(chat -> {
                    try {
                        return buildChatDto(chat, user);
                    } catch (Exception e) {
                        return null;
                    }
                })
                .filter(Objects::nonNull)
                .collect(Collectors.toList());
    }

    // ===== ЖЕКЕ ЧАТТЫ АЛУ =====
    public ChatDto getChat(Long chatId, User user) {
        Chat chat = chatRepo.findById(chatId)
                .orElseThrow(() -> new RuntimeException("Чат табылмады"));
        assertMember(chatId, user.getId());
        return buildChatDto(chat, user);
    }

    // ===== ЧАТТЫҢ ХАБАРЛАМАЛАРЫН АЛУ (read статусымен) =====
    public List<MessageDto> getMessages(Long chatId, User user) {
        assertMember(chatId, user.getId());
        return messageRepo.findByChatIdOrderByCreatedAtAsc(chatId)
                .stream()
                .map(msg -> mapper.toMessageDto(msg, user.getId()))
                .collect(Collectors.toList());
    }

    // ===== БЕКІТІЛГЕН ХАБАРЛАМАЛАРДЫ АЛУ =====
    public List<MessageDto> getPinnedMessages(Long chatId, User user) {
        assertMember(chatId, user.getId());
        return messageRepo.findByChatIdAndPinnedTrueOrderByPinnedAtDesc(chatId)
                .stream()
                .map(msg -> mapper.toMessageDto(msg, user.getId()))
                .collect(Collectors.toList());
    }

    // ===== ЖАС ЧАТ НЕМЕСЕ ТОП ҚҰРУ =====
    @Transactional
    public ChatDto createChat(CreateChatRequest req, User creator) {
        Chat.ChatType type = Chat.ChatType.valueOf(req.getType().toUpperCase());

        if (type == Chat.ChatType.PRIVATE && req.getMemberIds().size() == 1) {
            Long otherId = req.getMemberIds().get(0);
            Optional<Chat> existing = chatRepo.findPrivateChat(creator.getId(), otherId);
            if (existing.isPresent()) return buildChatDto(existing.get(), creator);
        }

        Chat chat = Chat.builder()
                .type(type)
                .name(req.getName())
                .description(req.getDescription())
                .build();
        chatRepo.save(chat);

        addMember(chat, creator, ChatMember.Role.OWNER);

        for (Long uid : req.getMemberIds()) {
            if (!uid.equals(creator.getId())) {
                User member = userRepo.findById(uid)
                        .orElseThrow(() -> new RuntimeException("Пайдаланушы табылмады: " + uid));
                addMember(chat, member, ChatMember.Role.MEMBER);
            }
        }

        return buildChatDto(chat, creator);
    }

    // ===== ТОПҚА МҮШЕ ҚОС =====
    @Transactional
    public ChatDto addMemberToGroup(Long chatId, Long userId, User requester) {
        Chat chat = chatRepo.findById(chatId)
                .orElseThrow(() -> new RuntimeException("Чат табылмады"));

        if (chat.getType() != Chat.ChatType.GROUP)
            throw new RuntimeException("Бұл топтық чат емес");

        ChatMember reqMember = memberRepo.findByChatIdAndUserId(chatId, requester.getId())
                .orElseThrow(() -> new RuntimeException("Рұқсат жоқ"));
        if (reqMember.getRole() == ChatMember.Role.MEMBER)
            throw new RuntimeException("Мүше қосу рұқсаты жоқ");

        if (memberRepo.existsByChatIdAndUserIdAndActiveTrue(chatId, userId))
            throw new RuntimeException("Бұл пайдаланушы топта бұрыннан бар");

        User newMember = userRepo.findById(userId)
                .orElseThrow(() -> new RuntimeException("Пайдаланушы табылмады"));

        Optional<ChatMember> existing = memberRepo.findByChatIdAndUserId(chatId, userId);
        if (existing.isPresent()) {
            existing.get().setActive(true);
            existing.get().setLeftAt(null);
            memberRepo.save(existing.get());
        } else {
            addMember(chat, newMember, ChatMember.Role.MEMBER);
        }

        return buildChatDto(chatRepo.findById(chatId).get(), requester);
    }

    // ===== ТОПТАН МҮШЕНІ ШЫҒАРУ =====
    @Transactional
    public void removeMemberFromGroup(Long chatId, Long userId, User requester) {
        ChatMember reqMember = memberRepo.findByChatIdAndUserId(chatId, requester.getId())
                .orElseThrow(() -> new RuntimeException("Рұқсат жоқ"));

        if (reqMember.getRole() == ChatMember.Role.MEMBER && !requester.getId().equals(userId))
            throw new RuntimeException("Мүшені шығару рұқсаты жоқ");

        ChatMember target = memberRepo.findByChatIdAndUserId(chatId, userId)
                .orElseThrow(() -> new RuntimeException("Мүше табылмады"));

        target.setActive(false);
        target.setLeftAt(LocalDateTime.now());
        memberRepo.save(target);
    }

    // ===== ТОП АҚПАРАТЫН ЖАҢАРТУ =====
    @Transactional
    public ChatDto updateGroup(Long chatId, UpdateGroupRequest req, User requester) {
        Chat chat = chatRepo.findById(chatId)
                .orElseThrow(() -> new RuntimeException("Чат табылмады"));

        ChatMember member = memberRepo.findByChatIdAndUserId(chatId, requester.getId())
                .orElseThrow(() -> new RuntimeException("Рұқсат жоқ"));

        if (member.getRole() == ChatMember.Role.MEMBER)
            throw new RuntimeException("Топ ақпаратын өзгерту рұқсаты жоқ");

        if (req.getName() != null && !req.getName().isBlank())
            chat.setName(req.getName().trim());
        if (req.getDescription() != null)
            chat.setDescription(req.getDescription().trim());

        chatRepo.save(chat);
        return buildChatDto(chat, requester);
    }

    // ===== ЧАТТЫ ЖОЮ =====
    // GROUP: тек Owner жоя алады (барлық мүшелер үшін)
    // PRIVATE: кез-келген мүше өзінің жағынан шыға алады
    @Transactional
    public void deleteChat(Long chatId, User requester) {
        Chat chat = chatRepo.findById(chatId)
                .orElseThrow(() -> new RuntimeException("Чат табылмады"));

        ChatMember member = memberRepo.findByChatIdAndUserId(chatId, requester.getId())
                .orElseThrow(() -> new RuntimeException("Рұқсат жоқ"));

        if (chat.getType() == Chat.ChatType.GROUP) {
            // Топ — тек Owner жоя алады
            if (member.getRole() != ChatMember.Role.OWNER)
                throw new RuntimeException("Тек топ иесі жоя алады");
            chatRepo.delete(chat);
        } else {
            // Жеке чат — пайдаланушы өз жағынан шығады (deactivate)
            member.setActive(false);
            member.setLeftAt(LocalDateTime.now());
            memberRepo.save(member);
        }
    }

    // ===== ЧАТТЫ БЕКІТУ (PIN CHAT) =====
    @Transactional
    public void pinChat(Long chatId, User user) {
        ChatMember member = memberRepo.findByChatIdAndUserId(chatId, user.getId())
                .orElseThrow(() -> new RuntimeException("Сіз бұл чатта мүше емессіз"));
        member.setPinnedAt(LocalDateTime.now());
        memberRepo.save(member);
    }

    // ===== ЧАТТЫҢ БЕКІТУІН АЛУ (UNPIN CHAT) =====
    @Transactional
    public void unpinChat(Long chatId, User user) {
        ChatMember member = memberRepo.findByChatIdAndUserId(chatId, user.getId())
                .orElseThrow(() -> new RuntimeException("Сіз бұл чатта мүше емессіз"));
        member.setPinnedAt(null);
        memberRepo.save(member);
    }

    // ===== ЖАСЫРЫН ЧАТ PIN ОРНАТУ =====
    @Transactional
    public void setPin(Long chatId, String pin, User user) {
        assertMember(chatId, user.getId());
        if (pin == null || !pin.matches("\\d{4,6}"))
            throw new RuntimeException("PIN-код тек 4-6 цифрдан тұруы керек");

        Chat chat = chatRepo.findById(chatId)
                .orElseThrow(() -> new RuntimeException("Чат табылмады"));

        Optional<HiddenChat> existing = hiddenRepo.findByChatIdAndUserId(chatId, user.getId());
        if (existing.isPresent()) {
            existing.get().setPinHash(encoder.encode(pin));
            hiddenRepo.save(existing.get());
        } else {
            hiddenRepo.save(HiddenChat.builder()
                    .chat(chat).user(user)
                    .pinHash(encoder.encode(pin))
                    .build());
        }
    }

    // ===== PIN ТЕКСЕРУ =====
    public boolean verifyPin(Long chatId, String pin, User user) {
        return hiddenRepo.findByChatIdAndUserId(chatId, user.getId())
                .map(h -> encoder.matches(pin, h.getPinHash()))
                .orElseThrow(() -> new RuntimeException("Жасырын чат табылмады"));
    }

    // ===== PIN-КОДТЫ НЕГІЗГІ ҚҰПИЯ СӨЗ АРҚЫЛЫ ҚАЛПЫНА КЕЛТІРУ =====
    @Transactional
    public void recoverPin(Long chatId, String password, String newPin, User user) {
        assertMember(chatId, user.getId());

        if (!encoder.matches(password, user.getPasswordHash()))
            throw new RuntimeException("Негізгі құпия сөз дұрыс емес");

        if (newPin == null || !newPin.matches("\\d{4,6}"))
            throw new RuntimeException("Жаңа PIN-код тек 4-6 цифрдан тұруы керек");

        Chat chat = chatRepo.findById(chatId)
                .orElseThrow(() -> new RuntimeException("Чат табылмады"));

        Optional<HiddenChat> existing = hiddenRepo.findByChatIdAndUserId(chatId, user.getId());
        if (existing.isPresent()) {
            existing.get().setPinHash(encoder.encode(newPin));
            hiddenRepo.save(existing.get());
        } else {
            hiddenRepo.save(HiddenChat.builder()
                    .chat(chat).user(user)
                    .pinHash(encoder.encode(newPin))
                    .build());
        }
    }

    // ===== ЖАСЫРЫН РЕЖИМДІ АЛЫП ТАСТАУ =====
    @Transactional
    public void removePin(Long chatId, User user) {
        assertMember(chatId, user.getId());
        hiddenRepo.deleteByChatIdAndUserId(chatId, user.getId());
    }

    // ===== МҮШЕ РӨЛІН ӨЗГЕРТУ (тек Owner) =====
    @Transactional
    public ChatDto changeMemberRole(Long chatId, Long targetUserId, String newRole, User requester) {
        ChatMember reqMember = memberRepo.findByChatIdAndUserId(chatId, requester.getId())
                .orElseThrow(() -> new RuntimeException("Рұқсат жоқ"));

        if (reqMember.getRole() != ChatMember.Role.OWNER)
            throw new RuntimeException("Тек топ иесі рөлдерді өзгерте алады");

        ChatMember.Role role;
        try {
            role = ChatMember.Role.valueOf(newRole.toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new RuntimeException("Жарамсыз рөл: " + newRole);
        }

        if (role == ChatMember.Role.OWNER)
            throw new RuntimeException("Owner рөлін тағайындауға болмайды");

        ChatMember target = memberRepo.findByChatIdAndUserId(chatId, targetUserId)
                .orElseThrow(() -> new RuntimeException("Мүше табылмады"));

        if (!target.isActive())
            throw new RuntimeException("Мүше топта белсенді емес");

        target.setRole(role);
        memberRepo.save(target);

        return buildChatDto(chatRepo.findById(chatId).get(), requester);
    }

    // ===== ХАБАРЛАМА ОҚЫЛДЫ =====
    @Transactional
    public void markAsRead(Long chatId, Long messageId, User user) {
        assertMember(chatId, user.getId());
        messageRepo.findById(messageId).ifPresent(msg -> {
            if (!readStatusRepo.existsByMessageIdAndUserId(messageId, user.getId())) {
                readStatusRepo.save(
                        com.securechat.entity.MessageReadStatus.builder()
                                .message(msg).user(user).build()
                );
            }
        });
    }

    // ===== ChatDto ЖАСАУ =====
    private ChatDto buildChatDto(Chat chat, User currentUser) {
        List<ChatMember> members = memberRepo.findByChatIdAndActiveTrue(chat.getId());

        List<com.securechat.entity.Message> lastMsgs =
                messageRepo.findByChatIdOrderByCreatedAtDesc(chat.getId(), PageRequest.of(0, 1));
        MessageDto lastMsg = lastMsgs.isEmpty() ? null : mapper.toMessageDto(lastMsgs.get(0));

        LocalDateTime fallbackDate = LocalDateTime.of(2020, 1, 1, 0, 0);
        LocalDateTime userCreatedAt = currentUser.getCreatedAt() != null
                ? currentUser.getCreatedAt()
                : fallbackDate;

        long unread = 0;
        try {
            LocalDateTime lastRead = readStatusRepo
                    .findLastReadTime(chat.getId(), currentUser.getId())
                    .orElse(userCreatedAt);
            unread = messageRepo.countUnread(chat.getId(), currentUser.getId(), lastRead);
        } catch (Exception ignored) {}

        boolean hidden = hiddenRepo.existsByChatIdAndUserId(chat.getId(), currentUser.getId());

        // Ағымдағы пайдаланушының чат бекіту уақытын алу
        LocalDateTime pinnedAt = members.stream()
                .filter(m -> m.getUser().getId().equals(currentUser.getId()))
                .findFirst()
                .map(ChatMember::getPinnedAt)
                .orElse(null);

        return ChatDto.builder()
                .id(chat.getId())
                .type(chat.getType().name())
                .name(chat.getName())
                .description(chat.getDescription())
                .avatarUrl(chat.getAvatarUrl())
                .createdAt(chat.getCreatedAt())
                .lastMessageAt(chat.getLastMessageAt())
                .members(mapper.toChatMemberDtos(members))
                .lastMessage(lastMsg)
                .unreadCount(unread)
                .hidden(hidden)
                .pinnedAt(pinnedAt)
                .build();
    }

    private void addMember(Chat chat, User user, ChatMember.Role role) {
        memberRepo.save(ChatMember.builder()
                .chat(chat).user(user).role(role).build());
    }

    private void assertMember(Long chatId, Long userId) {
        if (!memberRepo.existsByChatIdAndUserIdAndActiveTrue(chatId, userId))
            throw new RuntimeException("Бұл чатқа кіруге рұқсат жоқ");
    }
}
