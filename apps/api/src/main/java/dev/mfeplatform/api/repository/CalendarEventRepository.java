package dev.mfeplatform.api.repository;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

import dev.mfeplatform.api.model.CalendarEvent;
import dev.mfeplatform.api.model.CalendarEventInput;

/**
 * 行程的資料存取（資料表 calendar_events，並關聯 customers 取得客戶名稱）。
 */
@Repository
public class CalendarEventRepository {

	private static final String SELECT_EVENTS = "select e.id, e.customer_id, c.name as customer_name,"
			+ " e.event_date, e.start_time, e.title, e.note"
			+ " from calendar_events e join customers c on c.id = e.customer_id";

	private final JdbcClient jdbc;

	/**
	 * @param jdbc 資料庫用戶端
	 */
	public CalendarEventRepository(JdbcClient jdbc) {
		this.jdbc = jdbc;
	}

	/**
	 * @param from 起始日期（含）
	 * @param to   結束日期（含）
	 * @return 期間內的行程，依日期與時間排序
	 */
	public List<CalendarEvent> findBetween(LocalDate from, LocalDate to) {
		return jdbc.sql(SELECT_EVENTS + " where e.event_date between :from and :to order by e.event_date, e.start_time")
				.param("from", from)
				.param("to", to)
				.query(CalendarEventRepository::map)
				.list();
	}

	/**
	 * @param id 行程識別碼
	 * @return 行程；不存在時為空
	 */
	public Optional<CalendarEvent> findById(UUID id) {
		return jdbc.sql(SELECT_EVENTS + " where e.id = :id")
				.param("id", id)
				.query(CalendarEventRepository::map)
				.optional();
	}

	/**
	 * @param input     已整理過的欄位
	 * @param createdBy 建立者帳號
	 * @return 新行程的識別碼
	 */
	public UUID insert(CalendarEventInput input, UUID createdBy) {
		return jdbc.sql("insert into calendar_events (customer_id, event_date, start_time, title, note, created_by)"
				+ " values (:customerId, :eventDate, :startTime, :title, :note, :createdBy) returning id")
				.param("customerId", input.customerId())
				.param("eventDate", input.eventDate())
				.param("startTime", input.startTime())
				.param("title", input.title())
				.param("note", input.note())
				.param("createdBy", createdBy)
				.query(UUID.class)
				.single();
	}

	/**
	 * @param id    行程識別碼
	 * @param input 已整理過的欄位
	 * @return 是否有資料被更新
	 */
	public boolean update(UUID id, CalendarEventInput input) {
		return jdbc.sql("update calendar_events"
				+ " set customer_id = :customerId, event_date = :eventDate, start_time = :startTime,"
				+ " title = :title, note = :note, updated_at = now()"
				+ " where id = :id")
				.param("customerId", input.customerId())
				.param("eventDate", input.eventDate())
				.param("startTime", input.startTime())
				.param("title", input.title())
				.param("note", input.note())
				.param("id", id)
				.update() > 0;
	}

	/**
	 * @param id 行程識別碼
	 * @return 是否有資料被刪除
	 */
	public boolean delete(UUID id) {
		return jdbc.sql("delete from calendar_events where id = :id").param("id", id).update() > 0;
	}

	private static CalendarEvent map(ResultSet rs, int rowNum) throws SQLException {
		return new CalendarEvent(rs.getObject("id", UUID.class), rs.getObject("customer_id", UUID.class),
				rs.getString("customer_name"), rs.getObject("event_date", LocalDate.class),
				rs.getObject("start_time", LocalTime.class), rs.getString("title"), rs.getString("note"));
	}
}
