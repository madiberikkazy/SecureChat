package com.securechat.dto.response;

import lombok.*;
import java.time.LocalDateTime;
import java.util.List;

public class Responses {

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class UserDto {
        private Long id;
        private String username;
        private String name;
        private String email;
        private String phone;
        private String avatarUrl;
        private String bio;
        private boolean online;
        private LocalDateTime lastSeen;
        private boolean notificationsEnabled;
        private LocalDateTime createdAt;
    }

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class AuthResponse {
        private String token;
        private UserDto user;
    }

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class ChatDto {
        private Long id;
        private String type;
        private String name;
        private String description;
        private String avatarUrl;
        private LocalDateTime createdAt;
        private LocalDateTime lastMessageAt;
        private List<ChatMemberDto> members;
        private MessageDto lastMessage;
        private long unreadCount;
        private boolean hidden;
    }

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class ChatMemberDto {
        private Long id;
        private UserDto user;
        private String role;
        private LocalDateTime joinedAt;
    }

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class MessageDto {
        private Long id;
        private Long chatId;
        private UserDto sender;
        private String content;
        private String type;
        private String fileUrl;
        private boolean deleted;
        private LocalDateTime createdAt;
        private LocalDateTime editedAt;
        private MessageDto replyTo;
        private boolean read;
    }

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class ErrorResponse {
        private String error;
        private int status;
        private LocalDateTime timestamp;
    }

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class OnlineStatusDto {
        private Long userId;
        private boolean online;
        private LocalDateTime lastSeen;
    }

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class TypingDto {
        private Long chatId;
        private Long userId;
        private String username;
        private boolean typing;
    }

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class WebSocketMessageDto {
        private String event; // NEW_MESSAGE, DELETE_MESSAGE, READ, TYPING, ONLINE
        private Object data;
    }
}
