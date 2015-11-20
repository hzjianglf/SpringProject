package com.lyj.base.dao;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Types;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

import org.springframework.jdbc.core.RowMapper;

import com.lyj.base.entity.MenuInfo;



public class MenuDao extends BaseDao {

	public List<MenuInfo> getRes(String pid) {
		final List<MenuInfo> list = new ArrayList<MenuInfo>();
		MenuInfo ts=new MenuInfo();
		//使用RowMapper封装查询对象
				RowMapper rowMapper=new RowMapper(){
					public Object mapRow(ResultSet rs, int rowNum) throws SQLException {
					  
						MenuInfo emp=new MenuInfo();
						emp.setId( rs.getInt("id"));
						emp.setMenuDesc (rs.getString("menu_desc"));
						emp.setMenuOrder(rs.getInt("menu_order"));
						emp.setParentId(rs.getInt("parent_id"));
						list.add(emp);
						return null;
					}
				};
			 
				Object arg[]={pid};
				this.getJdbcTemplate().query("select id,menu_desc,menu_order,parent_id from menu_info where parent_id=? ",arg,rowMapper);
				for(MenuInfo object:list){
					System.out.println(object.toString());
			}
		return list;
	}

	public void addBrother(MenuInfo fun) throws Exception {
		//要执行的SQL语句
				String sql="insert into menu_info (id,menu_desc, parent_id) values(?,?,?)";
				//SQL语句中的参数
				Object args[]={fun.getId(),fun.getMenuDesc(),fun.getParentId()};
				//SQL语句中的参数类型
				int argTypes[]={Types.VARCHAR,Types.VARCHAR,Types.VARCHAR};
				//执行修改操作，返回影响行数
				//this.getJdbcTemplate().update(sql); //直接操作SQL语句
				//this.getJdbcTemplate().update(sql, args); //操作SQL语句+参数
				this.getJdbcTemplate().update(sql, args, argTypes); //操作SQL语句+参数+参数类型

	}

	public void delete(String id) throws Exception {
		//要执行的SQL语句
				String sql="delete from menu_info where id=?";
				//SQL语句中的参数
				Object args[]={id};
				//SQL语句中的参数类型
				int argTypes[]={Types.INTEGER};
				//执行删除操作，返回影响行数
				//this.getJdbcTemplate().update(sql); //直接操作SQL语句
				//this.getJdbcTemplate().update(sql, args); //操作SQL语句+参数
				this.getJdbcTemplate().update(sql, args, argTypes); //操作SQL语句+参数+参数类型
	}

	public void update(String id, String text) throws Exception {
		//要执行的SQL语句
		String sql="update menu_info set menu_Desc=? where  id= ? ";
		//SQL语句中的参数
		Object args[]={text,id};
		//SQL语句中的参数类型
		int argTypes[]={Types.VARCHAR,Types.VARCHAR};
		//执行修改操作，返回影响行数
		//this.getJdbcTemplate().update(sql); //直接操作SQL语句
		//this.getJdbcTemplate().update(sql, args); //操作SQL语句+参数
		this.getJdbcTemplate().update(sql, args, argTypes); //操作SQL语句+参数+参数类型
	}

	public List<String> findPath(String text) {
		final List<String> strList = new ArrayList<String>();
		final ArrayList<String> path = new ArrayList<String>();
		ArrayList<String> paths = new ArrayList<String>();
		
	 
		Object args[]={text};
		this.getJdbcTemplate().queryForList("select id from menu_info where menu_desc=? ",args,new RowMapper(){
			public Object mapRow(ResultSet rs, int rowNum) throws SQLException {
						strList.add(rs.getString("id"));
						return null;
					}
		});
		this.getJdbcTemplate().queryForList("select id from menu_info where menu_desc=? ",args,new RowMapper(){
			public Object mapRow(ResultSet rs, int rowNum) throws SQLException {
				strList.add(rs.getString("id"));
				return null;
			}
		});
			for (int i = 0; i < strList.size(); i++) {
				Object str[]={strList.get(i)};
				this.getJdbcTemplate().queryForList("select  id from menu_info start with  id= ?  connect by prior  parent_id=id ",str,new RowMapper(){
					public Object mapRow(ResultSet rs, int rowNum) throws SQLException {
						path.add(rs.getString("id"));
						return null;
					}
				});
				 
				Collections.reverse(path); // 数组倒置
				System.out.println("path>>>>>>>>>>>>>>>>>>>>>>>>"
						+ path.toString());
				paths.add(path.toString());
				path.clear();
			}
		System.out.println(paths.toString());
		return paths;
	}

	/**
	 * 根据pid查询子集合
	 * 
	 * @param pid
	 * @return list
	 */
	public List<MenuInfo> querySonList(int pid) {
		final List<MenuInfo> list = new ArrayList<MenuInfo>();
		//使用RowMapper封装查询对象
		RowMapper rowMapper=new RowMapper(){
			public Object mapRow(ResultSet rs, int rowNum) throws SQLException {
			  
				MenuInfo emp=new MenuInfo();
				emp.setId( rs.getInt("id"));
				emp.setMenuDesc (rs.getString("menu_desc"));
				emp.setMenuOrder(rs.getInt("menu_order"));
				emp.setParentId(rs.getInt("parent_id"));
				list.add(emp);
				return null;
			}
		};
				 this.getJdbcTemplate().query("select id,menu_desc,menu_order,parent_id from menu_info  where parent_id='"
								+ pid + "'",rowMapper);
		return list;
	}

	/**
	 * 根据名字查询菜单
	 * 
	 * @param text
	 * @return List<MenuInfo>
	 */
	public List<MenuInfo> findByText(String text) {
		  List<MenuInfo> result = new ArrayList<MenuInfo>();
		 Object[] args={"%"+text+"%"};
		 result=super.list(" from MenuInfo  where menuDesc like ? ",args);
		/*for (int i = 0; i < strList.size(); i++) {
			//Object str[]={strList.get(i)};
			//this.getJdbcTemplate().queryForList("select id,menu_desc,menu_order,parent_id from menu_info start with id=? connect by prior parent_id=id ",str,rowMapper);
			List<MenuInfo> listA=this.querySonList(strList.get(i));
			for(MenuInfo info:listA){
				if (!(list.contains(info))) {
					list.add(info);
				}
			}
		}*/
		 
		return result;
	}

}