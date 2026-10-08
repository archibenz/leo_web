package com.reinasleo.api.controller;

import com.reinasleo.api.dto.AnalyticsSessionResponse;
import com.reinasleo.api.model.User;
import com.reinasleo.api.security.SiteSessionClaims;
import com.reinasleo.api.service.TelegramIdentityService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class AdminAnalyticsSessionController {
    private final TelegramIdentityService identities;
    private final SiteSessionClaims claims;

    public AdminAnalyticsSessionController(TelegramIdentityService identities, SiteSessionClaims claims) {
        this.identities = identities;
        this.claims = claims;
    }

    @GetMapping("/api/admin/analytics-session")
    public ResponseEntity<AnalyticsSessionResponse> session(@AuthenticationPrincipal User user,
                                                           HttpServletRequest request) {
        var response = identities.analyticsSession(claims.requireCookie(request, user.getId()));
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(response);
    }
}
