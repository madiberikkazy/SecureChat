package com.securechat.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.*;
import org.springframework.web.cors.*;
import org.springframework.web.filter.CorsFilter;
import org.springframework.web.servlet.config.annotation.*;

import java.nio.file.*;

@Configuration
public class AppConfig implements WebMvcConfigurer {

    @Value("${app.upload.dir:uploads/}")
    private String uploadDir;

    // ===== CORS — кез келген device-тан қосылу =====
    @Bean
    public CorsFilter corsFilter() {
        CorsConfiguration config = new CorsConfiguration();
        config.addAllowedOriginPattern("*");
        config.addAllowedHeader("*");
        config.addAllowedMethod("*");
        config.setAllowCredentials(true);
        config.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return new CorsFilter(source);
    }

    // ===== Статикалық файлдарды (аватарлар) URL арқылы беру =====
    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        String uploadPath = uploadDir;
        if (!uploadPath.endsWith("/")) uploadPath += "/";

        // /uploads/** => uploads/ папкасы
        registry.addResourceHandler("/uploads/**")
                .addResourceLocations("file:" + uploadPath);
    }

    // Upload папкасын жасау (жоқ болса)
    @Bean
    public Boolean initUploadDirs() {
        try {
            Files.createDirectories(Paths.get(uploadDir, "avatars"));
            Files.createDirectories(Paths.get(uploadDir, "files"));
        } catch (Exception e) {
            System.err.println("Upload dir create error: " + e.getMessage());
        }
        return true;
    }
}
