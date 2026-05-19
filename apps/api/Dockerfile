# syntax=docker/dockerfile:1.7

# ---- build stage ----
FROM eclipse-temurin:21-jdk-jammy AS build

WORKDIR /workspace

COPY gradlew settings.gradle.kts build.gradle.kts ./
COPY gradle ./gradle

RUN --mount=type=cache,target=/root/.gradle \
    ./gradlew --version && ./gradlew dependencies -q --no-daemon || true

COPY src ./src

RUN --mount=type=cache,target=/root/.gradle \
    ./gradlew bootJar -x test --no-daemon

RUN cp build/libs/reinasleo-api-*.jar /workspace/app.jar

# ---- runtime stage ----
FROM eclipse-temurin:21-jre-jammy AS runtime

RUN useradd --system --create-home --shell /usr/sbin/nologin --uid 1001 spring

WORKDIR /app

COPY --from=build --chown=spring:spring /workspace/app.jar /app/app.jar

USER spring

ENV SPRING_PROFILES_ACTIVE=prod \
    JAVA_OPTS="-XX:MaxRAMPercentage=75 -XX:+ExitOnOutOfMemoryError"

EXPOSE 8080

# Health probes are owned by the orchestrator (compose / K8s / nginx upstream),
# which hits GET /api/health. No in-image HEALTHCHECK to keep the runtime slim.

ENTRYPOINT ["sh", "-c", "exec java $JAVA_OPTS -jar /app/app.jar"]
