package com.securechat.service;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.Set;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class FileService {

    @Value("${app.upload.dir:uploads/}")
    private String uploadDir;

    private static final long MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
    private static final long MAX_AUDIO_SIZE = 25 * 1024 * 1024; // 25MB
    private static final long MAX_FILE_SIZE  = 50 * 1024 * 1024; // 50MB

    private static final Set<String> ALLOWED_IMAGE_TYPES = Set.of(
            "image/jpeg", "image/png", "image/gif", "image/webp"
    );

    // ===== СУРЕТ ЖҮКТЕУ =====
    public String uploadImage(MultipartFile file, Long chatId, Long userId) throws IOException {
        validateImage(file);
        return saveFile(file, chatId, userId, "images");
    }

    // ===== ДЫБЫС ХАБАРЛАМАСЫ ЖҮКТЕУ =====
    // Browser MediaRecorder шығарады: audio/webm;codecs=opus
    // Сондықтан content-type-ты тек "audio/" деп тексереміз
    public String uploadVoiceMessage(MultipartFile file, Long chatId, Long userId) throws IOException {
        validateAudio(file);
        return saveFile(file, chatId, userId, "voice");
    }

    // ===== ФАЙЛ ЖҮКТЕУ =====
    public String uploadFile(MultipartFile file, Long chatId, Long userId) throws IOException {
        validateFile(file);
        return saveFile(file, chatId, userId, "files");
    }

    // ===== ФАЙЛДЫ САҚТАУ =====
    private String saveFile(MultipartFile file, Long chatId, Long userId, String folderType)
            throws IOException {

        String ext = getExtension(file.getOriginalFilename());
        String filename = String.format("%s_%d_%d%s", folderType, userId, System.currentTimeMillis(), ext);

        Path uploadPath = Paths.get(uploadDir, String.valueOf(chatId), folderType);
        Files.createDirectories(uploadPath);

        Path filePath = uploadPath.resolve(filename);
        Files.copy(file.getInputStream(), filePath, StandardCopyOption.REPLACE_EXISTING);

        return String.format("/uploads/%d/%s/%s", chatId, folderType, filename);
    }

    // ===== СУРЕТ ВАЛИДАЦИЯСЫ =====
    private void validateImage(MultipartFile file) {
        if (file.isEmpty()) throw new RuntimeException("Файл бос");

        String ct = file.getContentType();
        if (ct == null || !ALLOWED_IMAGE_TYPES.contains(ct))
            throw new RuntimeException("Тек JPG, PNG, GIF, WebP форматы рұқсат");

        if (file.getSize() > MAX_IMAGE_SIZE)
            throw new RuntimeException("Сурет өлшемі 10MB-дан аспауы керек");
    }

    // ===== ДЫБЫС ВАЛИДАЦИЯСЫ — кең тексеру =====
    private void validateAudio(MultipartFile file) {
        if (file.isEmpty()) throw new RuntimeException("Файл бос");

        String ct = file.getContentType();
        // audio/webm;codecs=opus, audio/mpeg, audio/ogg, audio/wav т.б. — барлығы audio/ басталады
        if (ct == null || !ct.startsWith("audio/"))
            throw new RuntimeException("Тек аудио форматтары рұқсат");

        if (file.getSize() > MAX_AUDIO_SIZE)
            throw new RuntimeException("Дыбыс хабарламасы 25MB-дан аспауы керек");
    }

    // ===== ФАЙЛ ВАЛИДАЦИЯСЫ =====
    private void validateFile(MultipartFile file) {
        if (file.isEmpty()) throw new RuntimeException("Файл бос");

        if (file.getSize() > MAX_FILE_SIZE)
            throw new RuntimeException("Файл өлшемі 50MB-дан аспауы керек");
    }

    // ===== КЕҢЕЙТІМДІ АЛУ =====
    private String getExtension(String filename) {
        if (filename == null || filename.isEmpty()) return ".bin";
        int idx = filename.lastIndexOf('.');
        return idx > 0 ? filename.substring(idx).toLowerCase() : ".bin";
    }

    // ===== ФАЙЛДЫ ӨШІ РУ =====
    public void deleteFile(String fileUrl) {
        try {
            if (fileUrl == null || fileUrl.isBlank()) return;
            // /uploads/123/images/... → uploadDir/123/images/...
            String relative = fileUrl.startsWith("/uploads/")
                    ? fileUrl.substring("/uploads/".length())
                    : fileUrl;
            Path filePath = Paths.get(uploadDir).resolve(relative);
            Files.deleteIfExists(filePath);
        } catch (Exception e) {
            System.err.println("Файлды өшіру қатесі: " + e.getMessage());
        }
    }
}