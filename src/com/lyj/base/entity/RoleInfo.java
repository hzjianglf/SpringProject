 package com.lyj.base.entity;
 
 import java.io.Serializable;
 import java.util.List;
 import javax.persistence.Column;
 import javax.persistence.Entity;
 import javax.persistence.GeneratedValue;
 import javax.persistence.GenerationType;
 import javax.persistence.Id;
 import javax.persistence.OneToMany;
 import javax.persistence.Table;
 
 @Entity
 @Table(name="role_info", catalog="oschina")
 public class RoleInfo
   implements Serializable
 {
   
	private static final long serialVersionUID = 1L;
private Integer id;
   private String roleName;
   private List<RoleMenu> roleMenu;
   private List<UserRole> userRole;
   
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
   public String getRoleName()
   {
     return this.roleName;
   }
   
   public void setRoleName(String roleName)
   {
     this.roleName = roleName;
   }
   
   @OneToMany(mappedBy="roleInfo")
   public List<RoleMenu> getRoleMenu()
   {
     return this.roleMenu;
   }
   
   public void setRoleMenu(List<RoleMenu> roleMenu)
   {
     this.roleMenu = roleMenu;
   }
   
   @OneToMany(mappedBy="roleInfo")
   public List<UserRole> getUserRole()
   {
     return this.userRole;
   }
   
   public void setUserRole(List<UserRole> userRole)
   {
     this.userRole = userRole;
   }
 }
