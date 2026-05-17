package com.securechat.repository;

import com.securechat.entity.Message;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;

public interface MessageRepository extends JpaRepository<Message, Long> {

    List<Message> findByChatIdOrderByCreatedAtAsc(Long chatId);

    List<Message> findByChatIdOrderByCreatedAtDesc(Long chatId, Pageable pageable);

    @Query("SELECT COUNT(m) FROM Message m WHERE m.chat.id = :chatId " +
           "AND m.sender.id != :userId AND m.deleted = false " +
           "AND m.createdAt > :since")
    long countUnread(@Param("chatId") Long chatId,
                     @Param("userId") Long userId,
                     @Param("since") LocalDateTime since);

    // Бекітілген хабарламалар (pinned messages)
    List<Message> findByChatIdAndPinnedTrueOrderByPinnedAtDesc(Long chatId);
}
