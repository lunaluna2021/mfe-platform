package dev.mfeplatform.api.common;

import org.springframework.http.HttpStatus;

/**
 * 可預期的業務錯誤；由 {@link GlobalExceptionHandler} 轉成 {@link dev.mfeplatform.api.dto.ErrorRes} 回應。
 */
public class ApiException extends RuntimeException {

	private final HttpStatus status;
	private final String code;

	/**
	 * @param status  HTTP 狀態碼
	 * @param code    錯誤代碼，前端依此判斷
	 * @param message 給使用者看的訊息
	 */
	public ApiException(HttpStatus status, String code, String message) {
		super(message);
		this.status = status;
		this.code = code;
	}

	/** @return HTTP 狀態碼 */
	public HttpStatus getStatus() {
		return status;
	}

	/** @return 錯誤代碼 */
	public String getCode() {
		return code;
	}
}
