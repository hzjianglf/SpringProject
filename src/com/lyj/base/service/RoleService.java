package com.lyj.base.service;

import java.io.Serializable;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import javax.servlet.http.HttpServletRequest;

import org.hibernate.Session;
import org.hibernate.SessionFactory;
import org.hibernate.Transaction;

import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import com.lyj.base.dao.RoleDao;
import com.lyj.base.entity.MenuInfo;
import com.lyj.base.entity.RoleInfo;
import com.lyj.base.entity.RoleMenu;
import com.lyj.base.util.StringUtil;
/**
 *  SpringMVC+Hibernate +MySql+ EasyUI ---CRUD
 * @author LIUYIJIAO
 * 类名称：UserService 
 * @date 2014-11-15 下午4:14:37 
 * 备注：
 */
public class RoleService extends BaseService {
	//MenuDao userDao;
	RoleDao roleDao;
	/**
	 * list
	 * @param name
	 * @param start
	 * @param size
	 * @param order
	 * @return
	 */
	public String list(String name,int start, int size, String order){
		List<Map<String,Object>> list =roleDao.list(name,start, size, order); 
		int count = count(name,start, size, order);
		
		Map<String,Object> map = new HashMap<String, Object>();
		map.put("total", count);
		map.put("rows", list);
		
		Gson gson = new GsonBuilder().setDateFormat("yyyy-MM-dd HH:mm:ss").create();
		String s = gson.toJson(map);
		return s;
	}
	/**
	 * save
	 * @param userinfo
	 * @return
	 */
	public String save(RoleInfo roleInfo) {
		String result = null;
		/*roleInfo.setId(new Random().nextInt(100000));*/
		super.save(roleInfo);
		result = "{\"success\":true,\"msg\":\"新增角色成功\"}";
		return result ;
	}
	/**
	 * count
	 * @param name
	 * @param start
	 * @param size
	 * @param order
	 * @return
	 */
	public int count(String name,int start, int size, String order){
		return roleDao.count(name,start, size, order);
	}
	/**
	 * getuserbyname
	 * @param name
	 * @return
	 */
	public RoleInfo getRoleByName(String name) {
		return roleDao.getRoleByName(name);
	}
	/**
	 * update
	 * @param request
	 * @param userinfo
	 * @param id
	 * @return
	 */
	public String update(HttpServletRequest request, RoleInfo roleInfo,
			Integer id) {
		RoleInfo roleInfoOld = super.get(RoleInfo.class, id);
		if(null != roleInfo){
			StringUtil.requestToObject(request, roleInfoOld);
		}
		super.update(roleInfoOld);
		String result = "{\"success\":true,\"msg\":\"更新成功！\"}";
		return result;
	}
	/**
	 * delete
	 * @param id
	 */
	public void delete(Serializable id){
		roleDao.delete(RoleInfo.class,id);
	}
	 /**
	  * 
	 * @Title: grantMenus
	 * @Description: 为某一角色授予菜单访问权限
	 * @param @param ids
	 * @param @param roleId    设定文件
	 * @return void    返回类型
	 * @author liuyijiao
	 * @date 2015-11-25 下午04:41:38
	 * @version V1.0
	 * @throws
	  */
	public void grantMenus(String menuIds,int roleId){
		RoleInfo roleInfo=roleDao.get(RoleInfo.class, roleId);//角色
		List<RoleMenu> hasMenus= roleInfo.getRoleMenu();//当前角色包含的菜单 1,2,3
		//List<MenuInfo> saveMenus=new ArrayList<MenuInfo>();//待保存的权限
		String[] idArray=menuIds.split(",");//菜单ID 1,2,4
		//开启事物
		Session  session= this.baseDao.getSession().getSessionFactory().openSession();
		Transaction tx= session.beginTransaction();
		//去除权限
		for(RoleMenu menu:hasMenus){
			 session.delete(menu);
			 System.out.println(menu.getId());
		}
		for(int i=0;i<idArray.length;i++){
			  RoleMenu roleMenu=new RoleMenu();
			  MenuInfo menuInfo=(MenuInfo) session.get(MenuInfo.class, Integer.valueOf(idArray[i]));
			  roleMenu.setMenuInfo(menuInfo);
			  roleMenu.setRoleInfo(roleInfo);
			  /*if(! hasMenus.contains(roleMenu)){
				 // saveMenus.add(menuInfo);
				  session.save(roleMenu);
			  } */
			  session.save(roleMenu);
			  	//每当累加器是20的倍数时，将Session中数据刷入数据库，  
		        //并清空Session缓存。  
		        if (i % 20 == 0)  
		        {  
		            session.flush();  
		            session.clear();  
		        }  
			}
		
		tx.commit();
		session.close();
	}
	public RoleDao getRoleDao() {
		return roleDao;
	}
	public void setRoleDao(RoleDao roleDao) {
		this.roleDao = roleDao;
	}
	
}
