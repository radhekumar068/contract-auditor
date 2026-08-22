package com.contractauditor.mapper;

import com.contractauditor.domain.entity.ContractTerm;
import com.contractauditor.domain.entity.NotificationSchedule;
import com.contractauditor.domain.entity.RenewalHistory;
import com.contractauditor.domain.entity.Subscription;
import com.contractauditor.domain.entity.User;
import com.contractauditor.dto.response.RenewalHistoryResponse;
import com.contractauditor.dto.response.SubscriptionResponse;
import com.contractauditor.dto.response.ProfileResponse;
import com.contractauditor.dto.response.UserResponse;
import java.time.LocalDate;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.Named;

@Mapper(componentModel = "spring")
public interface SubscriptionMapper {

    UserResponse toUserResponse(User user);

    @Mapping(target = "activeDeviceCount", constant = "1")
    ProfileResponse toProfileResponse(User user);

    @Mapping(target = "contractTerm", source = "contractTerm")
    @Mapping(target = "notificationSchedules", source = "notificationSchedules")
    SubscriptionResponse toResponse(Subscription subscription);

    @Mapping(target = "cancellationDeadlineDate", source = ".", qualifiedByName = "computeCancellationDeadline")
    SubscriptionResponse.ContractTermResponse toContractTermResponse(ContractTerm contractTerm);

    SubscriptionResponse.NotificationScheduleResponse toNotificationScheduleResponse(NotificationSchedule schedule);

    @Mapping(target = "subscriptionId", source = "subscription.id")
    @Mapping(target = "subscriptionName", source = "subscription.name")
    RenewalHistoryResponse toRenewalHistoryResponse(RenewalHistory history);

    @Named("computeCancellationDeadline")
    default LocalDate computeCancellationDeadline(ContractTerm term) {
        if (term == null || term.getRenewalDate() == null || term.getCancellationDeadlineDays() == null) {
            return null;
        }
        return term.getRenewalDate().minusDays(term.getCancellationDeadlineDays());
    }
}
