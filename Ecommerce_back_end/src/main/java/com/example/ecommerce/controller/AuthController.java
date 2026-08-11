package com.example.ecommerce.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.example.ecommerce.config.JwtTokenProvider;
import com.example.ecommerce.entity.User;
import com.example.ecommerce.request.FirebaseLoginRequest;
import com.example.ecommerce.response.UserResponse;
import com.example.ecommerce.service.UserService;
import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseAuthException;
import com.google.firebase.auth.FirebaseToken;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = "http://localhost:5173")
public class AuthController {

    @Autowired
    private UserService userService;
    @Autowired
    private JwtTokenProvider jwtTokenProvider;

    @PostMapping("/firebase-login")
    public ResponseEntity<?> firebaseLogin(@RequestBody FirebaseLoginRequest request) {
        try {
            // 1. Xác thực ID Token từ Frontend gửi lên bằng Firebase Admin SDK [cite: 9,
            // 10]
            FirebaseToken decodedToken = FirebaseAuth.getInstance().verifyIdToken(request.getToken());

            // 2. Lấy thông tin từ Token giải mã
            String uid = decodedToken.getUid();
            String email = decodedToken.getEmail();
            String name = decodedToken.getName();
            String picture = decodedToken.getPicture();

            if (email == null) {
                email = uid + "@firebase.com";
            }

            User user = userService.processFirebaseUser(uid, email, name, picture);

            String mySystemJwt = jwtTokenProvider.generateToken(email, user.getRole());

            UserResponse userResponse = mapToUserResponse(user, mySystemJwt);

            return ResponseEntity.ok(userResponse);

        } catch (FirebaseAuthException e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body("fire base token verified faild: " + e.getMessage());
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("system error: " + e.getMessage());
        }
    }

    private UserResponse mapToUserResponse(User user, String jwtToken) {
        UserResponse response = new UserResponse();

        response.setId(user.getId());
        response.setUsername(user.getUsername());
        response.setEmail(user.getEmail());
        response.setPhoneNumber(user.getPhoneNumber());
        response.setFullName(user.getFullName());
        response.setDateOfBirth(user.getDateOfBirth());
        response.setGender(user.getGender());
        response.setStatus(user.getStatus());
        response.setRole(user.getRole());
        response.setPostalCode(user.getPostalCode());
        response.setCreatedAt(user.getCreatedAt());
        response.setUpdatedAt(user.getUpdatedAt());

        response.setToken(jwtToken);

        return response;
    }
}