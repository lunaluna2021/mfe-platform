package dev.mfeplatform.api.controller;

import java.util.List;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import dev.mfeplatform.api.dto.CustomerOptionRes;
import dev.mfeplatform.api.dto.CustomerReq;
import dev.mfeplatform.api.dto.CustomerRes;
import dev.mfeplatform.api.service.CustomerService;
import jakarta.validation.Valid;

/**
 * 客戶 API。讀取需要 {@code customer:read}，新增、修改、刪除需要 {@code customer:write}。
 */
@RestController
@RequestMapping("/api/customers")
public class CustomerController {

	private final CustomerService customerService;

	/**
	 * @param customerService 客戶業務規則
	 */
	public CustomerController(CustomerService customerService) {
		this.customerService = customerService;
	}

	/** @return 所有客戶 */
	@GetMapping
	@PreAuthorize("hasAuthority('customer:read')")
	public List<CustomerRes> list() {
		return customerService.list();
	}

	/** @return 下拉選單用的客戶清單 */
	@GetMapping("/options")
	@PreAuthorize("hasAuthority('customer:read')")
	public List<CustomerOptionRes> options() {
		return customerService.options();
	}

	/**
	 * @param request 客戶資料
	 * @param jwt     目前的 access token
	 * @return 201 與新客戶
	 */
	@PostMapping
	@PreAuthorize("hasAuthority('customer:write')")
	public ResponseEntity<CustomerRes> create(@Valid @RequestBody CustomerReq request,
			@AuthenticationPrincipal Jwt jwt) {
		CustomerRes created = customerService.create(request, UUID.fromString(jwt.getSubject()));
		return ResponseEntity.status(HttpStatus.CREATED).body(created);
	}

	/**
	 * @param id      客戶識別碼
	 * @param request 客戶資料
	 * @return 更新後的客戶
	 */
	@PutMapping("/{id}")
	@PreAuthorize("hasAuthority('customer:write')")
	public CustomerRes update(@PathVariable UUID id, @Valid @RequestBody CustomerReq request) {
		return customerService.update(id, request);
	}

	/**
	 * @param id 客戶識別碼
	 * @return 204
	 */
	@DeleteMapping("/{id}")
	@PreAuthorize("hasAuthority('customer:write')")
	public ResponseEntity<Void> delete(@PathVariable UUID id) {
		customerService.delete(id);
		return ResponseEntity.noContent().build();
	}
}
