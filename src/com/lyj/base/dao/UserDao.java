package com.lyj.base.dao;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;


import com.lyj.base.entity.UserInfo;
/**
 * SpringMVC+Hibernate +MySql+ EasyUI ---CRUD
 * @author LIUYIJIAO
 * 类名称：UserDao 
 * @date 2014-11-15 下午4:34:51 
 * 备注：
 */
public class UserDao extends BaseDao{

	public List<Map<String, Object>> list(String name,int start, int size,
			String order) {
		//SELECT u.*,rur.name AS role_name FROM user_info u  LEFT JOIN  (SELECT role.name,ur.role_id,ur.user_id FROM role_info role ,user_role ur WHERE role.id=ur.role_id ) rur ON rur.user_id=u.id WHERE 1=1 GROUP BY u.id ORDER BY birthday ASC  ;
		List<Object> param = new ArrayList<Object>();
		String sql = " SELECT u.*,rur.name AS role_name FROM user_info u  LEFT JOIN  (SELECT role.name,ur.role_id,ur.user_id FROM role_info role ,user_role ur WHERE role.id=ur.role_id ) rur ON rur.user_id=u.id ";
		if(null != name && name.trim().length() > 0){
			sql += " and u.name like ? ";
			param.add("%"+name+"%");
		}
		sql+=" GROUP BY u.id ";
		if(null == order || order.length() == 0){
			order = " birthday asc";
		}
		return super.listByNative(sql, param.toArray(), start, size, order);
	}

	public int count(String name,int start, int size,
			String order) {
		List<Object> param = new ArrayList<Object>();
		String sql = "select count(*) from user_info u where 1=1 ";
		if(null != name && name.trim().length() > 0){
			sql += " and u.name like ? ";
			param.add("%"+name+"%");
		}
		return super.countByNative(sql, param.toArray());
	}

	@SuppressWarnings("unchecked")
	public UserInfo getUserByName(String name) {
		String hql="select u from UserInfo u where u.name=? ";
		List<UserInfo> list=super.list(hql, new Object[]{name});
		if(list!=null&&list.size()>0){
			return list.get(0);
		}else{
			return null;
		}
	}

}
