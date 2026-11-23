package dev.mfeplatform.api.service;

import java.util.List;
import java.util.UUID;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import dev.mfeplatform.api.common.ApiException;
import dev.mfeplatform.api.dto.CustomerOptionRes;
import dev.mfeplatform.api.dto.CustomerReq;
import dev.mfeplatform.api.dto.CustomerRes;
import dev.mfeplatform.api.model.Customer;
import dev.mfeplatform.api.model.CustomerInput;
import dev.mfeplatform.api.repository.CustomerRepository;

/**
 * 客戶的業務規則：名稱不可重複、產業未填時歸為「未分類」、還有行程的客戶不能刪除。
 */
@Service
public class CustomerService {

	/** 產業未填時的預設值 */
	public static final String DEFAULT_INDUSTRY = "未分類";

	private final CustomerRepository customers;

	/**
	 * @param customers 客戶資料
	 */
	public CustomerService(CustomerRepository customers) {
		this.customers = customers;
	}

	/** @return 所有客戶 */
	public List<CustomerRes> list() {
		return customers.findAll().stream().map(CustomerRes::from).toList();
	}

	/** @return 下拉選單用的客戶清單 */
	public List<CustomerOptionRes> options() {
		return customers.findOptions().stream().map(CustomerOptionRes::from).toList();
	}

	/**
	 * @param request   客戶資料
	 * @param createdBy 建立者
	 * @return 新客戶
	 */
	@Transactional
	public CustomerRes create(CustomerReq request, UUID createdBy) {
		try {
			return CustomerRes.from(customers.insert(toInput(request), createdBy));
		} catch (DuplicateKeyException exception) {
			throw duplicateName();
		}
	}

	/**
	 * @param id      客戶識別碼
	 * @param request 客戶資料
	 * @return 更新後的客戶
	 */
	@Transactional
	public CustomerRes update(UUID id, CustomerReq request) {
		try {
			return customers.update(id, toInput(request)).map(CustomerRes::from).orElseThrow(CustomerService::notFound);
		} catch (DuplicateKeyException exception) {
			throw duplicateName();
		}
	}

	/**
	 * 先檢查行程數給出清楚的訊息；並行新增行程時，最後仍由資料庫的外鍵限制擋下。
	 *
	 * <p>不包在交易中：PostgreSQL 的交易在任何錯誤後都不能再查詢，
	 * 外鍵錯誤之後還要重新計算行程數，所以每個步驟各自執行。
	 *
	 * @param id 客戶識別碼
	 */
	public void delete(UUID id) {
		Customer customer = customers.findById(id).orElseThrow(CustomerService::notFound);
		int eventCount = customers.countEvents(id);
		if (eventCount > 0) {
			throw hasEvents(customer.name(), eventCount);
		}
		try {
			customers.delete(id);
		} catch (DataIntegrityViolationException exception) {
			throw hasEvents(customer.name(), customers.countEvents(id));
		}
	}

	/** 去除前後空白，產業未填時套用預設值 */
	private static CustomerInput toInput(CustomerReq request) {
		String industry = trim(request.industry());
		return new CustomerInput(trim(request.name()), industry.isEmpty() ? DEFAULT_INDUSTRY : industry,
				trim(request.contact()), trim(request.phone()), request.level());
	}

	private static String trim(String value) {
		return value == null ? "" : value.trim();
	}

	private static ApiException duplicateName() {
		return new ApiException(HttpStatus.CONFLICT, "DUPLICATE_CUSTOMER_NAME", "已有相同名稱的客戶");
	}

	private static ApiException notFound() {
		return new ApiException(HttpStatus.NOT_FOUND, "CUSTOMER_NOT_FOUND", "找不到這位客戶，可能已被刪除");
	}

	private static ApiException hasEvents(String name, int eventCount) {
		return new ApiException(HttpStatus.CONFLICT, "CUSTOMER_HAS_EVENTS",
				"「" + name + "」還有 " + eventCount + " 筆行程，請先在行事曆刪除或改到其他客戶");
	}
}
