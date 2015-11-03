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
	private Integer authority;//权限表ID
	private List<AuthorityInfo> authorityInfos;//权限信息表
	
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
	
	 
	@Column(name="authority")
	public Integer getAuthority() {
		return authority;
	}

	public void setAuthority(Integer authority) {
		this.authority = authority;
	}
	@Column(name="name")
	public String getRoleName() {
		return roleName;
	}

	public void setRoleName(String roleName) {
		this.roleName = roleName;
	}
	
	@OneToMany
	@JoinColumn(name = "authority_id")
	@ForeignKey(name="role_authority_key")
	public List<AuthorityInfo> getAuthorityInfos() {
		return authorityInfos;
	}
	public void setAuthorityInfos(List<AuthorityInfo> authorityInfos) {
		this.authorityInfos = authorityInfos;
	}
	
}