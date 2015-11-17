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
@Table(name = "user_role", catalog = "oschina")
public class UserRole implements java.io.Serializable {

	// Fields

	private Integer id; //主键
	private  RoleInfo  roleInfo;//角色ID
	private  UserInfo  userInfo;//用户ID
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
	@JoinColumn(name="user_id")
	public UserInfo getUserInfo() {
		return userInfo;
	}

	public void setUserInfo(UserInfo userInfo) {
		this.userInfo = userInfo;
	}
	 
	
}