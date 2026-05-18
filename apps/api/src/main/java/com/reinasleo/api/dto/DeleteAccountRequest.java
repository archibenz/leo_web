package com.reinasleo.api.dto;

import jakarta.validation.constraints.NotBlank;

/**
 * R1 (GDPR Art.17 / 152-ФЗ) — soft-delete confirmation payload.
 *
 * <p>{@code credential} is the user's current password for email-auth users,
 * or telegramId (as a decimal string) for Telegram-only accounts.
 * Empty string is accepted for accounts that have neither — service decides.</p>
 *
 * <p>{@code confirmation} must literally equal {@code "DELETE"} so a stray
 * call cannot wipe an account without explicit intent.</p>
 */
public record DeleteAccountRequest(
        String credential,
        @NotBlank String confirmation
) {
}
