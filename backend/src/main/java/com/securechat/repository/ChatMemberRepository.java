package com.securechat.repository;

import com.securechat.entity.ChatMember;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ChatMemberRepository extends JpaRepository<ChatMember, Long> {
    Optional<ChatMember> findByChatIdAndUserId(Long chatId, Long userId);
    boolean existsByChatIdAndUserIdAndActiveTrue(Long chatId, Long userId);
    List<ChatMember> findByChatIdAndActiveTrue(Long chatId);
    int countByChatIdAndActiveTrue(Long chatId);
}
