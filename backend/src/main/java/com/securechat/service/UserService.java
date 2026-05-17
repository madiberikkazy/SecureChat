package com.securechat.service;

import com.securechat.dto.request.Requests.*;
import com.securechat.dto.response.Responses.*;
import com.securechat.entity.User;
import com.securechat.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.*;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepo;
    private final PasswordEncoder encoder;
    private final MapperService mapper;

    @Value("${app.upload.dir:uploads/}")
    private String uploadDir;

    // ===== ПРОФИЛЬ АЛУ =====
    public UserDto getProfile(User user) {
        return mapper.toUserDto(user);
    }

    // ===== ПАЙДАЛАНУШЫ ІЗДЕУ =====
    public List<UserDto> search(String query, User currentUser) {
        if (query == null || query.length() < 2) return Collections.emptyList();
        return userRepo.searchUsers(query.trim(), currentUser.getId())
                .stream()
                .map(mapper::toUserDto)
                .collect(Collectors.toList());
    }

    // ===== ID БОЙЫНША АЛУ =====
    public UserDto getById(Long id) {
        return userRepo.findById(id)
                .map(mapper::toUserDto)
                .orElseThrow(() -> new RuntimeException("Пайдаланушы табылмады"));
    }

    // ===== ПРОФИЛЬДІ ЖАҢАРТУ =====
    @Transactional
    public UserDto updateProfile(User user, UpdateProfileRequest req) {

        if (req.getName() != null && !req.getName().isBlank())
            user.setName(req.getName().trim());

        if (req.getBio() != null)
            user.setBio(req.getBio().trim());

        if (req.getUsername() != null && !req.getUsername().isBlank()) {
            String newUsername = req.getUsername().toLowerCase().trim();
            // Никнейм форматын тексеру
            if (!newUsername.matches("^[a-z0-9_.-]{3,30}$"))
                throw new RuntimeException(
                    "Никнейм 3-30 символ болуы, тек латын әріптері (a-z), сандар, _ және . болуы керек");
            if (!newUsername.equals(user.getUsername())) {
                if (userRepo.existsByUsername(newUsername))
                    throw new RuntimeException("Бұл никнейм бұрыннан бар: @" + newUsername);
                user.setUsername(newUsername);
            }
        }

        if (req.getEmail() != null && !req.getEmail().isBlank()) {
            String newEmail = req.getEmail().toLowerCase().trim();
            if (!newEmail.equals(user.getEmail())) {
                if (userRepo.existsByEmail(newEmail))
                    throw new RuntimeException("Бұл email бұрыннан тіркелген");
                user.setEmail(newEmail);
            }
        }

        if (req.getPhone() != null && !req.getPhone().isBlank()) {
            String newPhone = req.getPhone().trim();
            if (!newPhone.equals(user.getPhone())) {
                if (userRepo.existsByPhone(newPhone))
                    throw new RuntimeException("Бұл телефон бұрыннан тіркелген");
                user.setPhone(newPhone);
            }
        }

        if (req.getNotificationsEnabled() != null)
            user.setNotificationsEnabled(req.getNotificationsEnabled());

        userRepo.save(user);
        return mapper.toUserDto(user);
    }

    // ===== АВАТАР ЖҮКТЕУ =====
    @Transactional
    public UserDto uploadAvatar(User user, MultipartFile file) throws IOException {
        if (file.isEmpty()) throw new RuntimeException("Файл бос");

        String ct = file.getContentType();
        if (ct == null || !ct.startsWith("image/"))
            throw new RuntimeException("Тек сурет файлдарын жүктеуге болады");

        if (file.getSize() > 5 * 1024 * 1024)
            throw new RuntimeException("Файл өлшемі 5МБ-дан аспауы керек");

        String ext = getExtension(Objects.requireNonNull(file.getOriginalFilename()));
        String filename = "avatar_" + user.getId() + "_" + System.currentTimeMillis() + ext;

        Path avatarDir = Paths.get(uploadDir, "avatars");
        Files.createDirectories(avatarDir);
        Files.copy(file.getInputStream(), avatarDir.resolve(filename),
                StandardCopyOption.REPLACE_EXISTING);

        user.setAvatarUrl("/uploads/avatars/" + filename);
        userRepo.save(user);
        return mapper.toUserDto(user);
    }

    // ===== АВАТАРДЫ ӨШІ РУ =====
    @Transactional
    public UserDto deleteAvatar(User user) {
        user.setAvatarUrl(null);
        userRepo.save(user);
        return mapper.toUserDto(user);
    }

    // ===== ҚҰПИЯ СӨЗ ӨЗГЕРТУ =====
    @Transactional
    public void changePassword(User user, ChangePasswordRequest req) {
        if (!encoder.matches(req.getCurrentPassword(), user.getPasswordHash()))
            throw new RuntimeException("Ағымдағы құпия сөз дұрыс емес");

        if (req.getCurrentPassword().equals(req.getNewPassword()))
            throw new RuntimeException("Жаңа құпия сөз ескісімен бірдей болмауы керек");

        user.setPasswordHash(encoder.encode(req.getNewPassword()));
        userRepo.save(user);
    }

    // ===== ОНЛАЙН СТАТУСТЫ ЖАҢАРТУ =====
    @Transactional
    public void setOnline(String username, boolean online) {
        userRepo.findByUsername(username).ifPresent(user -> {
            user.setOnline(online);
            if (!online) user.setLastSeen(LocalDateTime.now());
            userRepo.save(user);
        });
    }

    private String getExtension(String filename) {
        int idx = filename.lastIndexOf('.');
        return idx > 0 ? filename.substring(idx) : ".jpg";
    }
}
