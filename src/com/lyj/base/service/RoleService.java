package com.lyj.base.service;

import java.io.Serializable;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import javax.servlet.http.HttpServletRequest;

import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import com.lyj.base.dao.RoleDao;
import com.lyj.base.entity.RoleInfo;
import com.lyj.base.util.StringUtil;
/**
 *  SpringMVC+Hibernate +MySql+ EasyUI ---CRUD
 * @author LIUYIJIAO
 * 类名称：UserService 
 * @date 2014-11-15 下午4:14:37 
 * 备注：
 */
public class RoleService extends BaseService {
	//UserDao userDao;
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
	public RoleDao getRoleDao() {
		return roleDao;
	}
	public void setRoleDao(RoleDao roleDao) {
		this.roleDao = roleDao;
	}
	 
	
}
