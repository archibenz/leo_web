package com.reinasleo.api.util;

import com.reinasleo.api.exception.BadRequestException;

import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.regex.Pattern;

public final class FilenameSanitizer {

    // ASCII alphanumerics, dot, dash, underscore only. Length 1..255.
    private static final Pattern SAFE_BASENAME = Pattern.compile("^[A-Za-z0-9._-]{1,255}$");

    private FilenameSanitizer() {
    }

    // Returns a safe basename or throws BadRequestException with a stable code.
    public static String sanitize(String original) {
        if (original == null || original.isBlank()) {
            throw new BadRequestException("filename_required");
        }
        // NUL byte truncates filenames in some JNI / native syscalls.
        if (original.indexOf('\0') >= 0) {
            throw new BadRequestException("filename_invalid_chars");
        }
        // Reject path-bearing inputs outright. A trustworthy uploader (browser
        // multipart) never sends a path; only an attacker does. We do not silently
        // "fix" by basenaming because that would let "/etc/passwd" succeed as
        // "passwd" and pollute the upload dir with attacker-chosen leafnames.
        if (original.indexOf('/') >= 0 || original.indexOf('\\') >= 0) {
            throw new BadRequestException("filename_traversal");
        }
        String basename;
        try {
            Path asPath = Paths.get(original);
            Path leaf = asPath.getFileName();
            basename = leaf == null ? "" : leaf.toString();
        } catch (Exception e) {
            throw new BadRequestException("filename_invalid_chars");
        }
        if (basename.isBlank()) {
            throw new BadRequestException("filename_required");
        }
        if (basename.startsWith(".") || basename.contains("..")) {
            throw new BadRequestException("filename_traversal");
        }
        if (!SAFE_BASENAME.matcher(basename).matches()) {
            throw new BadRequestException("filename_invalid_chars");
        }
        return basename;
    }

    // Resolve sanitizedBasename inside uploadDir, rejecting any escape via
    // symlink-free path normalisation.
    public static Path resolveInside(Path uploadDir, String sanitizedBasename) {
        Path normalisedRoot = uploadDir.toAbsolutePath().normalize();
        Path target = normalisedRoot.resolve(sanitizedBasename).normalize();
        if (!target.startsWith(normalisedRoot)) {
            throw new BadRequestException("filename_outside_dir");
        }
        return target;
    }
}
