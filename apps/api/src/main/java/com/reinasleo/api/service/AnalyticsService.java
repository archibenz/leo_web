package com.reinasleo.api.service;

import com.reinasleo.api.dto.PopularProductResponse;
import com.reinasleo.api.model.Product;
import com.reinasleo.api.model.ProductInterestEvent;
import com.reinasleo.api.model.User;
import com.reinasleo.api.repository.ProductInterestEventRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

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

    @Transactional(readOnly = true)
    public List<PopularProductResponse> getPopularProducts(int limit) {
        return eventRepository.findTopProducts(limit).stream()
                .map(row -> new PopularProductResponse(
                        (String) row[0],
                        (String) row[1],
                        (Long) row[2]))
                .toList();
    }
}
