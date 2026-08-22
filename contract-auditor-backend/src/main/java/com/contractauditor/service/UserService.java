package com.contractauditor.service;

import com.contractauditor.dto.request.ChangePasswordRequest;
import com.contractauditor.dto.request.UpdateProfileRequest;
import com.contractauditor.dto.response.ProfileResponse;
import com.contractauditor.dto.response.UpdateProfileResponse;

public interface UserService {

    ProfileResponse getCurrentProfile();

    UpdateProfileResponse updateCurrentProfile(UpdateProfileRequest request);

    void changePassword(ChangePasswordRequest request);
}
