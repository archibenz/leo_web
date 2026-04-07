package com.reinasleo.api.config;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebConfig implements WebMvcConfigurer {

    @Value("${app.upload.dir:uploads}")
    private String uploadDir;

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        registry.addResourceHandler("/uploads/**")
                .addResourceLocations("file:" + uploadDir + "/");
    }

    @Bean
    public jakarta.servlet.Filter cacheControlFilter() {
        return (request, response, chain) -> {
            chain.doFilter(request, response);
            if (response instanceof HttpServletResponse res && request instanceof HttpServletRequest req) {
                String path = req.getRequestURI();
                if (path.startsWith("/api/catalog/")) {
                    res.setHeader("Cache-Control", "public, max-age=60, stale-while-revalidate=300");
                } else if (path.startsWith("/api/lookbook")) {
                    res.setHeader("Cache-Control", "public, max-age=300");
                }
            }
        };
    }
}
