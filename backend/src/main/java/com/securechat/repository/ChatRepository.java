package com.securechat.repository;

import com.securechat.entity.Chat;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface ChatRepository extends JpaRepository<Chat, Long> {

    @Query("SELECT DISTINCT c FROM Chat c JOIN c.members m " +
           "WHERE m.user.id = :userId AND m.active = true " +
           "ORDER BY c.lastMessageAt DESC NULLS LAST")
    List<Chat> findAllByUserId(@Param("userId") Long userId);

    @Query("SELECT c FROM Chat c JOIN c.members m1 JOIN c.members m2 " +
           "WHERE c.type = 'PRIVATE' " +
           "AND m1.user.id = :u1 AND m2.user.id = :u2 " +
           "AND m1.active = true AND m2.active = true")
    Optional<Chat> findPrivateChat(@Param("u1") Long u1, @Param("u2") Long u2);
}
