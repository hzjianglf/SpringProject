package com.lyj.base.controller;

import java.net.URLDecoder;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

import net.sf.json.JSONArray;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.ServletRequestUtils;
import org.springframework.web.bind.annotation.RequestMapping;

import com.lyj.base.entity.MenuInfo;
import com.lyj.base.service.MenuService;
import com.lyj.base.util.StringUtil;

@Controller
@RequestMapping(value="/menu")
public class MenuController  {
	 MenuService menuService;
	 @RequestMapping(value="/tree")
	 public void query(HttpServletRequest request, HttpServletResponse response) throws Exception{
			List<Map<String, Object>> retList = new ArrayList<Map<String, Object>>();
			List<MenuInfo> sonList = new ArrayList<MenuInfo>();// 子集合
			List<MenuInfo> rootList = new ArrayList<MenuInfo>();// 根集合
			String id= ServletRequestUtils.getStringParameter(request, "id");
			rootList = menuService.getRes(id);
			for (int i = 0; i < rootList.size(); i++) {
				Map<String, Object> tree = new HashMap<String, Object>();
				sonList = menuService.querySonList(rootList.get(i).getParentId());
				tree.put("id", rootList.get(i).getId());
				tree.put("text", rootList.get(i).getMenuDesc());
				tree.put("attributes", rootList.get(i).getParentId());
				if (!sonList.isEmpty()) {// 判断是否是叶子节点
					tree.put("state", "closed");
				}
				retList.add(tree);
			}
		
			JSONArray json = JSONArray.fromObject(retList);
			StringUtil.writeToWeb(json.toString(), "json", response);
	// response.getWriter().write("[{id:'1',text:'yiyi'}]");//easyui对数据有严格的格式要求
	// response.getWriter().print("[{\"id\":\"a\",\"text\":\"江苏省\"},{\"id\":\"b\",\"text\":\"浙江省\"},{\"id\":\"c\",\"text\":\"安徽省\"}]");

}
	 
	 
	 @RequestMapping(value="/findById")
		public void findById(HttpServletRequest request, HttpServletResponse response) throws Exception{

			List<Map<String, Object>> retList = new ArrayList<Map<String, Object>>();
			List<MenuInfo> sonList = new ArrayList<MenuInfo>();// 子集合
			List<MenuInfo> rootList = new ArrayList<MenuInfo>();// 根集合
			 String id= ServletRequestUtils.getStringParameter(request, "id");
			rootList = menuService.getRes(id);
			for (int i = 0; i < rootList.size(); i++) {
				Map<String, Object> tree = new HashMap<String, Object>();
				sonList = menuService.querySonList(rootList.get(i).getId());
				tree.put("id", rootList.get(i).getId());
				tree.put("text", rootList.get(i).getMenuDesc());
				tree.put("attributes", rootList.get(i).getParentId());
				if (!sonList.isEmpty()) {// 判断是否是叶子节点
					tree.put("state", "closed");
				}
				retList.add(tree);
			}

			JSONArray json = JSONArray.fromObject(retList);
			StringUtil.writeToWeb(json.toString(), "json", response);
			// response.getWriter().write("[{id:'1',text:'yiyi'}]");//easyui对数据有严格的格式要求
			// response.getWriter().print("[{\"id\":\"a\",\"text\":\"江苏省\"},{\"id\":\"b\",\"text\":\"浙江省\"},{\"id\":\"c\",\"text\":\"安徽省\"}]");


	 }
		 @RequestMapping(value="/delete")
		 public void delete(HttpServletRequest request, HttpServletResponse response) throws Exception{
			 String id= ServletRequestUtils.getStringParameter(request, "id");
			 String text= ServletRequestUtils.getStringParameter(request, "text");
			 try {
					menuService.delete(id);
				} catch (Exception e) {
					 StringUtil.writeToWeb("{\"success\":false,\"msg\":\"删除菜单失败,原因"+e.toString()+"\"}", "json", response);
					e.printStackTrace();
				}
				 StringUtil.writeToWeb("{\"success\":true,\"msg\":\"删除菜单成功,名称>" + text + ",id>" + id + "\"}", "json", response);
			
		 }
			 @RequestMapping(value="/edite")
			 public void edite(HttpServletRequest request, HttpServletResponse response) throws Exception{
			 String id= ServletRequestUtils.getStringParameter(request, "id");
			 String text= URLDecoder.decode(ServletRequestUtils.getStringParameter(request, "text"),"UTF-8");
				try {
					 menuService.update(id, text);
				} catch (Exception e) {
					StringUtil.writeToWeb("{\"success\":false,\"msg\":\"修改失败\"}", "json", response);
					e.printStackTrace();
				}
				 StringUtil.writeToWeb( "{\"success\":true,\"msg\":\"修改菜单成功\"}", "json", response);
		 }
			 @RequestMapping(value="/add")
			 public void add(HttpServletRequest request, HttpServletResponse response) throws Exception{
				String sParentId = request.getParameter("pid");
				if (sParentId.equals("null")||sParentId.equals("undefined")) {
					sParentId = "";
				}
				String text = request.getParameter("text");
				MenuInfo fun = new MenuInfo();
				String s = UUID.randomUUID().toString();
				// 去掉"-"符号
				String fldid = s.substring(0, 8) + s.substring(9, 13)
						+ s.substring(14, 18) + s.substring(19, 23) + s.substring(24);
				fun.setId(Integer.valueOf(fldid));
				fun.setParentId(Integer.valueOf(sParentId));
				fun.setMenuDesc(text);
				try {
					menuService.addBrother(fun);
				} catch (Exception e) {
					StringUtil.writeToWeb( "{\"success\":false,\"msg\":\"添加兄弟菜单失败\"}", "json", response);
					e.printStackTrace();
				}
				StringUtil.writeToWeb( "{\"success\":true,\"msg\":\"添加兄弟菜单成功\",\"id\":\"" + fldid
						+ "\",\"text\":\"" + text + "\"}", "json", response);
			 
		 }
			 @RequestMapping(value="/findByText")
			 public void findByText(HttpServletRequest request, HttpServletResponse response) throws Exception{
				 String text= URLDecoder.decode(ServletRequestUtils.getStringParameter(request, "text"),"UTF-8");
				 String result= menuService.findByText(text);
				 StringUtil.writeToWeb( result, "json", response);
			 }

	public MenuService getMenuService() {
		return menuService;
	}


	public void setMenuService(MenuService menuService) {
		this.menuService = menuService;
	}
 
}
