package com.reinasleo.api.service;

import com.reinasleo.api.dto.ContactRequest;
import com.reinasleo.api.model.ContactMessage;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CopyOnWriteArrayList;

@Service
public class ContactService {

    private final List<ContactMessage> messages = new CopyOnWriteArrayList<>();

    public ContactMessage save(ContactRequest request) {
        ContactMessage message = new ContactMessage(
                UUID.randomUUID(),
                request.name(),
                request.email(),
                request.message(),
                Instant.now()
        );
        messages.add(message);
        return message;
    }

    public List<ContactMessage> list() {
        return List.copyOf(messages);
    }
}
