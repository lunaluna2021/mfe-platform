package dev.mfeplatform.api.service;

import java.util.List;

import org.springframework.stereotype.Service;

import dev.mfeplatform.api.dto.IndustryCountRes;
import dev.mfeplatform.api.dto.MonthlyActivityRes;
import dev.mfeplatform.api.repository.ReportRepository;

/**
 * 報表統計。
 */
@Service
public class ReportService {

	private final ReportRepository reports;

	/**
	 * @param reports 報表查詢
	 */
	public ReportService(ReportRepository reports) {
		this.reports = reports;
	}

	/**
	 * @param monthCount 最近幾個月（含本月），由 controller 限制在 1～24
	 * @return 每月的新客戶數與拜訪次數
	 */
	public List<MonthlyActivityRes> monthlyActivity(int monthCount) {
		return reports.monthlyActivity(monthCount).stream().map(MonthlyActivityRes::from).toList();
	}

	/**
	 * @return 各產業的客戶數
	 */
	public List<IndustryCountRes> customersByIndustry() {
		return reports.customersByIndustry().stream().map(IndustryCountRes::from).toList();
	}
}
