package com.contractauditor.service;

import com.contractauditor.dto.request.ConnectEmailRequest;
import com.contractauditor.dto.request.ImportDiscoveredRequest;
import com.contractauditor.dto.response.EmailConnectionStatusResponse;
import com.contractauditor.dto.response.EmailDiscoveryAuthUrlResponse;
import com.contractauditor.dto.response.EmailDiscoveryImportResponse;
import com.contractauditor.dto.response.EmailDiscoveryScanResponse;

public interface EmailDiscoveryService {

    EmailConnectionStatusResponse getStatus();

    EmailDiscoveryAuthUrlResponse getAuthUrl();

    EmailConnectionStatusResponse connect(ConnectEmailRequest request);

    EmailDiscoveryScanResponse scan();

    EmailDiscoveryImportResponse importSelected(ImportDiscoveredRequest request);

    void disconnect();
}
