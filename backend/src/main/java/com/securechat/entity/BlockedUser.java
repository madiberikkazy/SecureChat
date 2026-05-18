package com.securechat.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "blocked_users",
    uniqueConstraints = @UniqueConstraint(columnNames = {"blocker_id", "blocked_id"}),
    indexes = {
        @Index(name = "idx_blocked_blocker", columnList = "blocker_id"),
        @Index(name = "idx_blocked_blocked", columnList = "blocked_id")
    }
)
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class BlockedUser {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "blocker_id", nullable = false)
    private User blocker;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "blocked_id", nullable = false)
    private User blocked;

    @Column(nullable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
