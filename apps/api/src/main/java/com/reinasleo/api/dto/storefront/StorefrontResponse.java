package com.reinasleo.api.dto.storefront;

import com.fasterxml.jackson.annotation.JsonInclude;

import java.util.List;

/**
 * `brokenDrafts` заполняется ТОЛЬКО в предпросмотре и только теми строками,
 * чей черновик не прочитался. В публичном ответе поле равно null и, благодаря
 * NON_NULL, из JSON исчезает целиком — покупатель о черновиках не знает.
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record StorefrontResponse(List<StorefrontProduct> products, List<StorefrontSet> sets,
                                 List<StorefrontSectionDto> sections,
                                 List<StorefrontBrokenDraft> brokenDrafts) {

    public StorefrontResponse(List<StorefrontProduct> products, List<StorefrontSet> sets,
                              List<StorefrontSectionDto> sections) {
        this(products, sets, sections, null);
    }
}
