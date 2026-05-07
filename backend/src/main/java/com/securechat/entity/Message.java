package com.securechat.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "messages",
    indexes = {
        @Index(name = "idx_msg_chat", columnList = "chat_id"),
        @Index(name = "idx_msg_sender", columnList = "sender_id"),
        @Index(name = "idx_msg_created", columnList = "created_at")
    })
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Message {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "chat_id", nullable = false)
    private Chat chat;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "sender_id", nullable = false)
    private User sender;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String content;

    // Хабарлама түрі: TEXT, IMAGE, FILE, SYSTEM
    @Enumerated(EnumType.STRING)
    @Builder.Default
    private MessageType type = MessageType.TEXT;

    // Файл URL (IMAGE/FILE типі үшін)
    @Column(length = 500)
    private String fileUrl;

    @Builder.Default
    private boolean deleted = false;

    // Өшірілген хабарламаның мазмұны
    private String deletedAt;

    @Column(nullable = false)
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    // Өзгертілген уақыт
    private LocalDateTime editedAt;

    // Жауап берілген хабарлама
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "reply_to_id")
    private Message replyTo;

    public enum MessageType { TEXT, IMAGE, FILE, VOICE, SYSTEM }
}
