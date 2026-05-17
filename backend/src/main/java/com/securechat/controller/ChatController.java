package com.securechat.controller;

import com.securechat.dto.request.Requests.*;
import com.securechat.dto.response.Responses.*;
import com.securechat.service.ChatService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/chats")
public class ChatController extends BaseController {

    @Autowired
    private ChatService chatService;

    // GET /api/chats — барлық чаттар
    @GetMapping
    public ResponseEntity<List<ChatDto>> getChats(@AuthenticationPrincipal UserDetails ud) {
        return ResponseEntity.ok(chatService.getUserChats(currentUser(ud)));
    }

    // GET /api/chats/{id}
    @GetMapping("/{id}")
    public ResponseEntity<ChatDto> getChat(@PathVariable Long id,
                                           @AuthenticationPrincipal UserDetails ud) {
        return ResponseEntity.ok(chatService.getChat(id, currentUser(ud)));
    }

    // POST /api/chats — жаңа чат / топ құру
    @PostMapping
    public ResponseEntity<ChatDto> createChat(@RequestBody CreateChatRequest req,
                                              @AuthenticationPrincipal UserDetails ud) {
        return ResponseEntity.ok(chatService.createChat(req, currentUser(ud)));
    }

    // DELETE /api/chats/{id} — чатты жою (Group: тек Owner, Private: кез-келген мүше)
    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, String>> deleteChat(@PathVariable Long id,
                                                          @AuthenticationPrincipal UserDetails ud) {
        chatService.deleteChat(id, currentUser(ud));
        return ResponseEntity.ok(Map.of("message", "Чат жойылды"));
    }

    // GET /api/chats/{id}/messages
    @GetMapping("/{id}/messages")
    public ResponseEntity<List<MessageDto>> getMessages(@PathVariable Long id,
                                                        @AuthenticationPrincipal UserDetails ud) {
        return ResponseEntity.ok(chatService.getMessages(id, currentUser(ud)));
    }

    // GET /api/chats/{id}/pinned-messages — бекітілген хабарламалар
    @GetMapping("/{id}/pinned-messages")
    public ResponseEntity<List<MessageDto>> getPinnedMessages(@PathVariable Long id,
                                                              @AuthenticationPrincipal UserDetails ud) {
        return ResponseEntity.ok(chatService.getPinnedMessages(id, currentUser(ud)));
    }

    // POST /api/chats/{id}/members — мүше қосу
    @PostMapping("/{id}/members")
    public ResponseEntity<ChatDto> addMember(@PathVariable Long id,
                                             @RequestBody AddMemberRequest req,
                                             @AuthenticationPrincipal UserDetails ud) {
        return ResponseEntity.ok(chatService.addMemberToGroup(id, req.getUserId(), currentUser(ud)));
    }

    // DELETE /api/chats/{id}/members/{userId} — мүшені шығару
    @DeleteMapping("/{id}/members/{userId}")
    public ResponseEntity<Map<String, String>> removeMember(@PathVariable Long id,
                                                            @PathVariable Long userId,
                                                            @AuthenticationPrincipal UserDetails ud) {
        chatService.removeMemberFromGroup(id, userId, currentUser(ud));
        return ResponseEntity.ok(Map.of("message", "Мүше шығарылды"));
    }

    // PATCH /api/chats/{id}/members/{userId}/role — мүше рөлін өзгерту
    @PatchMapping("/{id}/members/{userId}/role")
    public ResponseEntity<ChatDto> changeMemberRole(@PathVariable Long id,
                                                    @PathVariable Long userId,
                                                    @RequestBody ChangeMemberRoleRequest req,
                                                    @AuthenticationPrincipal UserDetails ud) {
        return ResponseEntity.ok(chatService.changeMemberRole(id, userId, req.getRole(), currentUser(ud)));
    }

    // PATCH /api/chats/{id} — топ ақпаратын жаңарту
    @PatchMapping("/{id}")
    public ResponseEntity<ChatDto> updateGroup(@PathVariable Long id,
                                               @RequestBody UpdateGroupRequest req,
                                               @AuthenticationPrincipal UserDetails ud) {
        return ResponseEntity.ok(chatService.updateGroup(id, req, currentUser(ud)));
    }

    // POST /api/chats/{id}/pin-chat — чатты бекіту
    @PostMapping("/{id}/pin-chat")
    public ResponseEntity<Map<String, String>> pinChat(@PathVariable Long id,
                                                       @AuthenticationPrincipal UserDetails ud) {
        chatService.pinChat(id, currentUser(ud));
        return ResponseEntity.ok(Map.of("message", "Чат бекітілді"));
    }

    // DELETE /api/chats/{id}/pin-chat — чат бекітуін алу
    @DeleteMapping("/{id}/pin-chat")
    public ResponseEntity<Map<String, String>> unpinChat(@PathVariable Long id,
                                                         @AuthenticationPrincipal UserDetails ud) {
        chatService.unpinChat(id, currentUser(ud));
        return ResponseEntity.ok(Map.of("message", "Чат бекітуі алынды"));
    }

    // POST /api/chats/{id}/pin — PIN орнату (hidden chat)
    @PostMapping("/{id}/pin")
    public ResponseEntity<Map<String, String>> setPin(@PathVariable Long id,
                                                      @RequestBody PinRequest req,
                                                      @AuthenticationPrincipal UserDetails ud) {
        chatService.setPin(id, req.getPin(), currentUser(ud));
        return ResponseEntity.ok(Map.of("message", "PIN сәтті орнатылды"));
    }

    // POST /api/chats/{id}/verify-pin — PIN тексеру
    @PostMapping("/{id}/verify-pin")
    public ResponseEntity<Map<String, Boolean>> verifyPin(@PathVariable Long id,
                                                          @RequestBody PinRequest req,
                                                          @AuthenticationPrincipal UserDetails ud) {
        boolean valid = chatService.verifyPin(id, req.getPin(), currentUser(ud));
        return ResponseEntity.ok(Map.of("valid", valid));
    }

    // POST /api/chats/{id}/pin/recover — PIN-кодты қалпына келтіру
    @PostMapping("/{id}/pin/recover")
    public ResponseEntity<Map<String, String>> recoverPin(@PathVariable Long id,
                                                          @RequestBody RecoverPinRequest req,
                                                          @AuthenticationPrincipal UserDetails ud) {
        chatService.recoverPin(id, req.getPassword(), req.getNewPin(), currentUser(ud));
        return ResponseEntity.ok(Map.of("message", "PIN-код сәтті жаңартылды"));
    }

    // DELETE /api/chats/{id}/pin — жасырын режимді алу
    @DeleteMapping("/{id}/pin")
    public ResponseEntity<Map<String, String>> removePin(@PathVariable Long id,
                                                         @AuthenticationPrincipal UserDetails ud) {
        chatService.removePin(id, currentUser(ud));
        return ResponseEntity.ok(Map.of("message", "Жасырын режим алынды"));
    }

    // POST /api/chats/{id}/read — хабарлама оқылды
    @PostMapping("/{id}/read")
    public ResponseEntity<Map<String, String>> markRead(@PathVariable Long id,
                                                        @RequestBody MarkReadRequest req,
                                                        @AuthenticationPrincipal UserDetails ud) {
        chatService.markAsRead(id, req.getMessageId(), currentUser(ud));
        return ResponseEntity.ok(Map.of("message", "OK"));
    }
}
