package com.securechat.service;

import java.io.IOException;
import java.time.LocalDateTime;

import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import com.securechat.dto.request.Requests.*;
import com.securechat.dto.request.Requests.SendMessageRequest;
import com.securechat.dto.response.Responses.*;
import com.securechat.dto.response.Responses.MessageDto;
import com.securechat.dto.response.Responses.TypingDto;
import com.securechat.dto.response.Responses.WebSocketMessageDto;
import com.securechat.entity.Chat;
import com.securechat.entity.Message;
import com.securechat.entity.User;
import com.securechat.repository.ChatMemberRepository;
import com.securechat.repository.ChatRepository;
import com.securechat.repository.MessageRepository;
import com.securechat.repository.UserRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class MessageService {

    private final MessageRepository messageRepo;
    private final ChatRepository chatRepo;
    private final ChatMemberRepository memberRepo;
    private final UserRepository userRepo;
    private final SimpMessagingTemplate ws;
    private final MapperService mapper;
    private final FileService fileService;

    // ===== ХАБАРЛАМА ЖІБЕРУ =====
    @Transactional
    public MessageDto sendMessage(SendMessageRequest req, User sender) {
        Chat chat = chatRepo.findById(req.getChatId())
                .orElseThrow(() -> new RuntimeException("Чат табылмады"));

        if (!memberRepo.existsByChatIdAndUserIdAndActiveTrue(chat.getId(), sender.getId()))
            throw new RuntimeException("Сіз бұл чатта мүше емессіз");

        if (req.getContent() == null || req.getContent().isBlank())
            throw new RuntimeException("Хабарлама бос болмауы тііс");

        Message replyTo = null;
        if (req.getReplyToId() != null)
            replyTo = messageRepo.findById(req.getReplyToId()).orElse(null);

        Message message = Message.builder()
                .chat(chat)
                .sender(sender)
                .content(req.getContent().trim())
                .type(Message.MessageType.TEXT)
                .replyTo(replyTo)
                .build();

        messageRepo.save(message);

        chat.setLastMessageAt(LocalDateTime.now());
        chatRepo.save(chat);

        MessageDto dto = mapper.toMessageDto(message);
        broadcast(chat.getId(), "NEW_MESSAGE", dto);

        return dto;
    }

    // ===== СУРЕТ ХАБАРЛАМАСЫ ЖІБЕРУ =====
    @Transactional
    public MessageDto sendImageMessage(Long chatId, String content, MultipartFile imageFile, 
                                       Long replyToId, User sender) throws IOException {
        Chat chat = chatRepo.findById(chatId)
                .orElseThrow(() -> new RuntimeException("Чат табылмады"));

        if (!memberRepo.existsByChatIdAndUserIdAndActiveTrue(chat.getId(), sender.getId()))
            throw new RuntimeException("Сіз бұл чатта мүше емессіз");

        String fileUrl = fileService.uploadImage(imageFile, chatId, sender.getId());

        Message replyTo = replyToId != null ? messageRepo.findById(replyToId).orElse(null) : null;

        Message message = Message.builder()
                .chat(chat)
                .sender(sender)
                .content(content != null && !content.isBlank() ? content : null)
                .type(Message.MessageType.IMAGE)
                .fileUrl(fileUrl)
                .replyTo(replyTo)
                .build();

        messageRepo.save(message);

        chat.setLastMessageAt(LocalDateTime.now());
        chatRepo.save(chat);

        MessageDto dto = mapper.toMessageDto(message);
        broadcast(chat.getId(), "NEW_MESSAGE", dto);

        return dto;
    }

    // ===== ДЫБЫС ХАБАРЛАМАСЫ ЖІБЕРУ =====
    @Transactional
    public MessageDto sendVoiceMessage(Long chatId, MultipartFile voiceFile, 
                                      Long replyToId, User sender) throws IOException {
        Chat chat = chatRepo.findById(chatId)
                .orElseThrow(() -> new RuntimeException("Чат табылмады"));

        if (!memberRepo.existsByChatIdAndUserIdAndActiveTrue(chat.getId(), sender.getId()))
            throw new RuntimeException("Сіз бұл чатта мүше емессіз");

        String fileUrl = fileService.uploadVoiceMessage(voiceFile, chatId, sender.getId());

        Message replyTo = replyToId != null ? messageRepo.findById(replyToId).orElse(null) : null;

        Message message = Message.builder()
                .chat(chat)
                .sender(sender)
                .type(Message.MessageType.VOICE)
                .fileUrl(fileUrl)
                .replyTo(replyTo)
                .build();

        messageRepo.save(message);

        chat.setLastMessageAt(LocalDateTime.now());
        chatRepo.save(chat);

        MessageDto dto = mapper.toMessageDto(message);
        broadcast(chat.getId(), "NEW_MESSAGE", dto);

        return dto;
    }

    // ===== ФАЙЛ ХАБАРЛАМАСЫ ЖІБЕРУ =====
    @Transactional
    public MessageDto sendFileMessage(Long chatId, String fileName, MultipartFile file, 
                                     Long replyToId, User sender) throws IOException {
        Chat chat = chatRepo.findById(chatId)
                .orElseThrow(() -> new RuntimeException("Чат табылмады"));

        if (!memberRepo.existsByChatIdAndUserIdAndActiveTrue(chat.getId(), sender.getId()))
            throw new RuntimeException("Сіз бұл чатта мүше емессіз");

        String fileUrl = fileService.uploadFile(file, chatId, sender.getId());

        Message replyTo = replyToId != null ? messageRepo.findById(replyToId).orElse(null) : null;

        Message message = Message.builder()
                .chat(chat)
                .sender(sender)
                .content(fileName != null && !fileName.isBlank() ? fileName : "Файл")
                .type(Message.MessageType.FILE)
                .fileUrl(fileUrl)
                .replyTo(replyTo)
                .build();

        messageRepo.save(message);

        chat.setLastMessageAt(LocalDateTime.now());
        chatRepo.save(chat);

        MessageDto dto = mapper.toMessageDto(message);
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

        if (msg.getFileUrl() != null) {
            fileService.deleteFile(msg.getFileUrl());
        }

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