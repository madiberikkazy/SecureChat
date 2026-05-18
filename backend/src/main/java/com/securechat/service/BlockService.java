package com.securechat.service;

import com.securechat.entity.BlockedUser;
import com.securechat.entity.User;
import com.securechat.repository.BlockedUserRepository;
import com.securechat.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;

@Service
@RequiredArgsConstructor
public class BlockService {

    private final BlockedUserRepository blockedUserRepo;
    private final UserRepository userRepo;

    /** Block targetId by currentUser */
    @Transactional
    public Map<String, Object> blockUser(User currentUser, Long targetId) {
        if (currentUser.getId().equals(targetId))
            throw new RuntimeException("Өзіңізді бұғаттай алмайсыз");

        User target = userRepo.findById(targetId)
                .orElseThrow(() -> new RuntimeException("Пайдаланушы табылмады"));

        if (blockedUserRepo.existsByBlockerIdAndBlockedId(currentUser.getId(), targetId))
            return Map.of("blocked", true, "message", "Пайдаланушы бұрыннан бұғатталған");

        BlockedUser block = BlockedUser.builder()
                .blocker(currentUser)
                .blocked(target)
                .build();
        blockedUserRepo.save(block);

        return Map.of("blocked", true, "userId", targetId);
    }

    /** Unblock targetId by currentUser */
    @Transactional
    public Map<String, Object> unblockUser(User currentUser, Long targetId) {
        blockedUserRepo.findByBlockerIdAndBlockedId(currentUser.getId(), targetId)
                .ifPresent(blockedUserRepo::delete);

        return Map.of("blocked", false, "userId", targetId);
    }

    /** Check if currentUser has blocked targetId */
    public boolean isBlocked(Long blockerId, Long blockedId) {
        return blockedUserRepo.existsByBlockerIdAndBlockedId(blockerId, blockedId);
    }

    /** Check block status from both sides */
    public Map<String, Boolean> getBlockStatus(User currentUser, Long targetId) {
        boolean iBlockedThem = blockedUserRepo.existsByBlockerIdAndBlockedId(currentUser.getId(), targetId);
        boolean theyBlockedMe = blockedUserRepo.existsByBlockerIdAndBlockedId(targetId, currentUser.getId());
        return Map.of(
                "iBlockedThem", iBlockedThem,
                "theyBlockedMe", theyBlockedMe,
                "anyBlocked", iBlockedThem || theyBlockedMe
        );
    }
}
