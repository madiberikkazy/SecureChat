package com.securechat.controller;

import com.securechat.dto.request.Requests.*;
import com.securechat.dto.response.Responses.*;
import com.securechat.service.BlockService;
import com.securechat.service.UserService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import java.io.IOException;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/users")
public class UserController extends BaseController {

    @Autowired
    private UserService userService;

    @Autowired
    private BlockService blockService;

    @GetMapping("/me")
    public ResponseEntity<UserDto> getMe(@AuthenticationPrincipal UserDetails ud) {
        return ResponseEntity.ok(userService.getProfile(currentUser(ud)));
    }

    @GetMapping("/{id}")
    public ResponseEntity<UserDto> getUser(@PathVariable Long id) {
        return ResponseEntity.ok(userService.getById(id));
    }

    @GetMapping("/search")
    public ResponseEntity<List<UserDto>> search(@RequestParam String query, @AuthenticationPrincipal UserDetails ud) {
        return ResponseEntity.ok(userService.search(query, currentUser(ud)));
    }

    @PatchMapping("/me")
    public ResponseEntity<UserDto> updateProfile(@Valid @RequestBody UpdateProfileRequest req, @AuthenticationPrincipal UserDetails ud) {
        return ResponseEntity.ok(userService.updateProfile(currentUser(ud), req));
    }

    @PostMapping("/me/avatar")
    public ResponseEntity<UserDto> uploadAvatar(@RequestParam("file") MultipartFile file, @AuthenticationPrincipal UserDetails ud) throws IOException {
        return ResponseEntity.ok(userService.uploadAvatar(currentUser(ud), file));
    }

    @DeleteMapping("/me/avatar")
    public ResponseEntity<UserDto> deleteAvatar(@AuthenticationPrincipal UserDetails ud) {
        return ResponseEntity.ok(userService.deleteAvatar(currentUser(ud)));
    }

    @PostMapping("/me/password")
    public ResponseEntity<Map<String, String>> changePassword(@Valid @RequestBody ChangePasswordRequest req, @AuthenticationPrincipal UserDetails ud) {
        userService.changePassword(currentUser(ud), req);
        return ResponseEntity.ok(Map.of("message", "Құпия сөз сәтті өзгертілді"));
    }

    // ===== БҰҒАТТАУ =====

    @PostMapping("/{id}/block")
    public ResponseEntity<Map<String, Object>> blockUser(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetails ud) {
        return ResponseEntity.ok(blockService.blockUser(currentUser(ud), id));
    }

    @DeleteMapping("/{id}/block")
    public ResponseEntity<Map<String, Object>> unblockUser(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetails ud) {
        return ResponseEntity.ok(blockService.unblockUser(currentUser(ud), id));
    }

    @GetMapping("/{id}/block-status")
    public ResponseEntity<Map<String, Boolean>> blockStatus(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetails ud) {
        return ResponseEntity.ok(blockService.getBlockStatus(currentUser(ud), id));
    }
}
