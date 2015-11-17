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
 * @ClassName: AuthorityInfo
 * @Description:  
 * @author liuyijiao
 * @date 2015-11-2 下午04:18:51
 * @version V1.0
  */
@SuppressWarnings("serial")
@Entity
@Table(name = "menu_info", catalog = "oschina")
public class MenuInfo implements java.io.Serializable {

	// Fields

	private Integer id; //主键
	private String menuUrl;//权限rul  eg:user/index
	private String menuDesc;//权限名称描述eg: 用户管理
	private int type;//0：非菜单 1:一级菜单  2:二级菜单 eg:1
	private  int parentId;//父Id  eg:0 
	private  int  menuOrder;//菜单显示顺序
	private  List<RoleMenu>  roleMenu;
 	@Id
	@GeneratedValue(strategy = IDENTITY)
	@Column(name = "id", unique = true, nullable = false)
	public Integer getId() {
		return this.id;
	}

	public void setId(Integer id) {
		this.id = id;
	}
	@Column(name = "menu_desc")
	public String getMenuDesc() {
		return menuDesc;
	}

	public void setMenuDesc(String menuDesc) {
		this.menuDesc = menuDesc;
	}
	@Column(name = "menu_url")
	public String getMenuUrl() {
		return menuUrl;
	}

	public void setMenuUrl(String menuUrl) {
		this.menuUrl = menuUrl;
	}
	@Column(name = "type")
	public int getType() {
		return type;
	}

	public void setType(int type) {
		this.type = type;
	}
	@Column(name = "parent_id")
	public int getParentId() {
		return parentId;
	}

	public void setParentId(int parentId) {
		this.parentId = parentId;
	}
	@Column(name = "menu_order")
	public int getMenuOrder() {
		return menuOrder;
	}

	public void setMenuOrder(int menuOrder) {
		this.menuOrder = menuOrder;
	}

	 
	@OneToMany(mappedBy="menuInfo")
	 public List<RoleMenu> getRoleMenu() {
		return roleMenu;
	}

	public void setRoleMenu(List<RoleMenu> roleMenu) {
		this.roleMenu = roleMenu;
	}
}