package com.contractauditor.service;

import com.contractauditor.dto.response.AnalyticsResponse;
import com.contractauditor.dto.response.CalendarDayResponse;
import com.contractauditor.dto.response.DashboardResponse;
import com.contractauditor.dto.response.TimelineEventResponse;
import java.util.List;

public interface AnalyticsService {

    AnalyticsResponse getAnalytics(int year);

    DashboardResponse getDashboard(int year);

    List<CalendarDayResponse> getCalendar(int year, int month);

    List<TimelineEventResponse> getTimeline(int year);
}
