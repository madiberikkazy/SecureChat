package com.securechat.service;

import com.securechat.dto.response.Responses.*;
import com.securechat.entity.*;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.stream.Collectors;

@Component
public class MapperService {

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

    public MessageDto toMessageDto(Message msg) {
        if (msg == null) return null;
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
                .build();
    }

    public ChatMemberDto toChatMemberDto(ChatMember cm) {
        return ChatMemberDto.builder()
                .id(cm.getId())
                .user(toUserDto(cm.getUser()))
                .role(cm.getRole().name())
                .joinedAt(cm.getJoinedAt())
                .build();
    }

    public List<ChatMemberDto> toChatMemberDtos(List<ChatMember> members) {
        return members.stream().map(this::toChatMemberDto).collect(Collectors.toList());
    }
}
