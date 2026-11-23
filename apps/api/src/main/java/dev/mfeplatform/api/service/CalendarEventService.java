package dev.mfeplatform.api.service;

import java.time.LocalDate;
import java.time.LocalTime;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.UUID;
import java.util.function.Supplier;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import dev.mfeplatform.api.common.ApiException;
import dev.mfeplatform.api.dto.CalendarEventReq;
import dev.mfeplatform.api.dto.CalendarEventRes;
import dev.mfeplatform.api.model.CalendarEventInput;
import dev.mfeplatform.api.repository.CalendarEventRepository;
import dev.mfeplatform.api.repository.CustomerRepository;

/**
 * 行程的業務規則：一次查詢最多 62 天（月曆畫面含前後補位約 6 週）；行程必須屬於存在的客戶。
 */
@Service
public class CalendarEventService {

	/** 單次查詢的最大天數 */
	public static final long MAX_RANGE_DAYS = 62;

	private final CalendarEventRepository events;
	private final CustomerRepository customers;

	/**
	 * @param events    行程資料
	 * @param customers 客戶資料
	 */
	public CalendarEventService(CalendarEventRepository events, CustomerRepository customers) {
		this.events = events;
		this.customers = customers;
	}

	/**
	 * @param from 起始日期（含）
	 * @param to   結束日期（含）
	 * @return 期間內的行程
	 */
	public List<CalendarEventRes> list(LocalDate from, LocalDate to) {
		if (to.isBefore(from) || ChronoUnit.DAYS.between(from, to) > MAX_RANGE_DAYS) {
			throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_DATE_RANGE",
					"查詢期間不正確，最多 " + MAX_RANGE_DAYS + " 天");
		}
		return events.findBetween(from, to).stream().map(CalendarEventRes::from).toList();
	}

	/**
	 * @param request   行程資料
	 * @param createdBy 建立者
	 * @return 新行程
	 */
	@Transactional
	public CalendarEventRes create(CalendarEventReq request, UUID createdBy) {
		CalendarEventInput input = toInput(request);
		requireCustomer(input.customerId());
		UUID id = saveOrReject(() -> events.insert(input, createdBy));
		return findRes(id);
	}

	/**
	 * @param id      行程識別碼
	 * @param request 行程資料
	 * @return 更新後的行程
	 */
	@Transactional
	public CalendarEventRes update(UUID id, CalendarEventReq request) {
		CalendarEventInput input = toInput(request);
		requireCustomer(input.customerId());
		boolean updated = saveOrReject(() -> events.update(id, input));
		if (!updated) {
			throw notFound();
		}
		return findRes(id);
	}

	/**
	 * @param id 行程識別碼
	 */
	@Transactional
	public void delete(UUID id) {
		if (!events.delete(id)) {
			throw notFound();
		}
	}

	private CalendarEventRes findRes(UUID id) {
		return events.findById(id).map(CalendarEventRes::from).orElseThrow(CalendarEventService::notFound);
	}

	private void requireCustomer(UUID customerId) {
		if (!customers.existsById(customerId)) {
			throw customerNotFound();
		}
	}

	/** 檢查客戶存在後，客戶仍可能在同一時間被刪除，外鍵錯誤也轉成相同訊息 */
	private static <T> T saveOrReject(Supplier<T> save) {
		try {
			return save.get();
		} catch (DataIntegrityViolationException exception) {
			throw customerNotFound();
		}
	}

	private static CalendarEventInput toInput(CalendarEventReq request) {
		String note = request.note() == null ? "" : request.note().trim();
		return new CalendarEventInput(request.customerId(), request.eventDate(), LocalTime.parse(request.startTime()),
				request.title().trim(), note);
	}

	private static ApiException notFound() {
		return new ApiException(HttpStatus.NOT_FOUND, "EVENT_NOT_FOUND", "找不到這筆行程，可能已被刪除");
	}

	private static ApiException customerNotFound() {
		return new ApiException(HttpStatus.NOT_FOUND, "CUSTOMER_NOT_FOUND", "找不到這位客戶，可能已被刪除");
	}
}
