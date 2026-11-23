package dev.mfeplatform.api.repository;

import java.util.List;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

import dev.mfeplatform.api.model.IndustryCount;
import dev.mfeplatform.api.model.MonthlyActivity;

/**
 * 報表統計查詢。月份以台北時間計算。
 */
@Repository
public class ReportRepository {

	private static final String MONTHLY_ACTIVITY_SQL = """
			with months as (
			  select generate_series(
			    date_trunc('month', now() at time zone 'Asia/Taipei') - make_interval(months => :monthCount - 1),
			    date_trunc('month', now() at time zone 'Asia/Taipei'),
			    interval '1 month'
			  )::date as month_start
			)
			select
			  to_char(m.month_start, 'YYYY-MM') as month,
			  (select count(*) from customers c
			    where date_trunc('month', c.created_at at time zone 'Asia/Taipei')::date = m.month_start) as new_customers,
			  (select count(*) from calendar_events e
			    where date_trunc('month', e.event_date)::date = m.month_start) as visits
			from months m
			order by m.month_start""";

	private final JdbcClient jdbc;

	/**
	 * @param jdbc 資料庫用戶端
	 */
	public ReportRepository(JdbcClient jdbc) {
		this.jdbc = jdbc;
	}

	/**
	 * @param monthCount 最近幾個月（含本月）
	 * @return 每月的新客戶數與拜訪次數，由舊到新
	 */
	public List<MonthlyActivity> monthlyActivity(int monthCount) {
		return jdbc.sql(MONTHLY_ACTIVITY_SQL)
				.param("monthCount", monthCount)
				.query((rs, rowNum) -> new MonthlyActivity(rs.getString("month"), rs.getInt("new_customers"),
						rs.getInt("visits")))
				.list();
	}

	/**
	 * @return 各產業的客戶數，由多到少
	 */
	public List<IndustryCount> customersByIndustry() {
		return jdbc.sql("select industry, count(*) as customer_count from customers group by industry"
				+ " order by customer_count desc, industry")
				.query((rs, rowNum) -> new IndustryCount(rs.getString("industry"), rs.getInt("customer_count")))
				.list();
	}
}
