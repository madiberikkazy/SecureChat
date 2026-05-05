package com.securechat.service;

import com.securechat.dto.request.Requests.*;
import com.securechat.dto.response.Responses.*;
import com.securechat.entity.*;
import com.securechat.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class MessageService {

    private final MessageRepository messageRepo;
    private final ChatRepository chatRepo;
    private final ChatMemberRepository memberRepo;
    private final UserRepository userRepo;
    private final SimpMessagingTemplate ws;
    private final MapperService mapper;

    // ===== ХАБАРЛАМА ЖІБЕРУ =====
    @Transactional
    public MessageDto sendMessage(SendMessageRequest req, User sender) {
        Chat chat = chatRepo.findById(req.getChatId())
                .orElseThrow(() -> new RuntimeException("Чат табылмады"));

        if (!memberRepo.existsByChatIdAndUserIdAndActiveTrue(chat.getId(), sender.getId()))
            throw new RuntimeException("Сіз бұл чатта мүше емессіз");

        if (req.getContent() == null || req.getContent().isBlank())
            throw new RuntimeException("Хабарлама бос болмауы тиіс");

        // Жауап берілген хабарлама
        Message replyTo = null;
        if (req.getReplyToId() != null)
            replyTo = messageRepo.findById(req.getReplyToId()).orElse(null);

        Message message = Message.builder()
                .chat(chat)
                .sender(sender)
                .content(req.getContent().trim())
                .replyTo(replyTo)
                .build();

        messageRepo.save(message);

        // Чаттың lastMessageAt жаңарту
        chat.setLastMessageAt(LocalDateTime.now());
        chatRepo.save(chat);

        MessageDto dto = mapper.toMessageDto(message);

        // WebSocket арқылы чат мүшелеріне жіберу
        // Барлық мүшелер /topic/chat/{chatId} арнасына жазылады
        broadcast(chat.getId(), "NEW_MESSAGE", dto);

        return dto;
    }

    // ===== ХАБАРЛАМАНЫ ӨШІРУ =====
    @Transactional
    public void deleteMessage(Long messageId, User user) {
        Message msg = messageRepo.findById(messageId)
                .orElseThrow(() -> new RuntimeException("Хабарлама табылмады"));

        if (!msg.getSender().getId().equals(user.getId()))
            throw new RuntimeException("Тек өз хабарламаңызды өшіре аласыз");

        msg.setDeleted(true);
        msg.setDeletedAt(LocalDateTime.now().toString());
        messageRepo.save(msg);

        broadcast(msg.getChat().getId(), "DELETE_MESSAGE", mapper.toMessageDto(msg));
    }

    // ===== TYPING ИНДИКАТОРЫ =====
    public void sendTyping(Long chatId, User user, boolean isTyping) {
        var typingDto = TypingDto.builder()
                .chatId(chatId)
                .userId(user.getId())
                .username(user.getUsername())
                .typing(isTyping)
                .build();
        broadcast(chatId, "TYPING", typingDto);
    }

    // ===== ХАБАРЛАМА ОҚЫЛДЫ =====
    public void sendReadReceipt(Long chatId, Long messageId, User user) {
        var readDto = java.util.Map.of(
                "chatId", chatId,
                "messageId", messageId,
                "userId", user.getId(),
                "username", user.getUsername()
        );
        broadcast(chatId, "READ", readDto);
    }

    // ===== Хабарламаны барлық мүшелерге тарату =====
    private void broadcast(Long chatId, String event, Object data) {
        var wsMsg = WebSocketMessageDto.builder()
                .event(event)
                .data(data)
                .build();
        ws.convertAndSend("/topic/chat/" + chatId, wsMsg);
    }
}
