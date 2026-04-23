package com.reinasleo.api.service;

import com.reinasleo.api.model.Product;
import com.reinasleo.api.model.ProductInterestEvent;
import com.reinasleo.api.model.User;
import com.reinasleo.api.repository.ProductInterestEventRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AnalyticsService {

    private final ProductInterestEventRepository eventRepository;

    public AnalyticsService(ProductInterestEventRepository eventRepository) {
        this.eventRepository = eventRepository;
    }

    @Transactional
    public void trackEvent(User user, Product product, String eventType) {
        eventRepository.save(new ProductInterestEvent(user, product, eventType));
    }
}
