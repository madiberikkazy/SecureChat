package com.securechat.repository;

import com.securechat.entity.HiddenChat;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface HiddenChatRepository extends JpaRepository<HiddenChat, Long> {
    Optional<HiddenChat> findByChatIdAndUserId(Long chatId, Long userId);
    boolean existsByChatIdAndUserId(Long chatId, Long userId);
    void deleteByChatIdAndUserId(Long chatId, Long userId);
}
