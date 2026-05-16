package com.securechat.dto.request;

import jakarta.validation.constraints.*;
import lombok.*;

public class Requests {

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor
    public static class RegisterRequest {
        @NotBlank @Size(min = 3, max = 30)
        private String username;
        @NotBlank @Size(min = 1, max = 100)
        private String name;
        private String email;
        private String phone;
        @NotBlank @Size(min = 6)
        private String password;
        private String bio;
    }

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor
    public static class LoginRequest {
        @NotBlank private String login;
        @NotBlank private String password;
    }

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class UpdateProfileRequest {
        @Size(min = 1, max = 100)
        private String name;
        @Size(max = 255)
        private String bio;
        @Size(min = 3, max = 30)
        private String username;
        private String email;
        private String phone;
        private Boolean notificationsEnabled;
    }

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class ChangePasswordRequest {
        @NotBlank private String currentPassword;
        @NotBlank @Size(min = 6) private String newPassword;
    }

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class CreateChatRequest {
        @NotBlank private String type;
        private String name;
        private String description;
        private java.util.List<Long> memberIds;
    }

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class SendMessageRequest {
        @NotNull private Long chatId;
        @NotBlank private String content;
        private Long replyToId;
    }

    // PIN-код орнату / тексеру — тек цифрлар, 4-6 санды
    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class PinRequest {
        @NotBlank
        @Pattern(regexp = "\\d{4,6}", message = "PIN-код тек 4-6 цифрдан тұруы керек")
        private String pin;
    }

    // PIN-кодты ұмытқанда негізгі құпия сөз арқылы қалпына келтіру
    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class RecoverPinRequest {
        @NotBlank
        private String password;   // негізгі аккаунт құпия сөзі
        @NotBlank
        @Pattern(regexp = "\\d{4,6}", message = "Жаңа PIN-код тек 4-6 цифрдан тұруы керек")
        private String newPin;
    }

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class AddMemberRequest {
        @NotNull private Long userId;
    }

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor
    public static class UpdateGroupRequest {
        private String name;
        private String description;
    }

    @Getter @Setter @NoArgsConstructor @AllArgsConstructor
    public static class MarkReadRequest {
        @NotNull private Long messageId;
    }

    // Хабарламаны өңдеу (edit)
    @Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
    public static class EditMessageRequest {
        @NotBlank @Size(min = 1, max = 4000)
        private String content;
    }

    // Мүше рөлін өзгерту
    @Getter @Setter @NoArgsConstructor @AllArgsConstructor
    public static class ChangeMemberRoleRequest {
        @NotBlank private String role;  // "ADMIN" немесе "MEMBER"
    }
}
