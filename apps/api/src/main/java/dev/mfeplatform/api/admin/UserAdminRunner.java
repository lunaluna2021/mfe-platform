package dev.mfeplatform.api.admin;

import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;

import dev.mfeplatform.api.model.AppUser;
import dev.mfeplatform.api.service.UserAdminService;

/**
 * 帳號管理指令。只有帶 {@code --admin.command=...} 啟動時才會執行，完成後結束程式。
 *
 * <pre>
 * --admin.command=create-user    --admin.email=... --admin.password=... --admin.display-name=... --admin.role=...
 * --admin.command=reset-password --admin.email=... --admin.password=...
 * --admin.command=set-role       --admin.email=... --admin.role=...
 * --admin.command=disable        --admin.email=...
 * --admin.command=enable         --admin.email=...
 * --admin.command=list-users
 * </pre>
 *
 * 搭配 {@code --spring.main.web-application-type=none}，不啟動網頁伺服器。
 */
@Component
@ConditionalOnProperty(name = "admin.command")
public class UserAdminRunner implements ApplicationRunner {

	private final UserAdminService userAdminService;
	private final Environment environment;
	private final ConfigurableApplicationContext context;

	/**
	 * @param userAdminService 帳號管理
	 * @param environment      指令參數來源
	 * @param context          執行完畢後用來結束程式
	 */
	public UserAdminRunner(UserAdminService userAdminService, Environment environment,
			ConfigurableApplicationContext context) {
		this.userAdminService = userAdminService;
		this.environment = environment;
		this.context = context;
	}

	@Override
	public void run(ApplicationArguments args) {
		int exitCode = 0;
		try {
			execute(environment.getRequiredProperty("admin.command"));
		} catch (IllegalArgumentException | IllegalStateException exception) {
			System.err.println("[admin] 失敗：" + exception.getMessage());
			exitCode = 1;
		}
		final int code = exitCode;
		System.exit(SpringApplication.exit(context, () -> code));
	}

	private void execute(String command) {
		switch (command) {
			case "create-user" -> {
				AppUser user = userAdminService.createUser(required("admin.email"), required("admin.password"),
						required("admin.display-name"), required("admin.role"));
				System.out.println("[admin] 已建立帳號：" + describe(user));
			}
			case "reset-password" -> {
				userAdminService.resetPassword(required("admin.email"), required("admin.password"));
				System.out.println("[admin] 已重設密碼，該帳號需要重新登入");
			}
			case "set-role" -> {
				userAdminService.changeRole(required("admin.email"), required("admin.role"));
				System.out.println("[admin] 已變更角色，該帳號需要重新登入");
			}
			case "disable" -> {
				userAdminService.setEnabled(required("admin.email"), false);
				System.out.println("[admin] 已停用帳號");
			}
			case "enable" -> {
				userAdminService.setEnabled(required("admin.email"), true);
				System.out.println("[admin] 已啟用帳號");
			}
			case "list-users" -> userAdminService.listUsers()
					.forEach(user -> System.out.println("[admin] " + describe(user)));
			default -> throw new IllegalArgumentException("不支援的指令：" + command);
		}
	}

	private String required(String key) {
		String value = environment.getProperty(key);
		if (value == null || value.isBlank()) {
			throw new IllegalArgumentException("缺少參數 --" + key);
		}
		return value;
	}

	/** 只顯示公開欄位，不輸出密碼雜湊 */
	private static String describe(AppUser user) {
		return user.email() + "｜" + user.displayName() + "｜" + user.role() + (user.enabled() ? "" : "｜已停用");
	}
}
