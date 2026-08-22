package com.contractauditor.controller;

import com.contractauditor.dto.response.AnalyticsResponse;
import com.contractauditor.dto.response.CalendarDayResponse;
import com.contractauditor.dto.response.DashboardResponse;
import com.contractauditor.dto.response.TimelineEventResponse;
import com.contractauditor.service.AnalyticsService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.time.LocalDate;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/analytics")
@PreAuthorize("hasRole('USER')")
@Tag(name = "Analytics", description = "Cost analytics and renewal timeline")
public class AnalyticsController {

    private static final Logger log = LoggerFactory.getLogger(AnalyticsController.class);

    private final AnalyticsService analyticsService;

    public AnalyticsController(AnalyticsService analyticsService) {
        this.analyticsService = analyticsService;
    }

    @GetMapping
    @Operation(summary = "Get cost analytics for a year")
    public AnalyticsResponse getAnalytics(@RequestParam(defaultValue = "0") int year) {
        int resolvedYear = year > 0 ? year : LocalDate.now().getYear();
        log.info("AnalyticsController.getAnalytics received year={} resolvedYear={}", year, resolvedYear);
        AnalyticsResponse response = analyticsService.getAnalytics(resolvedYear);
        log.info("AnalyticsController.getAnalytics returning healthScore={}", response.healthScore());
        return response;
    }

    @GetMapping("/timeline")
    @Operation(summary = "Get renewal timeline for a year")
    public List<TimelineEventResponse> getTimeline(@RequestParam(defaultValue = "0") int year) {
        int resolvedYear = year > 0 ? year : LocalDate.now().getYear();
        log.info("AnalyticsController.getTimeline received year={} resolvedYear={}", year, resolvedYear);
        List<TimelineEventResponse> response = analyticsService.getTimeline(resolvedYear);
        log.info("AnalyticsController.getTimeline returning events={}", response.size());
        return response;
    }

    @GetMapping("/dashboard")
    @Operation(summary = "Get dashboard summary with health score and urgent actions")
    public DashboardResponse getDashboard(@RequestParam(defaultValue = "0") int year) {
        int resolvedYear = year > 0 ? year : LocalDate.now().getYear();
        log.info("AnalyticsController.getDashboard received year={} resolvedYear={}", year, resolvedYear);
        DashboardResponse response = analyticsService.getDashboard(resolvedYear);
        log.info(
                "AnalyticsController.getDashboard returning urgentActions={}",
                response.urgentActions() == null ? 0 : response.urgentActions().size());
        return response;
    }

    @GetMapping("/calendar")
    @Operation(summary = "Get billing calendar for a month")
    public List<CalendarDayResponse> getCalendar(
            @RequestParam(defaultValue = "0") int year,
            @RequestParam(defaultValue = "0") int month) {
        LocalDate now = LocalDate.now();
        int resolvedYear = year > 0 ? year : now.getYear();
        int resolvedMonth = month > 0 ? month : now.getMonthValue();
        log.info(
                "AnalyticsController.getCalendar received year={} month={} resolvedYear={} resolvedMonth={}",
                year,
                month,
                resolvedYear,
                resolvedMonth);
        List<CalendarDayResponse> response = analyticsService.getCalendar(resolvedYear, resolvedMonth);
        log.info("AnalyticsController.getCalendar returning days={}", response.size());
        return response;
    }
}
