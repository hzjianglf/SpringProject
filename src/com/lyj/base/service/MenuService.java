package com.lyj.base.service;

import java.util.ArrayList;
import java.util.Date;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import javax.servlet.http.HttpServletRequest;

import net.sf.json.JSONArray;

import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import com.lyj.base.dao.MenuDao;
import com.lyj.base.entity.MenuInfo;
import com.lyj.base.entity.UserInfo;
import com.lyj.base.util.StringUtil;

/**
 * SpringMVC+Hibernate +MySql+ EasyUI ---CRUD
 * 
 * @author LIUYIJIAO 类名称：UserService
 * @date 2014-11-15 下午4:14:37 备注：
 */
public class MenuService extends BaseService {
	MenuDao menuDao;

	public JSONArray treeFindByPid(String pid) {
		List<Map<String, Object>> retList = new ArrayList<Map<String, Object>>();
		List<MenuInfo> sonList = new ArrayList<MenuInfo>();// 子集合
		List<MenuInfo> rootList = new ArrayList<MenuInfo>();// 根集合
		rootList = menuDao.getParentList(pid);
		for (int i = 0; i < rootList.size(); i++) {
			Map<String, Object> tree = new HashMap<String, Object>();
			sonList = menuDao.querySonList(rootList.get(i).getId());
			tree.put("id", rootList.get(i).getId());
			tree.put("text", rootList.get(i).getMenuDesc());
			tree.put("attributes", rootList.get(i).getParentId());
			if (!sonList.isEmpty()) {// 判断是否是叶子节点
				tree.put("state", "closed");
			}
			retList.add(tree);
		}
		return JSONArray.fromObject(retList);
	}

	public JSONArray treeQuery(String pid) {
		List<Map<String, Object>> retList = new ArrayList<Map<String, Object>>();
		List<MenuInfo> sonList = new ArrayList<MenuInfo>();// 子集合
		List<MenuInfo> rootList = new ArrayList<MenuInfo>();// 根集合
		rootList = menuDao.getParentList(pid);
		for (int i = 0; i < rootList.size(); i++) {
			Map<String, Object> tree = new HashMap<String, Object>();
			sonList = menuDao.querySonList(rootList.get(i).getParentId());
			tree.put("id", rootList.get(i).getId());
			tree.put("text", rootList.get(i).getMenuDesc());
			tree.put("attributes", rootList.get(i).getParentId());
			if (!sonList.isEmpty()) {// 判断是否是叶子节点
				tree.put("state", "closed");
			}
			retList.add(tree);
		}
		JSONArray json = JSONArray.fromObject(retList);
		return json;
	}
	public void addBrother(MenuInfo fun) throws Exception {
		menuDao.addBrother(fun);
	}
	public String add(MenuInfo menuInfo) {
		super.save(menuInfo);
		String result = "{\"success\":true,\"msg\":\"新增角色成功\"}";
		return result ;
	}
	public void delete(int id) throws Exception {
		menuDao.delete(id);
	}
	public void update(String id, String text) throws Exception {
		menuDao.update(id, text);
	}
	public void updateObject(HttpServletRequest request, MenuInfo menuInfo,String id) throws Exception {
		super.update(menuInfo);
	}
	public List<String> findPath(String text) {
		return menuDao.findPath(text);
	}
	public List<MenuInfo> querySonList(int pid) {
		return menuDao.querySonList(pid);
	}
	public String findByText(String text) {
		String result = "{\"length\":\"0\"}";
		List<Map<String, Object>> retList = new ArrayList<Map<String, Object>>();
		List<MenuInfo> rootList = new ArrayList<MenuInfo>();// 根集合
		List<MenuInfo> list = menuDao.findByText(text);
		if (list.size() != 0)// 查询结果不为空
		{
			// 查找所有的根节点
			for (int i = 0; i < list.size(); i++) {
				if (list.get(i).getParentId() == 0) {
					if (!rootList.contains(list.get(i))) {
						rootList.add(list.get(i));
					}
				} else {
					getParentList(list, rootList, list.get(i));
				}
			}
			// 得到树对象
			for (int i = 0; i < rootList.size(); i++) {
				List<MenuInfo> sonList = new ArrayList<MenuInfo>();// 子集合
				Map<String, Object> tree = new HashMap<String, Object>();
				for (MenuInfo obj : list) {
					if (obj.getParentId() == rootList.get(i).getId()) {
						sonList.add(obj);
					}
				}
				tree.put("id", rootList.get(i).getId());
				tree.put("text", rootList.get(i).getMenuDesc());
				if (!sonList.isEmpty()) {// 判断是否是叶子节点
					// tree.put("state", "closed");
					tree.put("children", this.getChildren(list, sonList));
				}
				retList.add(tree);
			}

			JSONArray json = JSONArray.fromObject(retList);
			result = json.toString();
		}
		return result;
	}

	private List<Map<String, Object>> getChildren(List<MenuInfo> allList,
			List<MenuInfo> list) {
		List<Map<String, Object>> retList = new ArrayList<Map<String, Object>>();
		List<MenuInfo> sonList = new ArrayList<MenuInfo>();// 子集合
		for (int i = 0; i < list.size(); i++) {
			Map<String, Object> tree = new HashMap<String, Object>();// 重复树 问题！！！
			tree.put("id", list.get(i).getId());
			tree.put("text", list.get(i).getMenuDesc());
			sonList = this.getSonList(allList, list.get(i).getId());
			if (!sonList.isEmpty()) {
				// tree.put("state", "closed");
				tree.put("children", this.getChildren(allList, sonList));
			}
			retList.add(tree);
		}
		return retList;
	}
	private List<MenuInfo> getSonList(List<MenuInfo> list, int id) {
		List<MenuInfo> sonList = new ArrayList<MenuInfo>();// 子集合
		for (MenuInfo obj : list) {
			if (obj.getParentId() == id) {
				sonList.add(obj);
			}
		}
		return sonList;
	}
	private void getParentList(List<MenuInfo> list, List<MenuInfo> rootList,
			MenuInfo menuInfo) {
		MenuInfo pMenuInfo = menuDao.get(MenuInfo.class, menuInfo.getParentId());
		if (pMenuInfo.getParentId() == 0) {
			if (!rootList.contains(pMenuInfo)) {
				rootList.add(pMenuInfo);
			}
			// System.out.println("非父节点继续查询");
		} else {
			list.add(pMenuInfo);
			this.getParentList(list, rootList, pMenuInfo);
		}
	}
	/*table的方法*/
	
	public String list(String name,int start, int size, String order){
		List<Map<String,Object>> list =menuDao.list(name,start, size, order); 
		int count = count(name,start, size, order);
		
		Map<String,Object> map = new HashMap<String, Object>();
		map.put("total", count);
		map.put("rows", list);
		
		Gson gson = new GsonBuilder().setDateFormat("yyyy-MM-dd HH:mm:ss").create();
		String s = gson.toJson(map);
		return s;
	}
	public int count(String name,int start, int size, String order){
		return menuDao.count(name,start, size, order);
	}
	public MenuDao getMenuDao() {
		return menuDao;
	}
	public void setMenuDao(MenuDao menuDao) {
		this.menuDao = menuDao;
	}

}
