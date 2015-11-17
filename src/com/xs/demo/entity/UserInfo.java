package com.xs.demo.entity;

import static javax.persistence.GenerationType.IDENTITY;

import java.util.Date;
import java.util.List;

import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.GeneratedValue;
import javax.persistence.Id;
import javax.persistence.OneToMany;
import javax.persistence.Table;

/**
 * 
* @ClassName: UserInfo
* @Description: TODO(这里用一句话描述这个类的作用)
* @author liuyijiao
* @date 2015-11-2 下午04:19:40
* @version V1.0
 */
@SuppressWarnings("serial")
@Entity
@Table(name = "user_Info", catalog = "oschina")
public class UserInfo implements java.io.Serializable {

	// Fields

	private Integer id; //主键
	private String name;//名字
	private Integer age;//年龄
	private Date birthday;//生日
	private String address;//地址
	private String password;//密码
	private  List<UserRole>  userRole;//角色

	@Id
	@GeneratedValue(strategy = IDENTITY)
	@Column(name = "id", unique = true, nullable = false)
	public Integer getId() {
		return this.id;
	}

	public UserInfo(Integer id, String name, Integer age, Date birthday,
			String address, String password) {
		super();
		this.id = id;
		this.name = name;
		this.age = age;
		this.birthday = birthday;
		this.address = address;
		this.password = password;
	}

	public void setId(Integer id) {
		this.id = id;
	}

	@Column(name = "name")
	public String getName() {
		return this.name;
	}

	public void setName(String name) {
		this.name = name;
	}

	@Column(name = "age")
	public Integer getAge() {
		return this.age;
	}

	public void setAge(Integer age) {
		this.age = age;
	}

	@Column(name = "birthday", length = 19)
	public Date getBirthday() {
		return birthday;
	}

	public void setBirthday(Date birthday) {
		this.birthday = birthday;
	}

	@Column(name = "address")
	public String getAddress() {
		return this.address;
	}



	public void setAddress(String address) {
		this.address = address;
	}

	@Column(name = "password")
	public String getPassword() {
		return this.password;
	}

	public void setPassword(String password) {
		this.password = password;
	}
	@OneToMany(mappedBy="userInfo")
	public List<UserRole> getUserRole() {
		return userRole;
	}

	public void setUserRole(List<UserRole> userRole) {
		this.userRole = userRole;
	}
	 
}