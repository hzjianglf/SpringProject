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
  @Table(name="role_menu", catalog="oschina")
  public class RoleMenu
    implements Serializable
  {
    
	/**
	* @Fields serialVersionUID : TODO(用一句话描述这个变量表示什么)
	*/
	
	private static final long serialVersionUID = 1L;
	private Integer id;
    private RoleInfo roleInfo;
    private MenuInfo menuInfo;
    
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
    @JoinColumn(name="menu_id")
    public MenuInfo getMenuInfo()
    {
      return this.menuInfo;
    }
    
    public void setMenuInfo(MenuInfo menuInfo)
    {
      this.menuInfo = menuInfo;
    }

	@Override
	public boolean equals(Object object) {
		boolean sameSame = false;
	    if (object != null && object instanceof RoleMenu)
	    {
	    	 
	        sameSame =( (this.getMenuInfo().getId()==((RoleMenu) object).getMenuInfo().getId()) && ( this.getRoleInfo().getId()==((RoleMenu) object).getRoleInfo().getId()));
	    }

	    return sameSame;
	}

  }
