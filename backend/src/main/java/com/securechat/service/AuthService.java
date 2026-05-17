package com.securechat.service;

import com.securechat.dto.request.Requests.*;
import com.securechat.dto.response.Responses.*;
import com.securechat.entity.User;
import com.securechat.repository.UserRepository;
import com.securechat.security.JwtUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepo;
    private final PasswordEncoder encoder;
    private final JwtUtil jwtUtil;
    private final MapperService mapper;

    // ===== ТІРКЕЛУ =====
    @Transactional
    public AuthResponse register(RegisterRequest req) {

        // Никнеймді бірден нормализациялаймыз (lowercase + trim)
        String username = req.getUsername().toLowerCase().trim();

        // Никнейм форматын тексеру: тек a-z, 0-9, _ және - рұқсат
        if (!username.matches("^[a-z0-9_.-]{3,30}$"))
            throw new RuntimeException(
                "Никнейм 3-30 символ болуы, тек латын әріптері (a-z), сандар, _ және . болуы керек");

        // Никнейм бірегейлігін тексеру (lowercase арқылы — case-insensitive)
        if (userRepo.existsByUsername(username))
            throw new RuntimeException("Бұл никнейм бұрыннан бар: @" + username);

        if (req.getEmail() != null && !req.getEmail().isBlank()) {
            if (userRepo.existsByEmail(req.getEmail().toLowerCase().trim()))
                throw new RuntimeException("Бұл email бұрыннан тіркелген");
        }

        if (req.getPhone() != null && !req.getPhone().isBlank()) {
            if (userRepo.existsByPhone(req.getPhone().trim()))
                throw new RuntimeException("Бұл телефон бұрыннан тіркелген");
        }

        boolean hasEmail = req.getEmail() != null && !req.getEmail().isBlank();
        boolean hasPhone = req.getPhone() != null && !req.getPhone().isBlank();
        if (!hasEmail && !hasPhone)
            throw new RuntimeException("Email немесе телефон нөмірінің біреуі міндетті");

        User user = User.builder()
                .username(username)
                .name(req.getName().trim())
                .email(hasEmail ? req.getEmail().toLowerCase().trim() : null)
                .phone(hasPhone ? req.getPhone().trim() : null)
                .passwordHash(encoder.encode(req.getPassword()))
                .bio(req.getBio())
                .build();

        userRepo.save(user);

        return AuthResponse.builder()
                .token(jwtUtil.generateToken(user.getUsername()))
                .user(mapper.toUserDto(user))
                .build();
    }

    // ===== КІРУ =====
    public AuthResponse login(LoginRequest req) {
        User user = userRepo.findByLogin(req.getLogin())
                .orElseThrow(() -> new RuntimeException("Пайдаланушы табылмады"));

        if (!encoder.matches(req.getPassword(), user.getPasswordHash()))
            throw new RuntimeException("Құпия сөз дұрыс емес");

        return AuthResponse.builder()
                .token(jwtUtil.generateToken(user.getUsername()))
                .user(mapper.toUserDto(user))
                .build();
    }
}
