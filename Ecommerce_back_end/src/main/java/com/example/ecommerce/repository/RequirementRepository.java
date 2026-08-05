package com.example.ecommerce.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.example.ecommerce.entity.Requirement;
import com.example.ecommerce.enums.RequirementStatus;
import com.example.ecommerce.enums.RequirementType;

@Repository
public interface RequirementRepository extends JpaRepository<Requirement, Long> {

    // 1. Đổi Long -> String ở đây
    List<Requirement> findByUserIdOrderByCreatedAtDesc(String userId);

    List<Requirement> findByStatusOrderByCreatedAtDesc(RequirementStatus status);

    List<Requirement> findByTypeOrderByCreatedAtDesc(RequirementType type);

    List<Requirement> findByTypeAndStatusOrderByCreatedAtDesc(RequirementType type, RequirementStatus status);

    // 2. Đổi Long -> String ở đây (Sửa lỗi bạn đang gặp)
    boolean existsByUserIdAndTypeAndStatus(String userId, RequirementType type, RequirementStatus status);

    // 3. Đổi Long -> String ở đây
    Optional<Requirement> findFirstByUserIdAndTypeAndStatus(String userId, RequirementType type, RequirementStatus status);
}