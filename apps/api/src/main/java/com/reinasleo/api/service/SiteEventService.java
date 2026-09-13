package com.reinasleo.api.service;

import com.reinasleo.api.dto.SiteEventRequest;
import com.reinasleo.api.dto.SiteEventTypes;
import com.reinasleo.api.model.SiteEvent;
import com.reinasleo.api.model.User;
import com.reinasleo.api.repository.SiteEventRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class SiteEventService {

    private final SiteEventRepository siteEventRepository;

    public SiteEventService(SiteEventRepository siteEventRepository) {
        this.siteEventRepository = siteEventRepository;
    }

    @Transactional
    public void recordBatch(List<SiteEventRequest> events, User requester) {
        for (SiteEventRequest req : events) {
            SiteEvent event = new SiteEvent();
            event.setEventType(req.eventType());
            event.setSessionKey(req.sessionKey());
            event.setProductId(req.productId());
            event.setModelId(req.modelId());
            event.setPath(req.path());
            event.setLocale(req.locale());
            event.setDevice(req.device());
            event.setMarketplace(req.marketplace());
            // user_id is server-resolved from the authenticated principal, never
            // from the request body (the endpoint is public — trusting a
            // client-sent id would let anyone attribute events to any account).
            // Restricted further to event types that already require login:
            // views/clicks stay anonymous even for a signed-in visitor.
            boolean eligible = SiteEventTypes.REQUIRES_USER.contains(req.eventType());
            event.setUserId(eligible && requester != null ? requester.getId() : null);
            siteEventRepository.save(event);
        }
    }
}
