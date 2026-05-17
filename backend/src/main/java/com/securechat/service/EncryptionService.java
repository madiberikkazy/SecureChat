package com.securechat.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.Cipher;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.security.SecureRandom;
import java.util.Base64;

/**
 * AES-256-GCM шифрлау сервисі.
 * Хабарламалардың мазмұны дерекқорда шифрланған түрде сақталады.
 * Кілт ENCRYPTION_KEY env айнымалысы арқылы беріледі.
 */
@Service
public class EncryptionService {

    private static final String ALGORITHM    = "AES/GCM/NoPadding";
    private static final int    IV_LENGTH    = 12;   // 96 бит — GCM стандарты
    private static final int    TAG_LENGTH   = 128;  // бит

    @Value("${app.encryption.key}")
    private String encryptionKeyBase64;

    // ── Кілтті бір рет кэштеу ──────────────────────────────────────────────
    private SecretKeySpec cachedKey;

    private SecretKeySpec getKey() {
        if (cachedKey == null) {
            byte[] keyBytes = Base64.getDecoder().decode(encryptionKeyBase64);
            if (keyBytes.length != 32)
                throw new IllegalArgumentException(
                    "ENCRYPTION_KEY 32 байт (256 бит) болуы керек, бірақ " + keyBytes.length + " байт берілді");
            cachedKey = new SecretKeySpec(keyBytes, "AES");
        }
        return cachedKey;
    }

    /**
     * Мәтінді AES-256-GCM арқылы шифрлайды.
     * Қайтарылатын мән: Base64(IV + CipherText)
     */
    public String encrypt(String plaintext) {
        if (plaintext == null || plaintext.isEmpty()) return plaintext;
        try {
            byte[] iv = new byte[IV_LENGTH];
            new SecureRandom().nextBytes(iv);

            Cipher cipher = Cipher.getInstance(ALGORITHM);
            cipher.init(Cipher.ENCRYPT_MODE, getKey(), new GCMParameterSpec(TAG_LENGTH, iv));
            byte[] encrypted = cipher.doFinal(plaintext.getBytes("UTF-8"));

            // IV + CipherText біріктіреміз
            byte[] combined = new byte[IV_LENGTH + encrypted.length];
            System.arraycopy(iv, 0, combined, 0, IV_LENGTH);
            System.arraycopy(encrypted, 0, combined, IV_LENGTH, encrypted.length);

            return Base64.getEncoder().encodeToString(combined);
        } catch (Exception e) {
            throw new RuntimeException("Шифрлау қатесі", e);
        }
    }

    /**
     * Шифрланған мәтінді ашады.
     * Кіріс: Base64(IV + CipherText)
     */
    public String decrypt(String ciphertext) {
        if (ciphertext == null || ciphertext.isEmpty()) return ciphertext;

        // Егер мән шифрланбаған болса (ескі деректер) — тікелей қайтарамыз
        // Base64 форматы тексеріледі: ұзындығы 4-ке бөлінуі керек
        if (!isBase64Encrypted(ciphertext)) return ciphertext;

        try {
            byte[] combined = Base64.getDecoder().decode(ciphertext);
            if (combined.length < IV_LENGTH + 16) return ciphertext; // тым қысқа → шифрланбаған

            byte[] iv        = new byte[IV_LENGTH];
            byte[] encrypted = new byte[combined.length - IV_LENGTH];

            System.arraycopy(combined, 0, iv, 0, IV_LENGTH);
            System.arraycopy(combined, IV_LENGTH, encrypted, 0, encrypted.length);

            Cipher cipher = Cipher.getInstance(ALGORITHM);
            cipher.init(Cipher.DECRYPT_MODE, getKey(), new GCMParameterSpec(TAG_LENGTH, iv));
            return new String(cipher.doFinal(encrypted), "UTF-8");
        } catch (Exception e) {
            // Ескі шифрланбаған деректер үшін — өзгертпей қайтарамыз
            return ciphertext;
        }
    }

    /**
     * Base64 форматта жазылған шифрланған мәтін екенін тексереді.
     * Қарапайым мәтін Base64-ке өте сирек сәйкес келеді,
     * бірақ ескі деректермен үйлесімділік үшін қосымша тексеру жасаймыз.
     */
    private boolean isBase64Encrypted(String value) {
        if (value == null) return false;
        // Минималды ұзындық: IV(12) + GCM tag(16) = 28 байт → Base64: 40 символ
        if (value.length() < 40) return false;
        try {
            byte[] decoded = Base64.getDecoder().decode(value);
            return decoded.length >= IV_LENGTH + 16;
        } catch (IllegalArgumentException e) {
            return false; // Base64 емес — шифрланбаған мәтін
        }
    }
}
