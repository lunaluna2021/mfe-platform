package dev.mfeplatform.api.common;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.validation.FieldError;
import org.springframework.web.ErrorResponse;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.HandlerMethodValidationException;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.servlet.resource.NoResourceFoundException;

import dev.mfeplatform.api.dto.ErrorRes;

/**
 * 把例外統一轉成 {@link ErrorRes}。未預期的錯誤只記錄在伺服器 log，不把內部訊息回給前端。
 */
@RestControllerAdvice
public class GlobalExceptionHandler {

	private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

	/**
	 * @param exception 業務錯誤
	 * @return 對應的狀態碼與訊息
	 */
	@ExceptionHandler(ApiException.class)
	ResponseEntity<ErrorRes> handleApiException(ApiException exception) {
		return ResponseEntity.status(exception.getStatus())
				.body(new ErrorRes(exception.getCode(), exception.getMessage()));
	}

	/**
	 * request body 欄位驗證失敗，回傳第一個欄位的訊息。
	 *
	 * @param exception 驗證錯誤
	 * @return 400
	 */
	@ExceptionHandler(MethodArgumentNotValidException.class)
	ResponseEntity<ErrorRes> handleInvalidBody(MethodArgumentNotValidException exception) {
		FieldError fieldError = exception.getBindingResult().getFieldError();
		String message = fieldError != null && fieldError.getDefaultMessage() != null
				? fieldError.getDefaultMessage()
				: "資料格式不正確";
		return badRequest("VALIDATION_FAILED", message);
	}

	/**
	 * 查詢參數驗證失敗（例如報表月數超出範圍）。
	 *
	 * @param exception 驗證錯誤
	 * @return 400
	 */
	@ExceptionHandler(HandlerMethodValidationException.class)
	ResponseEntity<ErrorRes> handleInvalidParameter(HandlerMethodValidationException exception) {
		String message = exception.getAllErrors().stream()
				.map(error -> error.getDefaultMessage())
				.filter(text -> text != null && !text.isBlank())
				.findFirst()
				.orElse("查詢參數不正確");
		return badRequest("VALIDATION_FAILED", message);
	}

	/**
	 * 參數型別不符（例如 id 不是 UUID、日期格式錯誤）或缺少必要參數。
	 *
	 * @param exception 參數錯誤
	 * @return 400
	 */
	@ExceptionHandler({ MethodArgumentTypeMismatchException.class, MissingServletRequestParameterException.class })
	ResponseEntity<ErrorRes> handleBadParameter(Exception exception) {
		return badRequest("INVALID_PARAMETER", "查詢參數不正確");
	}

	/**
	 * request body 不是合法的 JSON，或欄位型別不符。
	 *
	 * @param exception 解析錯誤
	 * @return 400
	 */
	@ExceptionHandler(HttpMessageNotReadableException.class)
	ResponseEntity<ErrorRes> handleUnreadableBody(HttpMessageNotReadableException exception) {
		return badRequest("INVALID_BODY", "資料格式不正確");
	}

	/**
	 * {@code @PreAuthorize} 擋下的請求。
	 *
	 * @param exception 權限不足
	 * @return 403
	 */
	@ExceptionHandler(AccessDeniedException.class)
	ResponseEntity<ErrorRes> handleAccessDenied(AccessDeniedException exception) {
		return ResponseEntity.status(HttpStatus.FORBIDDEN).body(new ErrorRes("FORBIDDEN", "沒有權限執行這個操作"));
	}

	/**
	 * @param exception 找不到路徑
	 * @return 404
	 */
	@ExceptionHandler(NoResourceFoundException.class)
	ResponseEntity<ErrorRes> handleNotFound(NoResourceFoundException exception) {
		return ResponseEntity.status(HttpStatus.NOT_FOUND).body(new ErrorRes("NOT_FOUND", "找不到這個 API"));
	}

	/**
	 * Spring MVC 內建的請求錯誤（例如 405 方法不支援、415 Content-Type 不支援）依原本的狀態碼回應；
	 * 其他未預期的錯誤回 500，只在伺服器記錄細節。
	 *
	 * @param exception 例外
	 * @return 對應的錯誤回應
	 */
	@ExceptionHandler(Exception.class)
	ResponseEntity<ErrorRes> handleUnexpected(Exception exception) {
		if (exception instanceof ErrorResponse errorResponse && errorResponse.getStatusCode().is4xxClientError()) {
			return ResponseEntity.status(errorResponse.getStatusCode())
					.body(new ErrorRes("BAD_REQUEST", "請求格式不正確"));
		}
		log.error("未預期的錯誤", exception);
		return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
				.body(new ErrorRes("INTERNAL_ERROR", "伺服器發生錯誤，請稍後再試"));
	}

	private static ResponseEntity<ErrorRes> badRequest(String code, String message) {
		return ResponseEntity.badRequest().body(new ErrorRes(code, message));
	}
}
