package com.reinasleo.api.util;

import com.fasterxml.jackson.core.JsonParser;
import com.fasterxml.jackson.core.JsonToken;
import com.fasterxml.jackson.databind.DeserializationContext;
import com.fasterxml.jackson.databind.JsonDeserializer;
import java.io.IOException;

public class StrictTelegramIdDeserializer extends JsonDeserializer<Long> {
    @Override
    public Long deserialize(JsonParser parser, DeserializationContext context) throws IOException {
        if (!parser.hasToken(JsonToken.VALUE_NUMBER_INT)) {
            return context.reportInputMismatch(Long.class, "telegramId must be a positive integer");
        }
        long value = parser.getLongValue();
        if (value <= 0) {
            return context.reportInputMismatch(Long.class, "telegramId must be a positive integer");
        }
        return value;
    }
}
