package com.securechat.service;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.*;
import java.util.*;

@Service
@RequiredArgsConstructor
public class FileService {

    @Value("${app.upload.dir:uploads/}")
    private String uploadDir;

    private static final long MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
    private static final long MAX_AUDIO_SIZE = 20 * 1024 * 1024; // 20MB
    private static final long MAX_FILE_SIZE = 50 * 1024 * 1024;  // 50MB

    private static final Set<String> ALLOWED_IMAGE_TYPES = Set.of(
            "image/jpeg", "image/png", "image/gif", "image/webp"
    );
    private static final Set<String> ALLOWED_AUDIO_TYPES = Set.of(
            "audio/mpeg", "audio/wav", "audio/ogg", "audio/webm", "audio/mp4"
    );

    // ===== СУРЕТ ЖҮКТЕУ =====
    public String uploadImage(MultipartFile file, Long chatId, Long userId) throws IOException {
        validateImage(file);
        return saveFile(file, chatId, userId, "images");
    }

    // ===== ДЫБЫС ХАБАРЛАМАСЫ ЖҮКТЕУ =====
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
        
        String ext = getExtension(Objects.requireNonNull(file.getOriginalFilename()));
        String filename = generateFilename(userId, folderType, ext);
        
        Path uploadPath = Paths.get(uploadDir, String.valueOf(chatId), folderType);
        Files.createDirectories(uploadPath);
        
        Path filePath = uploadPath.resolve(filename);
        Files.copy(file.getInputStream(), filePath, StandardCopyOption.REPLACE_EXISTING);
        
        // URL орнатары
        return String.format("/uploads/%d/%s/%s", chatId, folderType, filename);
    }

    // ===== СУРЕТ ВАЛИДАЦИЯСЫ =====
    private void validateImage(MultipartFile file) throws IOException {
        if (file.isEmpty()) {
            throw new RuntimeException("Файл бос");
        }
        
        String contentType = file.getContentType();
        if (contentType == null || !ALLOWED_IMAGE_TYPES.contains(contentType)) {
            throw new RuntimeException("Тек JPG, PNG, GIF, WebP форматы рұқсат");
        }
        
        if (file.getSize() > MAX_IMAGE_SIZE) {
            throw new RuntimeException("Сурет өлшемі 10MB-дан аспауы керек");
        }
    }

    // ===== ДЫБЫС ВАЛИДАЦИЯСЫ =====
    private void validateAudio(MultipartFile file) throws IOException {
        if (file.isEmpty()) {
            throw new RuntimeException("Файл бос");
        }
        
        String contentType = file.getContentType();
        if (contentType == null || !ALLOWED_AUDIO_TYPES.contains(contentType)) {
            throw new RuntimeException("Тек MP3, WAV, OGG, WebM форматы рұқсат");
        }
        
        if (file.getSize() > MAX_AUDIO_SIZE) {
            throw new RuntimeException("Дыбыс хабарламасы 20MB-дан аспауы керек");
        }
    }

    // ===== ФАЙЛ ВАЛИДАЦИЯСЫ =====
    private void validateFile(MultipartFile file) throws IOException {
        if (file.isEmpty()) {
            throw new RuntimeException("Файл бос");
        }
        
        if (file.getSize() > MAX_FILE_SIZE) {
            throw new RuntimeException("Файл өлшемі 50MB-дан аспауы керек");
        }
    }

    // ===== ФАЙЛДЫҢ КЕҢЕЙТІМІН АЛУ =====
    private String getExtension(String filename) {
        int idx = filename.lastIndexOf('.');
        return idx > 0 ? filename.substring(idx) : "";
    }

    // ===== ФАЙЛ АТАУЫН ЖАСАУ =====
    private String generateFilename(Long userId, String folderType, String ext) {
        return String.format("%s_%d_%d%s", folderType, userId, System.currentTimeMillis(), ext);
    }

    // ===== ФАЙЛДЫ ӨШІ РУ =====
    public void deleteFile(String fileUrl) {
        try {
            if (fileUrl == null || fileUrl.isBlank()) return;
            
            // /uploads/123/images/image_1_123456.jpg -> uploads/123/images/image_1_123456.jpg
            String path = fileUrl.startsWith("/") ? fileUrl.substring(1) : fileUrl;
            Path filePath = Paths.get(uploadDir.replace("uploads/", ""), path.replace("uploads/", ""));
            Files.deleteIfExists(filePath);
        } catch (IOException e) {
            // Логируем ошибку но не прерываем процесс
            System.err.println("Файлды өшіру мүмкін болмады: " + e.getMessage());
        }
    }
}