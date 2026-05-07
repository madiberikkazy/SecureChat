package com.securechat.service;

import com.securechat.dto.request.Requests.*;
import com.securechat.dto.response.Responses.*;
import com.securechat.entity.*;
import com.securechat.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

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
                .map(chat -> buildChatDto(chat, user))
                .collect(Collectors.toList());
    }

    // ===== ЖЕКЕ ЧАТТЫ АЛУ =====
    public ChatDto getChat(Long chatId, User user) {
        Chat chat = chatRepo.findById(chatId)
                .orElseThrow(() -> new RuntimeException("Чат табылмады"));
        assertMember(chatId, user.getId());
        return buildChatDto(chat, user);
    }

    // ===== ЧАТТЫҢ ХАБАРЛАМАЛАРЫН АЛУ (PIN ТЕКСЕРІСІМЕН) =====
    public List<MessageDto> getMessages(Long chatId, User user) {
        assertMember(chatId, user.getId());
        
        Chat chat = chatRepo.findById(chatId)
                .orElseThrow(() -> new RuntimeException("Чат табылмады"));

        // Чат жасырын болса — PIN енгізілгенін тексеру
        if (isHidden(chatId, user.getId())) {
            throw new RuntimeException("Бұл чат жасырын. Алдымен PIN-кодты енгізіңіз.");
        }

        return messageRepo.findByChatIdOrderByCreatedAtAsc(chatId)
                .stream()
                .map(mapper::toMessageDto)
                .collect(Collectors.toList());
    }

    // ===== ЖАС ЧАТ НЕМЕСЕ ТОП ҚҰРУ =====
    @Transactional
    public ChatDto createChat(CreateChatRequest req, User creator) {
        Chat.ChatType type = Chat.ChatType.valueOf(req.getType().toUpperCase());

        // Жеке чат — бұрыннан бар болса қайтар
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

        // Жасаушы — OWNER
        addMember(chat, creator, ChatMember.Role.OWNER);

        // Басқа мүшелерді қосу
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

        // Тек OWNER немесе ADMIN қоса алады
        ChatMember reqMember = memberRepo.findByChatIdAndUserId(chatId, requester.getId())
                .orElseThrow(() -> new RuntimeException("Рұқсат жоқ"));
        if (reqMember.getRole() == ChatMember.Role.MEMBER)
            throw new RuntimeException("Мүше қосу рұқсаты жоқ");

        if (memberRepo.existsByChatIdAndUserIdAndActiveTrue(chatId, userId))
            throw new RuntimeException("Бұл пайдаланушы топта бұрыннан бар");

        User newMember = userRepo.findById(userId)
                .orElseThrow(() -> new RuntimeException("Пайдаланушы табылмады"));

        // Бұрын кеткен болса — active-ді қайта орнат
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

    // ===== ТОПТАН МҮШЕНІ ӘКЕТ =====
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

    // ===== ЖАСЫРЫН ЧАТ PIN ОРНАТУ =====
    @Transactional
    public void setPin(Long chatId, String pin, User user) {
        assertMember(chatId, user.getId());
        Chat chat = chatRepo.findById(chatId)
                .orElseThrow(() -> new RuntimeException("Чат табылмады"));

        if (pin == null || pin.length() < 4) {
            throw new RuntimeException("PIN-код кемінде 4 цифр болуы керек");
        }

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
        if (!isHidden(chatId, user.getId())) {
            throw new RuntimeException("Бұл чат жасырын емес");
        }

        return hiddenRepo.findByChatIdAndUserId(chatId, user.getId())
                .map(h -> encoder.matches(pin, h.getPinHash()))
                .orElseThrow(() -> new RuntimeException("Жасырын чат табылмады"));
    }

    // ===== ЖАСЫРЫН РЕЖИМДІ АЛЫП ТАСТАУ =====
    @Transactional
    public void removePin(Long chatId, User user) {
        assertMember(chatId, user.getId());
        hiddenRepo.deleteByChatIdAndUserId(chatId, user.getId());
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

    // ===== ЧАТТЫҢ ЖАСЫРЫН ЕКЕНІН ТЕКСЕРУ =====
    private boolean isHidden(Long chatId, Long userId) {
        return hiddenRepo.existsByChatIdAndUserId(chatId, userId);
    }

    // ===== ChatDto ЖАСАУ =====
    private ChatDto buildChatDto(Chat chat, User currentUser) {
        List<ChatMember> members = memberRepo.findByChatIdAndActiveTrue(chat.getId());

        // Соңғы хабарлама
        List<com.securechat.entity.Message> lastMsgs =
                messageRepo.findByChatIdOrderByCreatedAtDesc(chat.getId(), PageRequest.of(0, 1));
        MessageDto lastMsg = lastMsgs.isEmpty() ? null : mapper.toMessageDto(lastMsgs.get(0));

        // Оқылмаған хабарламалар саны
        LocalDateTime lastRead = readStatusRepo
                .findLastReadTime(chat.getId(), currentUser.getId())
                .orElse(currentUser.getCreatedAt());
        long unread = messageRepo.countUnread(chat.getId(), currentUser.getId(), lastRead);

        boolean hidden = isHidden(chat.getId(), currentUser.getId());

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