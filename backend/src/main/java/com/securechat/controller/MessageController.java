package com.securechat.controller;

import com.securechat.dto.request.Requests.*;
import com.securechat.dto.response.Responses.*;
import com.securechat.service.MessageService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import java.security.Principal;
import java.util.Map;

@RestController
public class MessageController extends BaseController {

    @Autowired
    private MessageService messageService;

    // WebSocket арқылы хабарлама жіберу
    @MessageMapping("/message.send")
    public void sendViaWs(@Payload SendMessageRequest req, Principal principal) {
        var user = userRepo.findByUsername(principal.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));
        messageService.sendMessage(req, user);
    }

    // WebSocket: typing индикаторы
    @MessageMapping("/message.typing")
    public void typingViaWs(@Payload Map<String, Object> payload, Principal principal) {
        var user = userRepo.findByUsername(principal.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));
        Long chatId = Long.valueOf(payload.get("chatId").toString());
        boolean typing = Boolean.parseBoolean(payload.get("typing").toString());
        messageService.sendTyping(chatId, user, typing);
    }

    // ===== ХАБАРЛАМА ЖІБЕРУ (REST) =====
    @PostMapping("/api/messages")
    public ResponseEntity<MessageDto> sendRest(@RequestBody SendMessageRequest req, @AuthenticationPrincipal UserDetails ud) {
        return ResponseEntity.ok(messageService.sendMessage(req, currentUser(ud)));
    }

    // ===== СУРЕТ ХАБАРЛАМАСЫ ЖІБЕРУ =====
    @PostMapping("/api/messages/image")
    public ResponseEntity<MessageDto> sendImage(
            @RequestParam Long chatId,
            @RequestParam(required = false) String caption,
            @RequestParam(required = false) Long replyToId,
            @RequestParam("file") MultipartFile image,
            @AuthenticationPrincipal UserDetails ud) throws Exception {
        
        return ResponseEntity.ok(messageService.sendImageMessage(chatId, caption, image, replyToId, currentUser(ud)));
    }

    // ===== ДЫБЫС ХАБАРЛАМАСЫ ЖІБЕРУ =====
    @PostMapping("/api/messages/voice")
    public ResponseEntity<MessageDto> sendVoice(
            @RequestParam Long chatId,
            @RequestParam(required = false) Long replyToId,
            @RequestParam("file") MultipartFile voice,
            @AuthenticationPrincipal UserDetails ud) throws Exception {
        
        return ResponseEntity.ok(messageService.sendVoiceMessage(chatId, voice, replyToId, currentUser(ud)));
    }

    // ===== ФАЙЛ ХАБАРЛАМАСЫ ЖІБЕРУ =====
    @PostMapping("/api/messages/file")
    public ResponseEntity<MessageDto> sendFile(
            @RequestParam Long chatId,
            @RequestParam(required = false) String fileName,
            @RequestParam(required = false) Long replyToId,
            @RequestParam("file") MultipartFile file,
            @AuthenticationPrincipal UserDetails ud) throws Exception {
        
        return ResponseEntity.ok(messageService.sendFileMessage(chatId, fileName, file, replyToId, currentUser(ud)));
    }

    // ===== ХАБАРЛАМАНЫ ӨШІРУ =====
    @DeleteMapping("/api/messages/{id}")
    public ResponseEntity<Map<String, String>> delete(@PathVariable Long id, @AuthenticationPrincipal UserDetails ud) {
        messageService.deleteMessage(id, currentUser(ud));
        return ResponseEntity.ok(Map.of("message", "Хабарлама өшірілді"));
    }
}