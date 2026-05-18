package com.reinasleo.api.util;

import com.reinasleo.api.exception.BadRequestException;
import org.junit.jupiter.api.Test;

import java.nio.file.Path;
import java.nio.file.Paths;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class FilenameSanitizerTest {

    @Test
    void sanitize_validName_returnsBasename() {
        assertThat(FilenameSanitizer.sanitize("photo.jpg")).isEqualTo("photo.jpg");
        assertThat(FilenameSanitizer.sanitize("My_Photo-01.png")).isEqualTo("My_Photo-01.png");
    }

    @Test
    void sanitize_nullOrBlank_throwsFilenameRequired() {
        assertThatThrownBy(() -> FilenameSanitizer.sanitize(null))
                .isInstanceOf(BadRequestException.class)
                .hasMessage("filename_required");
        assertThatThrownBy(() -> FilenameSanitizer.sanitize(""))
                .isInstanceOf(BadRequestException.class)
                .hasMessage("filename_required");
        assertThatThrownBy(() -> FilenameSanitizer.sanitize("   "))
                .isInstanceOf(BadRequestException.class)
                .hasMessage("filename_required");
    }

    @Test
    void sanitize_dotDotPosixTraversal_throwsTraversal() {
        assertThatThrownBy(() -> FilenameSanitizer.sanitize("../etc/passwd"))
                .isInstanceOf(BadRequestException.class)
                .hasMessage("filename_traversal");
        assertThatThrownBy(() -> FilenameSanitizer.sanitize("../../../etc/passwd"))
                .isInstanceOf(BadRequestException.class)
                .hasMessage("filename_traversal");
        assertThatThrownBy(() -> FilenameSanitizer.sanitize(".."))
                .isInstanceOf(BadRequestException.class)
                .hasMessage("filename_traversal");
    }

    @Test
    void sanitize_absolutePosixPath_throwsTraversal() {
        // A browser multipart never sends an absolute path; only an attacker does.
        // We reject outright rather than silently basenaming so the upload dir is
        // not polluted with attacker-chosen leafnames like "passwd".
        assertThatThrownBy(() -> FilenameSanitizer.sanitize("/etc/passwd"))
                .isInstanceOf(BadRequestException.class)
                .hasMessage("filename_traversal");
    }

    @Test
    void sanitize_windowsTraversal_throwsTraversal() {
        // Any backslash in the original is treated as a separator; reject outright
        // rather than risk Java's POSIX Paths.get keeping the whole thing as one
        // basename and matching the alnum whitelist by accident.
        assertThatThrownBy(() -> FilenameSanitizer.sanitize("..\\..\\windows\\system32"))
                .isInstanceOf(BadRequestException.class)
                .hasMessage("filename_traversal");
    }

    @Test
    void sanitize_leadingDot_throwsTraversal() {
        assertThatThrownBy(() -> FilenameSanitizer.sanitize(".htaccess"))
                .isInstanceOf(BadRequestException.class)
                .hasMessage("filename_traversal");
        assertThatThrownBy(() -> FilenameSanitizer.sanitize(".env"))
                .isInstanceOf(BadRequestException.class)
                .hasMessage("filename_traversal");
    }

    @Test
    void sanitize_nulByte_throwsInvalidChars() {
        // NUL truncation attack on JNI / native syscalls. Built dynamically so
        // the source file stays plain ASCII.
        String withNul = "evil" + ((char) 0) + ".jpg";
        assertThatThrownBy(() -> FilenameSanitizer.sanitize(withNul))
                .isInstanceOf(BadRequestException.class)
                .hasMessage("filename_invalid_chars");
    }

    @Test
    void sanitize_spaceOrCyrillic_throwsInvalidChars() {
        // Cyrillic via Unicode escape keeps the source file ASCII.
        String cyrillic = "файл.jpg";
        assertThatThrownBy(() -> FilenameSanitizer.sanitize(cyrillic))
                .isInstanceOf(BadRequestException.class)
                .hasMessage("filename_invalid_chars");
        assertThatThrownBy(() -> FilenameSanitizer.sanitize("my photo.jpg"))
                .isInstanceOf(BadRequestException.class)
                .hasMessage("filename_invalid_chars");
    }

    @Test
    void sanitize_urlEncodedTraversal_throwsTraversal() {
        // %2F is not decoded by Paths.get; the literal sequence still starts
        // with ".." so the traversal check fires first.
        assertThatThrownBy(() -> FilenameSanitizer.sanitize("..%2F..%2Fetc%2Fpasswd"))
                .isInstanceOf(BadRequestException.class)
                .hasMessage("filename_traversal");
    }

    @Test
    void resolveInside_validBasename_returnsResolvedPath() {
        Path root = Paths.get(System.getProperty("java.io.tmpdir"), "sanitizer-test");
        Path resolved = FilenameSanitizer.resolveInside(root, "photo.jpg");
        assertThat(resolved.startsWith(root.toAbsolutePath().normalize())).isTrue();
        assertThat(resolved.getFileName().toString()).isEqualTo("photo.jpg");
    }

    @Test
    void resolveInside_doesNotEscapeRoot_evenIfBasenameSomehowContainsSlashes() {
        // Defensive: callers must sanitize() first, but resolveInside still rejects
        // a basename that escapes the root after normalisation.
        Path root = Paths.get(System.getProperty("java.io.tmpdir"), "sanitizer-test");
        assertThatThrownBy(() -> FilenameSanitizer.resolveInside(root, "../escaped.txt"))
                .isInstanceOf(BadRequestException.class)
                .hasMessage("filename_outside_dir");
    }
}
