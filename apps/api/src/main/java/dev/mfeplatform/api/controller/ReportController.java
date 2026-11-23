package dev.mfeplatform.api.controller;

import java.util.List;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import dev.mfeplatform.api.dto.IndustryCountRes;
import dev.mfeplatform.api.dto.MonthlyActivityRes;
import dev.mfeplatform.api.service.ReportService;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;

/**
 * 報表 API，需要 {@code report:read}。匯出 CSV 由前端依 {@code report:export} 判斷，資料來源相同。
 */
@RestController
@RequestMapping("/api/reports")
public class ReportController {

	private final ReportService reportService;

	/**
	 * @param reportService 報表統計
	 */
	public ReportController(ReportService reportService) {
		this.reportService = reportService;
	}

	/**
	 * @param months 最近幾個月（含本月），1～24，預設 6
	 * @return 每月的新客戶數與拜訪次數
	 */
	@GetMapping("/monthly-activity")
	@PreAuthorize("hasAuthority('report:read')")
	public List<MonthlyActivityRes> monthlyActivity(
			@RequestParam(defaultValue = "6") @Min(value = 1, message = "月數至少 1") @Max(value = 24, message = "月數最多 24") int months) {
		return reportService.monthlyActivity(months);
	}

	/**
	 * @return 各產業的客戶數
	 */
	@GetMapping("/customers-by-industry")
	@PreAuthorize("hasAuthority('report:read')")
	public List<IndustryCountRes> customersByIndustry() {
		return reportService.customersByIndustry();
	}
}
