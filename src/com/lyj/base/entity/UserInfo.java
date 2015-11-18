 package com.lyj.base.entity;
 
 import java.io.Serializable;
 import java.util.Date;
 import java.util.List;
 import javax.persistence.Column;
 import javax.persistence.Entity;
 import javax.persistence.GeneratedValue;
 import javax.persistence.GenerationType;
 import javax.persistence.Id;
 import javax.persistence.OneToMany;
 import javax.persistence.Table;
 
 @Entity
 @Table(name="user_Info", catalog="oschina")
 public class UserInfo  implements Serializable
 {
	private static final long serialVersionUID = 1L;
	private Integer id;
   private String name;
   private Integer age;
   private Date birthday;
   private String address;
   private String password;
   private List<UserRole> userRole;
   
   public UserInfo() {}
   
   public UserInfo(Integer id, String name, Integer age, Date birthday, String address, String password, List<UserRole> userRole)
   {
     this.id = id;
     this.name = name;
     this.age = age;
     this.birthday = birthday;
     this.address = address;
     this.password = password;
     this.userRole = userRole;
   }
   
   @Id
   @GeneratedValue(strategy=GenerationType.IDENTITY)
   @Column(name="id", unique=true, nullable=false)
   public Integer getId()
   {
     return this.id;
   }
   
   public void setId(Integer id)
   {
     this.id = id;
   }
   
   @Column(name="name")
   public String getName()
   {
     return this.name;
   }
   
   public void setName(String name)
   {
     this.name = name;
   }
   
   @Column(name="age")
   public Integer getAge()
   {
     return this.age;
   }
   
   public void setAge(Integer age)
   {
     this.age = age;
   }
   
   @Column(name="birthday", length=19)
   public Date getBirthday()
   {
     return this.birthday;
   }
   
   public void setBirthday(Date birthday)
   {
     this.birthday = birthday;
   }
   
   @Column(name="address")
   public String getAddress()
   {
     return this.address;
   }
   
   public void setAddress(String address)
   {
     this.address = address;
   }
   
   @Column(name="password")
   public String getPassword()
   {
     return this.password;
   }
   
   public void setPassword(String password)
   {
     this.password = password;
   }
   
   @OneToMany(mappedBy="userInfo")
   public List<UserRole> getUserRole()
   {
     return this.userRole;
   }
   
   public void setUserRole(List<UserRole> userRole)
   {
     this.userRole = userRole;
   }
 }
 