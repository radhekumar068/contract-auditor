package com.contractauditor;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class ContractAuditorApplication {

    public static void main(String[] args) {
        SpringApplication.run(ContractAuditorApplication.class, args);
    }
}
