package dev.mfeplatform.api.repository;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

import dev.mfeplatform.api.model.Customer;
import dev.mfeplatform.api.model.CustomerInput;
import dev.mfeplatform.api.model.CustomerOption;

/**
 * 客戶的資料存取（資料表 customers）。
 */
@Repository
public class CustomerRepository {

	private static final String COLUMNS = "id, name, industry, contact, phone, level, created_at";

	private final JdbcClient jdbc;

	/**
	 * @param jdbc 資料庫用戶端
	 */
	public CustomerRepository(JdbcClient jdbc) {
		this.jdbc = jdbc;
	}

	/**
	 * @return 所有客戶，依名稱排序
	 */
	public List<Customer> findAll() {
		return jdbc.sql("select " + COLUMNS + " from customers order by name")
				.query(CustomerRepository::map)
				.list();
	}

	/**
	 * @return 下拉選單用的客戶清單
	 */
	public List<CustomerOption> findOptions() {
		return jdbc.sql("select id, name from customers order by name")
				.query((rs, rowNum) -> new CustomerOption(rs.getObject("id", UUID.class), rs.getString("name")))
				.list();
	}

	/**
	 * @param id 客戶識別碼
	 * @return 客戶；不存在時為空
	 */
	public Optional<Customer> findById(UUID id) {
		return jdbc.sql("select " + COLUMNS + " from customers where id = :id")
				.param("id", id)
				.query(CustomerRepository::map)
				.optional();
	}

	/**
	 * @param id 客戶識別碼
	 * @return 客戶是否存在
	 */
	public boolean existsById(UUID id) {
		return jdbc.sql("select exists (select 1 from customers where id = :id)")
				.param("id", id)
				.query(Boolean.class)
				.single();
	}

	/**
	 * 名稱重複時資料庫拋出唯一鍵錯誤（DuplicateKeyException），由 service 處理。
	 *
	 * @param input     已整理過的欄位
	 * @param createdBy 建立者帳號
	 * @return 新客戶
	 */
	public Customer insert(CustomerInput input, UUID createdBy) {
		return jdbc.sql("insert into customers (name, industry, contact, phone, level, created_by)"
				+ " values (:name, :industry, :contact, :phone, :level, :createdBy)"
				+ " returning " + COLUMNS)
				.param("name", input.name())
				.param("industry", input.industry())
				.param("contact", input.contact())
				.param("phone", input.phone())
				.param("level", input.level())
				.param("createdBy", createdBy)
				.query(CustomerRepository::map)
				.single();
	}

	/**
	 * @param id    客戶識別碼
	 * @param input 已整理過的欄位
	 * @return 更新後的客戶；不存在時為空
	 */
	public Optional<Customer> update(UUID id, CustomerInput input) {
		return jdbc.sql("update customers"
				+ " set name = :name, industry = :industry, contact = :contact, phone = :phone, level = :level,"
				+ " updated_at = now()"
				+ " where id = :id"
				+ " returning " + COLUMNS)
				.param("name", input.name())
				.param("industry", input.industry())
				.param("contact", input.contact())
				.param("phone", input.phone())
				.param("level", input.level())
				.param("id", id)
				.query(CustomerRepository::map)
				.optional();
	}

	/**
	 * @param id 客戶識別碼
	 * @return 該客戶的行程數
	 */
	public int countEvents(UUID id) {
		return jdbc.sql("select count(*) from calendar_events where customer_id = :id")
				.param("id", id)
				.query(Integer.class)
				.single();
	}

	/**
	 * 還有行程時資料庫的外鍵限制會拒絕刪除（DataIntegrityViolationException）。
	 *
	 * @param id 客戶識別碼
	 * @return 是否有資料被刪除
	 */
	public boolean delete(UUID id) {
		return jdbc.sql("delete from customers where id = :id").param("id", id).update() > 0;
	}

	private static Customer map(ResultSet rs, int rowNum) throws SQLException {
		return new Customer(rs.getObject("id", UUID.class), rs.getString("name"), rs.getString("industry"),
				rs.getString("contact"), rs.getString("phone"), rs.getString("level"),
				rs.getObject("created_at", OffsetDateTime.class));
	}
}
