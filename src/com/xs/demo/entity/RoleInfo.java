package com.xs.demo.entity;

import static javax.persistence.GenerationType.IDENTITY;

import java.util.List;

import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.GeneratedValue;
import javax.persistence.Id;
import javax.persistence.OneToMany;
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
@Table(name = "role_info", catalog = "oschina")
public class RoleInfo implements java.io.Serializable {

	// Fields

	private Integer id; //主键
	private String roleName;//角色名字
	private List<RoleMenu> roleMenu;//菜单角色关联表
	private List<UserRole> userRole;
/*	private List<AuthorityInfo> authorityInfos;//权限信息表
*/	
	// Property accessors
	@Id
	@GeneratedValue(strategy = IDENTITY)
	@Column(name = "id", unique = true, nullable = false)
	public Integer getId() {
		return this.id;
	}

	public void setId(Integer id) {
		this.id = id;
	}
	
	@Column(name="name")
	public String getRoleName() {
		return roleName;
	}

	public void setRoleName(String roleName) {
		this.roleName = roleName;
	}
	@OneToMany(mappedBy="roleInfo")
	 public List<RoleMenu> getRoleMenu() {
		return roleMenu;
	}

	public void setRoleMenu(List<RoleMenu> roleMenu) {
		this.roleMenu = roleMenu;
	}
	@OneToMany(mappedBy="roleInfo")
	public List<UserRole> getUserRole() {
		return userRole;
	}

	public void setUserRole(List<UserRole> userRole) {
		this.userRole = userRole;
	}
}
