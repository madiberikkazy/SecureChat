package com.securechat.service;

import com.securechat.dto.response.Responses.*;
import com.securechat.entity.*;
import com.securechat.repository.MessageReadStatusRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.stream.Collectors;

@Component
@RequiredArgsConstructor
public class MapperService {

    private final MessageReadStatusRepository readStatusRepo;

    public UserDto toUserDto(User user) {
        if (user == null) return null;
        return UserDto.builder()
                .id(user.getId())
                .username(user.getUsername())
                .name(user.getName())
                .email(user.getEmail())
                .phone(user.getPhone())
                .avatarUrl(user.getAvatarUrl())
                .bio(user.getBio())
                .online(user.isOnline())
                .lastSeen(user.getLastSeen())
                .notificationsEnabled(user.isNotificationsEnabled())
                .createdAt(user.getCreatedAt())
                .build();
    }

    // WebSocket broadcast үшін (currentUser жоқ) — read әрдайым false
    public MessageDto toMessageDto(Message msg) {
        return toMessageDto(msg, null);
    }

    // REST жауабы үшін — read статусын дұрыс есептейді
    public MessageDto toMessageDto(Message msg, Long currentUserId) {
        if (msg == null) return null;

        boolean isRead = false;
        if (currentUserId != null && msg.getId() != null) {
            if (!msg.getSender().getId().equals(currentUserId)) {
                // Басқа біреудің хабарламасы — ағымдағы пайдаланушы оқыды ма?
                isRead = readStatusRepo.isReadByUser(msg.getId(), currentUserId);
            } else {
                // Өз хабарламасы — кем дегенде бір адам оқыды ма?
                isRead = readStatusRepo.existsByMessageIdAndNotSender(msg.getId(), currentUserId);
            }
        }

        return MessageDto.builder()
                .id(msg.getId())
                .chatId(msg.getChat().getId())
                .sender(toUserDto(msg.getSender()))
                .content(msg.isDeleted() ? null : msg.getContent())
                .type(msg.getType().name())
                .fileUrl(msg.isDeleted() ? null : msg.getFileUrl())
                .deleted(msg.isDeleted())
                .createdAt(msg.getCreatedAt())
                .editedAt(msg.getEditedAt())
                .replyTo(msg.getReplyTo() != null ? toMessageDto(msg.getReplyTo()) : null)
                .read(isRead)
                .pinned(msg.isPinned())
                .pinnedAt(msg.getPinnedAt())
                .forwardedFrom(msg.getForwardedFrom() != null ? toMessageDto(msg.getForwardedFrom()) : null)
                .build();
    }

    public ChatMemberDto toChatMemberDto(ChatMember cm) {
        return ChatMemberDto.builder()
                .id(cm.getId())
                .user(toUserDto(cm.getUser()))
                .role(cm.getRole().name())
                .joinedAt(cm.getJoinedAt())
                .pinnedAt(cm.getPinnedAt())
                .build();
    }

    public List<ChatMemberDto> toChatMemberDtos(List<ChatMember> members) {
        return members.stream().map(this::toChatMemberDto).collect(Collectors.toList());
    }
}
