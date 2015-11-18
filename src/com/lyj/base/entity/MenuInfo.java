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
 @Table(name="menu_info", catalog="oschina")
 public class MenuInfo  implements Serializable
 {
	private static final long serialVersionUID = 1L;
	private Integer id;
   private String menuUrl;
   private String menuDesc;
   private int type;
   private int parentId;
   private int menuOrder;
   private List<RoleMenu> roleMenu;
   
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
   
   @Column(name="menu_desc")
   public String getMenuDesc()
   {
     return this.menuDesc;
   }
   
   public void setMenuDesc(String menuDesc)
   {
     this.menuDesc = menuDesc;
   }
   
   @Column(name="menu_url")
   public String getMenuUrl()
   {
     return this.menuUrl;
   }
   
   public void setMenuUrl(String menuUrl)
   {
     this.menuUrl = menuUrl;
   }
   
   @Column(name="type")
   public int getType()
   {
     return this.type;
   }
   
   public void setType(int type)
   {
     this.type = type;
   }
   
   @Column(name="parent_id")
   public int getParentId()
   {
     return this.parentId;
   }
   
   public void setParentId(int parentId)
   {
     this.parentId = parentId;
   }
   
   @Column(name="menu_order")
   public int getMenuOrder()
   {
     return this.menuOrder;
   }
   
   public void setMenuOrder(int menuOrder)
   {
     this.menuOrder = menuOrder;
   }
   
   @OneToMany(mappedBy="menuInfo")
   public List<RoleMenu> getRoleMenu()
   {
     return this.roleMenu;
   }
   
   public void setRoleMenu(List<RoleMenu> roleMenu)
   {
     this.roleMenu = roleMenu;
   }
 }


/* Location:           C:\Users\liuyijiao\Desktop\新建文件夹\
 * Qualified Name:     com.lyj.base.entity.MenuInfo
 * JD-Core Version:    0.7.0.1
 */