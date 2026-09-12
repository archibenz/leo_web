package com.reinasleo.api.service.storefront;

import org.springframework.cache.Cache;
import org.springframework.cache.CacheManager;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * Сброс кэшей витрины — ПОСЛЕ коммита, а не внутри транзакции.
 *
 * `@CacheEvict` на транзакционном методе срабатывает, когда метод вернулся, то
 * есть до коммита. Между сбросом и коммитом успевает пройти публичный запрос,
 * прочитать ещё старые данные и залить их обратно в Caffeine на пять минут, а
 * `revalidateTag` следом утащит их в Next на десять. Ровно тот довод, по
 * которому вызов Next вынесен в контроллер, — поэтому и сброс живёт здесь и
 * зовётся оттуда же.
 *
 * Зовётся явно, а не аннотацией: аннотация снова привязала бы момент сброса к
 * возврату из метода, и следующий читатель не увидел бы, что момент важен.
 */
@Component
public class StorefrontCaches {

    private static final List<String> AFFECTED = List.of("storefront", "products", "homepage", "lookbook");

    private final CacheManager caches;

    public StorefrontCaches(CacheManager caches) {
        this.caches = caches;
    }

    public void drop() {
        for (String name : AFFECTED) {
            Cache cache = caches.getCache(name);
            if (cache != null) {
                cache.clear();
            }
        }
    }
}
