package dev.mfeplatform.api.controller;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import org.springframework.format.annotation.DateTimeFormat;
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
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import dev.mfeplatform.api.dto.CalendarEventReq;
import dev.mfeplatform.api.dto.CalendarEventRes;
import dev.mfeplatform.api.service.CalendarEventService;
import jakarta.validation.Valid;

/**
 * 行程 API。讀取需要 {@code calendar:read}，新增、修改、刪除需要 {@code calendar:write}。
 */
@RestController
@RequestMapping("/api/calendar-events")
public class CalendarEventController {

	private final CalendarEventService calendarEventService;

	/**
	 * @param calendarEventService 行程業務規則
	 */
	public CalendarEventController(CalendarEventService calendarEventService) {
		this.calendarEventService = calendarEventService;
	}

	/**
	 * @param from 起始日期（含），格式 YYYY-MM-DD
	 * @param to   結束日期（含）
	 * @return 期間內的行程
	 */
	@GetMapping
	@PreAuthorize("hasAuthority('calendar:read')")
	public List<CalendarEventRes> list(@RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
			@RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
		return calendarEventService.list(from, to);
	}

	/**
	 * @param request 行程資料
	 * @param jwt     目前的 access token
	 * @return 201 與新行程
	 */
	@PostMapping
	@PreAuthorize("hasAuthority('calendar:write')")
	public ResponseEntity<CalendarEventRes> create(@Valid @RequestBody CalendarEventReq request,
			@AuthenticationPrincipal Jwt jwt) {
		CalendarEventRes created = calendarEventService.create(request, UUID.fromString(jwt.getSubject()));
		return ResponseEntity.status(HttpStatus.CREATED).body(created);
	}

	/**
	 * @param id      行程識別碼
	 * @param request 行程資料
	 * @return 更新後的行程
	 */
	@PutMapping("/{id}")
	@PreAuthorize("hasAuthority('calendar:write')")
	public CalendarEventRes update(@PathVariable UUID id, @Valid @RequestBody CalendarEventReq request) {
		return calendarEventService.update(id, request);
	}

	/**
	 * @param id 行程識別碼
	 * @return 204
	 */
	@DeleteMapping("/{id}")
	@PreAuthorize("hasAuthority('calendar:write')")
	public ResponseEntity<Void> delete(@PathVariable UUID id) {
		calendarEventService.delete(id);
		return ResponseEntity.noContent().build();
	}
}
