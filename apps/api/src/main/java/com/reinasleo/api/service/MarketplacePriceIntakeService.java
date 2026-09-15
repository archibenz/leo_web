package com.reinasleo.api.service;

import com.reinasleo.api.dto.MarketplacePriceItemRequest;
import com.reinasleo.api.dto.MarketplacePriceIntakeResponse;
import com.reinasleo.api.dto.MarketplacePriceRowError;
import com.reinasleo.api.model.MarketplacePrice;
import com.reinasleo.api.repository.MarketplacePriceRepository;
import com.reinasleo.api.repository.ProductRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.Optional;

@Service
public class MarketplacePriceIntakeService {

    private final MarketplacePriceRepository marketplacePriceRepository;
    private final ProductRepository productRepository;

    public MarketplacePriceIntakeService(MarketplacePriceRepository marketplacePriceRepository,
                                          ProductRepository productRepository) {
        this.marketplacePriceRepository = marketplacePriceRepository;
        this.productRepository = productRepository;
    }

    // Пачка не длиннее 500, обрезка Bean Validation'ом сделана раньше —
    // здесь может быть только "нормальная" по форме строка. Единственная
    // причина отклонить строку на этом уровне — неизвестный productId
    // (структурные правила уже отбили бы весь запрос до сервиса, целиком).
    //
    // Одна плохая строка не топит пачку: цикл продолжает работу после
    // rejected-строки, и остальные варианты пачки принимаются как обычно —
    // ради этого ошибка накапливается в список, а не бросается исключением.
    //
    // Приём никогда не стирает: цикл трогает только те (productId, source),
    // что реально пришли в этой пачке. Вариант, которого в пачке нет,
    // здесь просто не упоминается и его строка остаётся как была.
    @Transactional
    public MarketplacePriceIntakeResponse intake(List<MarketplacePriceItemRequest> items) {
        int updated = 0;
        int unchanged = 0;
        List<MarketplacePriceRowError> errors = new ArrayList<>();

        for (int i = 0; i < items.size(); i++) {
            MarketplacePriceItemRequest item = items.get(i);

            if (!productRepository.existsById(item.productId())) {
                errors.add(new MarketplacePriceRowError(
                        "items[" + i + "].productId", "unknown productId"));
                continue;
            }

            Optional<MarketplacePrice> existing = item.source() == null
                    ? marketplacePriceRepository.findByProductIdAndSourceIsNull(item.productId())
                    : marketplacePriceRepository.findByProductIdAndSource(item.productId(), item.source());

            Instant now = Instant.now();

            if (existing.isPresent()) {
                MarketplacePrice row = existing.get();
                boolean changed = !Objects.equals(row.getBuyerPriceKop(), item.buyerPriceKop())
                        || !Objects.equals(row.getCostPriceKop(), item.costPriceKop())
                        || !Objects.equals(row.getCapturedAt(), item.capturedAt());

                row.setBuyerPriceKop(item.buyerPriceKop());
                row.setCostPriceKop(item.costPriceKop());
                row.setCapturedAt(item.capturedAt());
                // received_at обновляется в любом случае — он отвечает на
                // "когда мы в последний раз видели эту строку в пачке", не
                // на "изменились ли значения". Повтор той же пачки не меняет
                // buyer/cost/captured, но received_at честно двигается: мост
                // не молчал, просто источник не поменялся.
                row.setReceivedAt(now);
                marketplacePriceRepository.save(row);

                if (changed) updated++; else unchanged++;
            } else {
                MarketplacePrice row = new MarketplacePrice();
                row.setProductId(item.productId());
                row.setSource(item.source());
                row.setBuyerPriceKop(item.buyerPriceKop());
                row.setCostPriceKop(item.costPriceKop());
                row.setCapturedAt(item.capturedAt());
                row.setReceivedAt(now);
                marketplacePriceRepository.save(row);
                updated++;
            }
        }

        return new MarketplacePriceIntakeResponse(updated + unchanged, updated, unchanged, errors.size(), errors);
    }
}
