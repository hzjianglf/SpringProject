package com.xs.demo.entity;

import static javax.persistence.GenerationType.IDENTITY;

import java.util.List;

import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.GeneratedValue;
import javax.persistence.Id;
import javax.persistence.JoinColumn;
import javax.persistence.OneToMany;
import javax.persistence.Table;

import org.hibernate.annotations.ForeignKey;

 /**
  * 
 * @ClassName: AuthorityInfo
 * @Description:  
 * @author liuyijiao
 * @date 2015-11-2 下午04:18:51
 * @version V1.0
  */
@SuppressWarnings("serial")
@Entity
@Table(name = "authority_info", catalog = "oschina")
public class AuthorityInfo implements java.io.Serializable {

	// Fields

	private Integer id; //主键
	private String name;//权限名称
	private Integer menuId;//权限ID
	private List<RoleInfo> roleInfos;//角色
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
	public String getName() {
		return name;
	}

	public void setName(String name) {
		this.name = name;
	}
	@Column(name="menu_Id")
	public Integer getMenuId() {
		return menuId;
	}

	public void setMenuId(Integer menuId) {
		this.menuId = menuId;
	}
	@OneToMany
	@JoinColumn(name = "role_id")
	@ForeignKey(name="authority_role_key")
	public List<RoleInfo> getRoleInfos() {
		return roleInfos;
	}
	public void setRoleInfos(List<RoleInfo> roleInfos) {
		this.roleInfos = roleInfos;
	}
	
	 

}