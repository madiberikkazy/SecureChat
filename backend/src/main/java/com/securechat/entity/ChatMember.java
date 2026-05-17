package com.securechat.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "chat_members",
    uniqueConstraints = @UniqueConstraint(columnNames = {"chat_id", "user_id"}),
    indexes = @Index(name = "idx_chat_member", columnList = "chat_id, user_id"))
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ChatMember {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "chat_id", nullable = false)
    private Chat chat;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    @Builder.Default
    private Role role = Role.MEMBER;

    @Builder.Default
    private LocalDateTime joinedAt = LocalDateTime.now();

    // Пайдаланушы чаттан шыққан уақыты
    private LocalDateTime leftAt;

    // Чаттан шыққан ба?
    @Builder.Default
    private boolean active = true;

    // Чат бекітілген уақыты (null = бекітілмеген)
    private LocalDateTime pinnedAt;

    public enum Role { OWNER, ADMIN, MEMBER }
}
