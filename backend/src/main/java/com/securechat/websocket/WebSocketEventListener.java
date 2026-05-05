package com.securechat.websocket;

import com.securechat.dto.response.Responses.*;
import com.securechat.service.UserService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.*;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.messaging.*;

import java.time.LocalDateTime;

@Component
@RequiredArgsConstructor
@Slf4j
public class WebSocketEventListener {

    private final UserService userService;
    private final SimpMessagingTemplate ws;

    // ===== WebSocket қосылу оқиғасы =====
    @EventListener
    public void handleConnect(SessionConnectedEvent event) {
        StompHeaderAccessor sha = StompHeaderAccessor.wrap(event.getMessage());
        if (sha.getUser() != null) {
            String username = sha.getUser().getName();
            log.info("WebSocket connected: {}", username);
            userService.setOnline(username, true);

            // Барлық пайдаланушыларға онлайн статусын хабарлау
            broadcastStatus(username, true);
        }
    }

    // ===== WebSocket ажырату оқиғасы =====
    @EventListener
    public void handleDisconnect(SessionDisconnectEvent event) {
        StompHeaderAccessor sha = StompHeaderAccessor.wrap(event.getMessage());
        if (sha.getUser() != null) {
            String username = sha.getUser().getName();
            log.info("WebSocket disconnected: {}", username);
            userService.setOnline(username, false);

            broadcastStatus(username, false);
        }
    }

    private void broadcastStatus(String username, boolean online) {
        // /topic/online арнасына онлайн статус жіберу
        ws.convertAndSend("/topic/online",
                WebSocketMessageDto.builder()
                        .event("ONLINE_STATUS")
                        .data(java.util.Map.of(
                                "username", username,
                                "online", online,
                                "lastSeen", LocalDateTime.now().toString()
                        ))
                        .build());
    }
}
