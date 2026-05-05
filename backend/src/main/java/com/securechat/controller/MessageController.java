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

    // REST fallback
    @PostMapping("/api/messages")
    public ResponseEntity<MessageDto> sendRest(@RequestBody SendMessageRequest req, @AuthenticationPrincipal UserDetails ud) {
        return ResponseEntity.ok(messageService.sendMessage(req, currentUser(ud)));
    }

    // Хабарламаны өшіру
    @DeleteMapping("/api/messages/{id}")
    public ResponseEntity<Map<String, String>> delete(@PathVariable Long id, @AuthenticationPrincipal UserDetails ud) {
        messageService.deleteMessage(id, currentUser(ud));
        return ResponseEntity.ok(Map.of("message", "Хабарлама өшірілді"));
    }
}
