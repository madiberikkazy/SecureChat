package com.securechat.entity;

import java.time.LocalDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "messages",
    indexes = {
        @Index(name = "idx_msg_chat", columnList = "chat_id"),
        @Index(name = "idx_msg_sender", columnList = "sender_id"),
        @Index(name = "idx_msg_created", columnList = "created_at"),
        @Index(name = "idx_msg_pinned", columnList = "chat_id, pinned")
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

    @Column(columnDefinition = "TEXT")
    private String content;

    @Enumerated(EnumType.STRING)
    @Builder.Default
    private MessageType type = MessageType.TEXT;

    @Column(length = 500)
    private String fileUrl;

    @Builder.Default
    private boolean deleted = false;

    private String deletedAt;

    @Column(nullable = false)
    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();

    private LocalDateTime editedAt;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "reply_to_id")
    private Message replyTo;

    // ===== ХАТ-ХАБАРЛАМА ТҮРЛЕРІ =====
    public enum MessageType { TEXT, IMAGE, FILE, VOICE, SYSTEM }

    // ===== ЧАТ ЖОҒАРЫЛАҒАН ХАБАРЛАМА (pin) =====
    @Builder.Default
    private boolean pinned = false;

    private LocalDateTime pinnedAt;

    // ===== ЖОҒАРЫДАН ЖІБЕРІЛГЕН ХАБАРЛАМА (forward) =====
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "forwarded_from_id")
    private Message forwardedFrom;
}
