package com.securechat.repository;

import com.securechat.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByUsername(String username);
    Optional<User> findByEmail(String email);
    Optional<User> findByPhone(String phone);

    @Query("SELECT u FROM User u WHERE u.email = :login OR u.phone = :login OR u.username = :login")
    Optional<User> findByLogin(@Param("login") String login);

    @Query("SELECT u FROM User u WHERE (LOWER(u.username) LIKE LOWER(CONCAT('%',:q,'%')) " +
           "OR LOWER(u.name) LIKE LOWER(CONCAT('%',:q,'%')) " +
           "OR u.phone LIKE CONCAT('%',:q,'%') " +
           "OR LOWER(u.email) LIKE LOWER(CONCAT('%',:q,'%'))) " +
           "AND u.id != :excludeId")
    List<User> searchUsers(@Param("q") String q, @Param("excludeId") Long excludeId);

    boolean existsByUsername(String username);
    boolean existsByEmail(String email);
    boolean existsByPhone(String phone);
}
