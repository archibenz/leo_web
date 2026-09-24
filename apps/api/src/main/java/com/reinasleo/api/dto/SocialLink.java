package com.reinasleo.api.dto;

/** Соцсеть сайта в админке: сеть, адрес и галочка «показывать на сайте». */
public record SocialLink(String network, String href, Boolean shown) {}
