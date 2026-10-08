package com.reinasleo.api.controller;

import com.reinasleo.api.dto.TelegramLinkChallengeResponse;
import com.reinasleo.api.exception.UnauthorizedException;
import com.reinasleo.api.model.User;
import com.reinasleo.api.security.SiteSessionClaims;
import com.reinasleo.api.service.TelegramIdentityService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RestController;
import java.util.Arrays;
import java.util.Set;
import java.util.stream.Collectors;

@RestController
public class TelegramLinkController {
    private final TelegramIdentityService identities;
    private final SiteSessionClaims claims;
    private final Set<String> allowedOrigins;

    public TelegramLinkController(TelegramIdentityService identities, SiteSessionClaims claims,
                                  @Value("$" + "{app.cors.allowed-origins}") String[] allowedOrigins) {
        this.identities = identities;
        this.claims = claims;
        this.allowedOrigins = Arrays.stream(allowedOrigins).map(String::trim).collect(Collectors.toUnmodifiableSet());
    }

    @PostMapping("/api/auth/me/telegram-link/challenge")
    public ResponseEntity<TelegramLinkChallengeResponse> challenge(@AuthenticationPrincipal User user,
                                                                  HttpServletRequest request) {
        String origin = request.getHeader("Origin");
        if (origin != null && !allowedOrigins.contains(origin)) throw new UnauthorizedException("site_origin_required");
        var response = identities.issue(claims.requireCookie(request, user.getId()));
        return ResponseEntity.status(201).cacheControl(CacheControl.noStore()).body(response);
    }
}
