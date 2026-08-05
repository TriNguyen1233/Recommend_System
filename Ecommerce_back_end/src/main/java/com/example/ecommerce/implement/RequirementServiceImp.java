package com.example.ecommerce.implement;

import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.example.ecommerce.entity.Requirement;
import com.example.ecommerce.entity.User;
import com.example.ecommerce.enums.RequirementStatus;
import com.example.ecommerce.enums.RequirementType;
import com.example.ecommerce.repository.RequirementRepository;
import com.example.ecommerce.repository.UserRepository;
import com.example.ecommerce.request.RequirementRequest;
import com.example.ecommerce.request.RequirementStatusDTO;
import lombok.RequiredArgsConstructor;
import com.example.ecommerce.enums.UserRole;
@Service
@RequiredArgsConstructor
public class RequirementServiceImp {

    private final RequirementRepository requirementRepository;
    private final UserRepository userRepository;

    // 1. Create a new requirement from User
    @Transactional
    public Requirement createRequirement(RequirementRequest dto) {
        if (dto.getType() == RequirementType.BECOME_ADMIN) {
            boolean hasPending = requirementRepository.existsByUserIdAndTypeAndStatus(
                    dto.getUserId(),
                    RequirementType.BECOME_ADMIN,
                    RequirementStatus.PENDING);
            if (hasPending) {
                throw new IllegalStateException("You already have a pending admin promotion request!");
            }
        }

        // Convert DTO to Entity and save to DB
        Requirement requirement = Requirement.fromRequest(dto);
        return requirementRepository.save(requirement);
    }

    @Transactional
    public Requirement updateRequirementStatus(Long id, RequirementStatusDTO dto) {
        // Find Requirement by ID
        Requirement req = requirementRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Requirement not found with id: " + id));

        // Update status and admin note
        req.setStatus(dto.getStatus());
        req.setAdminNote(dto.getAdminNote());

        // Promote Role Logic: If APPROVED & Requirement type is BECOME_ADMIN
        if (dto.getStatus() == RequirementStatus.APPROVED && req.getType() == RequirementType.BECOME_ADMIN) {

            User user = userRepository.findById(req.getUserId())
                    .orElseThrow(() -> new RuntimeException("User not found with id: " + req.getUserId()));

            // Update User Role
            user.setRole(UserRole.ADMIN);

            userRepository.save(user);
        }

        return requirementRepository.save(req);
    }

    // 3. Get all requirements (Admin)
    public List<Requirement> getAllRequirements() {
        return requirementRepository.findAll();
    }

    // 4. Get requirements by User ID
    public List<Requirement> getRequirementsByUserId(String userId) {
        return requirementRepository.findByUserIdOrderByCreatedAtDesc(userId);
    }

    // 5. Get requirement details by ID
    public Requirement getRequirementById(Long id) {
        return requirementRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Requirement not found with id: " + id));
    }
}