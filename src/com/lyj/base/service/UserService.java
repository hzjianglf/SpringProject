package com.lyj.base.service;

import java.io.Serializable;
import java.util.Date;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import javax.servlet.http.HttpServletRequest;

import org.hibernate.Session;
import org.hibernate.Transaction;





import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import com.lyj.base.dao.UserDao;
import com.lyj.base.entity.MenuInfo;
import com.lyj.base.entity.RoleInfo;
import com.lyj.base.entity.RoleMenu;
import com.lyj.base.entity.UserInfo;
import com.lyj.base.entity.UserRole;
import com.lyj.base.util.StringUtil;
/**
 *  SpringMVC+Hibernate +MySql+ EasyUI ---CRUD
 * @author LIUYIJIAO
 * 类名称：UserService 
 * @date 2014-11-15 下午4:14:37 
 * 备注：
 */
public class UserService extends BaseService {
	UserDao userDao;
	/**
	 * list
	 * @param name
	 * @param start
	 * @param size
	 * @param order
	 * @return
	 */
	public String list(String name,int start, int size, String order){
		List<Map<String,Object>> list =userDao.list(name,start, size, order); 
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
	public String save(UserInfo userinfo) {
		String result = null;
		Date date = new Date();
		userinfo.setBirthday(date);
		userinfo.setPassword("888888");
		super.save(userinfo);
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
		return userDao.count(name,start, size, order);
	}
	/**
	 * getuserbyname
	 * @param name
	 * @return
	 */
	public UserInfo getUserByName(String name) {
		return userDao.getUserByName(name);
	}
	/**
	 * update
	 * @param request
	 * @param userinfo
	 * @param id
	 * @return
	 */
	public String update(HttpServletRequest request, UserInfo userinfo,
			Integer id,int roleId) {
		//开启事物
		Session  session= this.baseDao.getSession().getSessionFactory().openSession();
		Transaction tx= session.beginTransaction();
		
		RoleInfo roleInfo=(RoleInfo) session.get(RoleInfo.class, roleId);
		
		UserInfo userinfoOld = (UserInfo) session.get(UserInfo.class, id);
		if(null != userinfo){
			StringUtil.requestToObject(request, userinfoOld);
		}
		//删除该用户的角色关联
		String hqlDelete = "delete UserRole ur where ur.userInfo = :userId";
		int deletedEntities = session.createQuery( hqlDelete )
		.setInteger( "userId", userinfoOld.getId() )
		.executeUpdate();
		System.out.println("删除个数:"+deletedEntities);
		if(roleInfo!=null){
			UserRole userRole=new UserRole();
			userRole.setRoleInfo(roleInfo);
			userRole.setUserInfo(userinfoOld);
			session.saveOrUpdate(userRole);
		}
		session.update(userinfoOld);
		tx.commit();
		session.close();
		//结束事物
		String result = "{\"success\":true,\"msg\":\"更新成功！\"}";
		return result;
	}
	/**
	 * delete
	 * @param id
	 */
	public void delete(Serializable id){
		userDao.delete(UserInfo.class,id);
	}
	
	
	
	/*------------------*/
	public UserDao getUserDao() {
		return userDao;
	}
	public void setUserDao(UserDao userDao) {
		this.userDao = userDao;
	}



	
}
