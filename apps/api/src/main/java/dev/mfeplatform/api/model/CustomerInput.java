package dev.mfeplatform.api.model;

/**
 * 寫入客戶資料表前整理好的欄位（已去除空白、套用預設值）。
 * repository 將各欄位綁定到 SQL 的具名參數。
 *
 * @param name     公司名稱
 * @param industry 產業
 * @param contact  聯絡人
 * @param phone    電話
 * @param level    等級
 */
public record CustomerInput(String name, String industry, String contact, String phone, String level) {
}
