package com.securechat.repository;

import com.securechat.entity.MessageReadStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.Optional;

public interface MessageReadStatusRepository extends JpaRepository<MessageReadStatus, Long> {

    boolean existsByMessageIdAndUserId(Long messageId, Long userId);

    @Query("SELECT MAX(mrs.readAt) FROM MessageReadStatus mrs " +
           "WHERE mrs.message.chat.id = :chatId AND mrs.user.id = :userId")
    Optional<LocalDateTime> findLastReadTime(@Param("chatId") Long chatId,
                                              @Param("userId") Long userId);
}
