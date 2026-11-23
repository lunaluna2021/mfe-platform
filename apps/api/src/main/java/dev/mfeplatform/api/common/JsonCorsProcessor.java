package dev.mfeplatform.api.common;

import java.io.IOException;
import java.nio.charset.StandardCharsets;

import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.server.ServerHttpResponse;
import org.springframework.web.cors.DefaultCorsProcessor;

/**
 * 來源不在 CORS 白名單時，回應與其他錯誤相同格式的 JSON，而不是 Spring 預設的純文字。
 */
public class JsonCorsProcessor extends DefaultCorsProcessor {

	private static final byte[] BODY = "{\"CODE\":\"CORS_REJECTED\",\"MESSAGE\":\"不允許從這個網站呼叫 API\"}"
			.getBytes(StandardCharsets.UTF_8);

	@Override
	protected void rejectRequest(ServerHttpResponse response) throws IOException {
		response.setStatusCode(HttpStatus.FORBIDDEN);
		response.getHeaders().setContentType(new MediaType(MediaType.APPLICATION_JSON, StandardCharsets.UTF_8));
		response.getBody().write(BODY);
		response.flush();
	}
}
