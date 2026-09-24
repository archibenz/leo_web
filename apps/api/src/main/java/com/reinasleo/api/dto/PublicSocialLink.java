package com.reinasleo.api.dto;

/** То, что видит сайт: только показанные сети, без служебной галочки. */
public record PublicSocialLink(String network, String href) {}
