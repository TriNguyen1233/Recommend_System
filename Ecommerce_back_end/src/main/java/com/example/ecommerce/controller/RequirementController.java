package com.example.ecommerce.controller;

import java.util.List;
import java.util.stream.Collectors;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.example.ecommerce.entity.Requirement;
import com.example.ecommerce.implement.RequirementServiceImp;
import com.example.ecommerce.request.RequirementRequest;
import com.example.ecommerce.request.RequirementStatusDTO;
import com.example.ecommerce.response.RequirementResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/requirements")
@RequiredArgsConstructor
public class RequirementController {

    private final RequirementServiceImp requirementService;

    // 1. Tạo yêu cầu mới từ User
    // POST /api/requirements
    @PostMapping
    public ResponseEntity<RequirementResponse> createRequirement(@Valid @RequestBody RequirementRequest dto) {
        Requirement created = requirementService.createRequirement(dto);
        return ResponseEntity.status(HttpStatus.CREATED).body(RequirementResponse.fromEntity(created));
    }

    // 2. Cập nhật trạng thái yêu cầu & nâng quyền (Admin)
    // PUT /api/requirements/{id}/status
    @PutMapping("/{id}/status")
    public ResponseEntity<RequirementResponse> updateRequirementStatus(
            @PathVariable Long id,
            @Valid @RequestBody RequirementStatusDTO dto) {
        Requirement updated = requirementService.updateRequirementStatus(id, dto);
        return ResponseEntity.ok(RequirementResponse.fromEntity(updated));
    }

    // 3. Lấy tất cả yêu cầu (Admin)
    // GET /api/requirements
    @GetMapping
    public ResponseEntity<List<RequirementResponse>> getAllRequirements() {
        List<RequirementResponse> responseList = requirementService.getAllRequirements()
                .stream()
                .map(RequirementResponse::fromEntity)
                .collect(Collectors.toList());
        return ResponseEntity.ok(responseList);
    }

    // 4. Lấy danh sách yêu cầu của 1 User cụ thể
    // GET /api/requirements/user/{userId}
    @GetMapping("/user/{userId}")
    public ResponseEntity<List<RequirementResponse>> getRequirementsByUserId(@PathVariable String userId) {
        List<RequirementResponse> responseList = requirementService.getRequirementsByUserId(userId)
                .stream()
                .map(RequirementResponse::fromEntity)
                .collect(Collectors.toList());
        return ResponseEntity.ok(responseList);
    }

    // 5. Lấy thông tin chi tiết 1 yêu cầu theo ID
    // GET /api/requirements/{id}
    @GetMapping("/{id}")
    public ResponseEntity<RequirementResponse> getRequirementById(@PathVariable Long id) {
        Requirement requirement = requirementService.getRequirementById(id);
        return ResponseEntity.ok(RequirementResponse.fromEntity(requirement));
    }
}