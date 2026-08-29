package com.contractauditor;

import com.contractauditor.config.EmailDiscoveryProperties;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
@EnableConfigurationProperties(EmailDiscoveryProperties.class)
public class ContractAuditorApplication {

    public static void main(String[] args) {
        SpringApplication.run(ContractAuditorApplication.class, args);
    }
}
