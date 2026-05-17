package com.securechat.controller;

import com.securechat.dto.request.Requests.*;
import com.securechat.dto.response.Responses.*;
import com.securechat.repository.UserRepository;
import com.securechat.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;
    private final UserRepository userRepo;

    // POST /api/auth/register
    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(@Valid @RequestBody RegisterRequest req) {
        return ResponseEntity.ok(authService.register(req));
    }

    // POST /api/auth/login
    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@RequestBody LoginRequest req) {
        return ResponseEntity.ok(authService.login(req));
    }

    // GET /api/auth/check-username?username=nurlan
    // 1-қадамда никнейм бос па екенін тексеру (JWT қажет емес)
    @GetMapping("/check-username")
    public ResponseEntity<?> checkUsername(@RequestParam String username) {
        String normalized = username.toLowerCase().trim();
        boolean valid = normalized.matches("^[a-z0-9_.-]{3,30}$");
        boolean taken = valid && userRepo.existsByUsername(normalized);
        return ResponseEntity.ok(java.util.Map.of(
            "available", valid && !taken,
            "valid",     valid,
            "taken",     taken
        ));
    }
}
