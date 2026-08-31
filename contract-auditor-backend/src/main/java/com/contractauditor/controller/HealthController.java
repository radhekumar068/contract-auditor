package com.contractauditor.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirements;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@Tag(name = "Health", description = "Liveness and service discovery")
@SecurityRequirements
public class HealthController {

    private static final Logger log = LoggerFactory.getLogger(HealthController.class);

    @GetMapping("/")
    @Operation(summary = "Root service info")
    public Map<String, String> root() {
        log.info("HealthController.root received");
        Map<String, String> response = Map.of(
                "application", "contract-auditor",
                "status", "UP",
                "apiBase", "/api",
                "auth", "/api/auth/login",
                "health", "/api/health");
        log.info("HealthController.root returning status=UP");
        return response;
    }

    @GetMapping("/api/health")
    @Operation(summary = "Health check")
    public Map<String, String> health() {
        log.info("HealthController.health received");
        Map<String, String> response = Map.of("status", "UP");
        log.info("HealthController.health returning status=UP");
        return response;
    }
}
