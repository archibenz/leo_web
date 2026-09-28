import org.springframework.boot.gradle.plugin.SpringBootPlugin

plugins {
    java
    id("org.springframework.boot") version "3.3.4"
    id("io.spring.dependency-management") version "1.1.6"
}

group = "com.reinasleo"
version = "0.1.0"

java {
    toolchain {
        languageVersion = JavaLanguageVersion.of(21)
    }
}

repositories {
    mavenCentral()
}

dependencies {
    implementation(platform(SpringBootPlugin.BOM_COORDINATES))
    implementation("org.springframework.boot:spring-boot-starter-web")
    implementation("org.springframework.boot:spring-boot-starter-validation")
    implementation("org.springframework.boot:spring-boot-starter-actuator")
    implementation("org.springframework.boot:spring-boot-starter-data-jpa")
    implementation("org.springframework.boot:spring-boot-starter-security")
    implementation("org.springframework.boot:spring-boot-starter-cache")

    implementation("io.micrometer:micrometer-registry-prometheus")
    implementation("net.logstash.logback:logstash-logback-encoder:7.4")

    implementation("com.bucket4j:bucket4j-core:8.10.1")
    implementation("com.github.ben-manes.caffeine:caffeine:3.1.8")

    implementation("org.flywaydb:flyway-core")
    implementation("org.flywaydb:flyway-database-postgresql")
    implementation("io.jsonwebtoken:jjwt-api:0.12.6")
    runtimeOnly("io.jsonwebtoken:jjwt-impl:0.12.6")
    runtimeOnly("io.jsonwebtoken:jjwt-jackson:0.12.6")
    runtimeOnly("org.postgresql:postgresql")

    testImplementation("org.springframework.boot:spring-boot-starter-test")
    testImplementation("org.springframework.security:spring-security-test")
    testRuntimeOnly("com.h2database:h2")
}

tasks.withType<Test> {
    useJUnitPlatform()
    // Явный потолок вместо тишины дефолта JVM: самая тяжёлая фикстура — 24 Мп
    // шума (~96 МБ на растр) плюс Spring-контекст. На маленькой CI-машине без
    // явного предела именно этот тест первым кладёт задачу test.
    maxHeapSize = "1g"
}

// Релиз API в отчётах об ошибках (app_error): sha12 коммита сборки. До 28.09
// там стояло unknown — APP_RELEASE на проде не задан, и по отчёту было не
// понять, какая сборка упала. Коммит зашивается в jar при сборке
// (build-release.properties → app.build.commit), выкатку менять не нужно;
// явный APP_RELEASE по-прежнему побеждает (application.yml). Вне git — файл
// пустой, и остаётся unknown, а не выдумка.
val generateBuildRelease by tasks.registering {
    val out = layout.buildDirectory.dir("generated-resources/release")
    val commit = providers.exec {
        commandLine("git", "rev-parse", "--short=12", "HEAD")
        isIgnoreExitValue = true
    }.standardOutput.asText
    outputs.dir(out)
    // Коммит меняется без правки файлов проекта — кэшу задачи верить нельзя.
    outputs.upToDateWhen { false }
    doLast {
        val sha = runCatching { commit.get().trim() }.getOrDefault("")
        val file = out.get().file("build-release.properties").asFile
        file.parentFile.mkdirs()
        file.writeText(if (Regex("^[0-9a-f]{12}$").matches(sha)) "app.build.commit=$sha\n" else "")
    }
}

sourceSets.main {
    resources.srcDir(generateBuildRelease)
}
