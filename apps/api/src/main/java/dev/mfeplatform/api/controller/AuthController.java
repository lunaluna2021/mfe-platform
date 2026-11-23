package dev.mfeplatform.api.controller;

import java.util.UUID;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import dev.mfeplatform.api.dto.LoginReq;
import dev.mfeplatform.api.dto.RefreshTokenReq;
import dev.mfeplatform.api.dto.TokenRes;
import dev.mfeplatform.api.dto.UserRes;
import dev.mfeplatform.api.service.AuthService;
import jakarta.validation.Valid;

/**
 * 登入 API。login、refresh、logout 不需要 access token；me 需要。
 */
@RestController
@RequestMapping("/api/auth")
public class AuthController {

	private final AuthService authService;

	/**
	 * @param authService 登入流程
	 */
	public AuthController(AuthService authService) {
		this.authService = authService;
	}

	/**
	 * @param request email 與密碼
	 * @return token 與登入者資料
	 */
	@PostMapping("/login")
	public TokenRes login(@Valid @RequestBody LoginReq request) {
		return authService.login(request.email(), request.password());
	}

	/**
	 * @param request refresh token
	 * @return 新的 token
	 */
	@PostMapping("/refresh")
	public TokenRes refresh(@Valid @RequestBody RefreshTokenReq request) {
		return authService.refresh(request.refreshToken());
	}

	/**
	 * @param request 要撤銷的 refresh token
	 * @return 204
	 */
	@PostMapping("/logout")
	public ResponseEntity<Void> logout(@Valid @RequestBody RefreshTokenReq request) {
		authService.logout(request.refreshToken());
		return ResponseEntity.noContent().build();
	}

	/**
	 * @param jwt 目前的 access token
	 * @return 登入者資料
	 */
	@GetMapping("/me")
	public UserRes me(@AuthenticationPrincipal Jwt jwt) {
		return authService.currentUser(UUID.fromString(jwt.getSubject()));
	}
}
