package com.xs.demo.entity;

import static javax.persistence.GenerationType.IDENTITY;

import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.GeneratedValue;
import javax.persistence.Id;
import javax.persistence.JoinColumn;
import javax.persistence.ManyToOne;
import javax.persistence.Table;

/**
 * 
* @ClassName: RoleInfo
* @Description:  
* @author liuyijiao
* @date 2015-11-2 下午04:19:32
* @version V1.0
 */
@SuppressWarnings("serial")
@Entity
@Table(name = "role_menu", catalog = "oschina")
public class RoleMenu implements java.io.Serializable {

	// Fields

	private Integer id; //主键
	private  RoleInfo  roleInfo;//角色ID
	private  MenuInfo  menuInfo;//菜单ID
	
	@Id
	@GeneratedValue(strategy = IDENTITY)
	@Column(name = "id", unique = true, nullable = false)
	public Integer getId() {
		return this.id;
	}

	public void setId(Integer id) {
		this.id = id;
	}
	@ManyToOne
	@JoinColumn(name="role_id")
	public RoleInfo getRoleInfo() {
		return roleInfo;
	}

	public void setRoleInfo(RoleInfo roleInfo) {
		this.roleInfo = roleInfo;
	}
	@ManyToOne
	@JoinColumn(name="menu_id")
	public MenuInfo getMenuInfo() {
		return menuInfo;
	}

	public void setMenuInfo(MenuInfo menuInfo) {
		this.menuInfo = menuInfo;
	}
	 
	
}