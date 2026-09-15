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
    // здесь может быть только "нормальная" по форме строка.
    //
    // Неизвестный productId — ПРОПУСК (skipped), не отказ: в аналитике 172
    // артикула, на витрине 87, и ~85 "не найден" — обычный вечер, не мусор.
    // Отказ на этом месте отправитель получал бы каждый вечер, и красное,
    // которое горит всегда, читать перестают. rejected/errors остаются для
    // настоящего мусора — сегодня до сервиса такой мусор не доходит вовсе,
    // потому что бракованная форма отбивает 400 на весь запрос ещё на Bean
    // Validation; поле не убрано, оно про диагноз, который может появиться.
    //
    // Одна пропущенная строка не топит пачку: цикл продолжает работу, и
    // остальные варианты пачки принимаются как обычно.
    //
    // Приём никогда не стирает: цикл трогает только те (productId, source),
    // что реально пришли в этой пачке. Вариант, которого в пачке нет,
    // здесь просто не упоминается и его строка остаётся как была.
    @Transactional
    public MarketplacePriceIntakeResponse intake(List<MarketplacePriceItemRequest> items) {
        int updated = 0;
        int unchanged = 0;
        int skipped = 0;
        List<MarketplacePriceRowError> errors = new ArrayList<>();

        for (MarketplacePriceItemRequest item : items) {
            if (!productRepository.existsById(item.productId())) {
                skipped++;
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
                        || !Objects.equals(row.getCheckedAt(), item.checkedAt());

                row.setBuyerPriceKop(item.buyerPriceKop());
                row.setCostPriceKop(item.costPriceKop());
                row.setCheckedAt(item.checkedAt());
                // received_at обновляется в любом случае — он отвечает на
                // "когда мы в последний раз видели эту строку в пачке", не
                // на "изменились ли значения". Повтор той же пачки не меняет
                // buyer/cost/checked, но received_at честно двигается: мост
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
                row.setCheckedAt(item.checkedAt());
                row.setReceivedAt(now);
                marketplacePriceRepository.save(row);
                updated++;
            }
        }

        return new MarketplacePriceIntakeResponse(
                updated + unchanged, updated, unchanged, skipped, errors.size(), errors);
    }
}
