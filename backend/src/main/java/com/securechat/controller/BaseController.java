package com.securechat.controller;

import com.securechat.entity.User;
import com.securechat.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.userdetails.UserDetails;

public abstract class BaseController {

    @Autowired
    protected UserRepository userRepo;

    protected User currentUser(UserDetails ud) {
        return userRepo.findByUsername(ud.getUsername())
                .orElseThrow(() -> new RuntimeException("Пайдаланушы табылмады"));
    }
}
