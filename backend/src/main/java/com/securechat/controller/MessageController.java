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
import java.util.List;
import java.util.Map;

@RestController
public class MessageController extends BaseController {

    @Autowired
    private MessageService messageService;

    // ===== WebSocket: хабарлама жіберу =====
    @MessageMapping("/message.send")
    public void sendViaWs(@Payload SendMessageRequest req, Principal principal) {
        var user = userRepo.findByUsername(principal.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));
        messageService.sendMessage(req, user);
    }

    // ===== WebSocket: typing индикаторы =====
    @MessageMapping("/message.typing")
    public void typingViaWs(@Payload Map<String, Object> payload, Principal principal) {
        var user = userRepo.findByUsername(principal.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));
        Long chatId = Long.valueOf(payload.get("chatId").toString());
        boolean typing = Boolean.parseBoolean(payload.get("typing").toString());
        messageService.sendTyping(chatId, user, typing);
    }

    // POST /api/messages — мәтін хабарламасы (REST)
    @PostMapping("/api/messages")
    public ResponseEntity<MessageDto> sendRest(@RequestBody SendMessageRequest req,
                                               @AuthenticationPrincipal UserDetails ud) {
        return ResponseEntity.ok(messageService.sendMessage(req, currentUser(ud)));
    }

    // PATCH /api/messages/{id} — хабарламаны өңдеу
    @PatchMapping("/api/messages/{id}")
    public ResponseEntity<MessageDto> edit(@PathVariable Long id,
                                           @RequestBody EditMessageRequest req,
                                           @AuthenticationPrincipal UserDetails ud) {
        return ResponseEntity.ok(messageService.editMessage(id, req.getContent(), currentUser(ud)));
    }

    // POST /api/messages/{id}/pin — хабарламаны бекіту
    @PostMapping("/api/messages/{id}/pin")
    public ResponseEntity<MessageDto> pinMessage(@PathVariable Long id,
                                                 @AuthenticationPrincipal UserDetails ud) {
        return ResponseEntity.ok(messageService.pinMessage(id, currentUser(ud)));
    }

    // DELETE /api/messages/{id}/pin — бекітуді алу
    @DeleteMapping("/api/messages/{id}/pin")
    public ResponseEntity<MessageDto> unpinMessage(@PathVariable Long id,
                                                   @AuthenticationPrincipal UserDetails ud) {
        return ResponseEntity.ok(messageService.unpinMessage(id, currentUser(ud)));
    }

    // POST /api/messages/forward — хабарламаларды жіберу
    @PostMapping("/api/messages/forward")
    public ResponseEntity<List<MessageDto>> forwardMessages(@RequestBody ForwardMessagesRequest req,
                                                            @AuthenticationPrincipal UserDetails ud) {
        return ResponseEntity.ok(messageService.forwardMessages(req, currentUser(ud)));
    }

    // POST /api/messages/image — сурет хабарламасы
    @PostMapping("/api/messages/image")
    public ResponseEntity<MessageDto> sendImage(
            @RequestParam Long chatId,
            @RequestParam(required = false) String caption,
            @RequestParam(required = false) Long replyToId,
            @RequestParam("file") MultipartFile image,
            @AuthenticationPrincipal UserDetails ud) throws Exception {
        return ResponseEntity.ok(
                messageService.sendImageMessage(chatId, caption, image, replyToId, currentUser(ud)));
    }

    // POST /api/messages/voice — дыбыс хабарламасы
    @PostMapping("/api/messages/voice")
    public ResponseEntity<MessageDto> sendVoice(
            @RequestParam Long chatId,
            @RequestParam(required = false) Long replyToId,
            @RequestParam("file") MultipartFile voice,
            @AuthenticationPrincipal UserDetails ud) throws Exception {
        return ResponseEntity.ok(
                messageService.sendVoiceMessage(chatId, voice, replyToId, currentUser(ud)));
    }

    // POST /api/messages/file — файл хабарламасы
    @PostMapping("/api/messages/file")
    public ResponseEntity<MessageDto> sendFile(
            @RequestParam Long chatId,
            @RequestParam(required = false) String fileName,
            @RequestParam(required = false) Long replyToId,
            @RequestParam("file") MultipartFile file,
            @AuthenticationPrincipal UserDetails ud) throws Exception {
        return ResponseEntity.ok(
                messageService.sendFileMessage(chatId, fileName, file, replyToId, currentUser(ud)));
    }

    // DELETE /api/messages/{id} — хабарламаны өшіру
    @DeleteMapping("/api/messages/{id}")
    public ResponseEntity<Map<String, String>> delete(@PathVariable Long id,
                                                      @AuthenticationPrincipal UserDetails ud) {
        messageService.deleteMessage(id, currentUser(ud));
        return ResponseEntity.ok(Map.of("message", "Хабарлама өшірілді"));
    }
}
