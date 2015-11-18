  package com.lyj.base.entity;
  
  import java.io.Serializable;
  import javax.persistence.Column;
  import javax.persistence.Entity;
  import javax.persistence.GeneratedValue;
  import javax.persistence.GenerationType;
  import javax.persistence.Id;
  import javax.persistence.JoinColumn;
  import javax.persistence.ManyToOne;
  import javax.persistence.Table;
  
  @Entity
  @Table(name="user_role", catalog="oschina")
  public class UserRole
    implements Serializable
  {
    
	/**
	* @Fields serialVersionUID : TODO(用一句话描述这个变量表示什么)
	*/
	
	private static final long serialVersionUID = 1L;
	private Integer id;
    private RoleInfo roleInfo;
    private UserInfo userInfo;
    
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
    
    @ManyToOne
    @JoinColumn(name="role_id")
    public RoleInfo getRoleInfo()
    {
      return this.roleInfo;
    }
    
    public void setRoleInfo(RoleInfo roleInfo)
    {
      this.roleInfo = roleInfo;
    }
    
    @ManyToOne
    @JoinColumn(name="user_id")
    public UserInfo getUserInfo()
    {
      return this.userInfo;
    }
    
    public void setUserInfo(UserInfo userInfo)
    {
      this.userInfo = userInfo;
    }
  }

