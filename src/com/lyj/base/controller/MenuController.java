package com.lyj.base.controller;

import java.net.URLDecoder;
import java.net.URLEncoder;
import java.util.HashMap;
import java.util.Map;
import java.util.Random;
import java.util.UUID;

import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

import net.sf.json.JSONArray;

import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.ServletRequestUtils;
import org.springframework.web.bind.annotation.RequestMapping;

import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import com.lyj.base.entity.MenuInfo;
import com.lyj.base.entity.UserInfo;
import com.lyj.base.service.MenuService;
import com.lyj.base.util.StringUtil;

@Controller
@RequestMapping(value = "/menu")
public class MenuController {
	private static Log log = LogFactory.getLog(UserController.class);
	MenuService menuService;

	@RequestMapping(value = "/treeQuery")
	public void treeQuery(HttpServletRequest request,
			HttpServletResponse response) throws Exception {
		String pid = ServletRequestUtils.getStringParameter(request, "id");
		JSONArray json = menuService.treeQuery(pid);
		StringUtil.writeToWeb(json.toString(), "json", response);
		// response.getWriter().write("[{id:'1',text:'yiyi'}]");//easyui对数据有严格的格式要求
		// response.getWriter().print("[{\"id\":\"a\",\"text\":\"江苏省\"},{\"id\":\"b\",\"text\":\"浙江省\"},{\"id\":\"c\",\"text\":\"安徽省\"}]");
	}

	@RequestMapping(value = "/treeFindByPid")
	public void treeFindByPid(HttpServletRequest request,
			HttpServletResponse response) throws Exception {
		String id = ServletRequestUtils.getStringParameter(request, "id");
		JSONArray json = JSONArray.fromObject(menuService.treeFindByPid(id));
		StringUtil.writeToWeb(json.toString(), "json", response);
	}

	@RequestMapping(value = "/treeDelete")
	public void treeDelete(HttpServletRequest request,
			HttpServletResponse response) throws Exception {
		int id = ServletRequestUtils.getIntParameter(request, "id");
		String text = ServletRequestUtils.getStringParameter(request, "text");
		try {
			menuService.delete(id);
		} catch (Exception e) {
			StringUtil.writeToWeb(
					"{\"success\":false,\"msg\":\"删除菜单失败,原因" + e.toString()
							+ "\"}", "json", response);
			e.printStackTrace();
		}
		StringUtil.writeToWeb("{\"success\":true,\"msg\":\"删除菜单成功,名称>" + text
				+ ",id>" + id + "\"}", "json", response);

	}

	@RequestMapping(value = "/treeEdite")
	public void treeEdite(HttpServletRequest request,
			HttpServletResponse response) throws Exception {
		String id = ServletRequestUtils.getStringParameter(request, "id");
		MenuInfo menuInfo = (MenuInfo) StringUtil.requestToObject(request, MenuInfo.class);
		/*String menuDesc = URLDecoder.decode(
					  ServletRequestUtils.getStringParameter(request, "menuDesc"),
					  "UTF-8");
		menuInfo.setMenuDesc(menuDesc);//中文乱码
*/		try {
			//menuService.update(id, text);
			 menuService.updateObject(request,menuInfo,id);
		} catch (Exception e) {
			StringUtil.writeToWeb("{\"success\":false,\"msg\":\"修改失败\"}","json", response);
			e.printStackTrace();
		}
		StringUtil.writeToWeb("{\"success\":true,\"msg\":\"修改菜单成功\"}", "json",response);
	}
	@RequestMapping(value = "/treeAddBrother")
	public void treeAddBrother(HttpServletRequest request, HttpServletResponse response)
			throws Exception {
		String sParentId = request.getParameter("pid");
		if (sParentId.equals("null") || sParentId.equals("undefined")) {
			sParentId = "0";
		}
		String text = URLDecoder.decode(
				ServletRequestUtils.getStringParameter(request, "text"),
				"UTF-8");
		MenuInfo fun = new MenuInfo();
		String s = UUID.randomUUID().toString();
		// 去掉"-"符号
		String fldid = s.substring(0, 8) + s.substring(9, 13)
				+ s.substring(14, 18) + s.substring(19, 23) + s.substring(24);
		fun.setId(new Random().nextInt(1111));
		fun.setParentId(Integer.valueOf(sParentId));
		fun.setMenuDesc(text);
		try {
			menuService.addBrother(fun);
		} catch (Exception e) {
			StringUtil.writeToWeb("{\"success\":false,\"msg\":\"添加兄弟菜单失败\"}", "json", response);
			e.printStackTrace();
		}
		StringUtil.writeToWeb(
				"{\"success\":true,\"msg\":\"添加兄弟菜单成功\",\"id\":\"" + fldid
						+ "\",\"text\":\"" + text + "\"}", "json", response);

	}
	@RequestMapping(value = "/treeAdd")
	public void treeAdd(HttpServletRequest request, HttpServletResponse response)
	throws Exception {
		String result="{\"success\":false,\"msg\":\"添加失败\"}";
		/*String sParentId = request.getParameter("pid");
		if (sParentId.equals("null") || sParentId.equals("undefined")) {
			sParentId = "0";
		}*/
		MenuInfo menuInfo = (MenuInfo) StringUtil.requestToObject(request, MenuInfo.class);
		/*String menuDesc = URLDecoder.decode(
					  ServletRequestUtils.getStringParameter(request, "menuDesc"),
					  "UTF-8");
		menuInfo.setMenuDesc(menuDesc);//中文乱码
*/		try {
			//menuService.update(id, text);
			menuInfo.setId(new Random().nextInt(100000));
			 result=menuService.add(menuInfo);
		} catch (Exception e) {
			StringUtil.writeToWeb(result,"json", response);
			e.printStackTrace();
		}
		StringUtil.writeToWeb(result, "json",response);
		
	}

	@RequestMapping(value = "/treeFindByText")
	public void treeFindByText(HttpServletRequest request,
			HttpServletResponse response) throws Exception {
		String text = URLDecoder.decode(
				ServletRequestUtils.getStringParameter(request, "text"),
				"UTF-8");
		String result = menuService.findByText(text);
		StringUtil.writeToWeb(result, "json", response);
	}
	/**************** 列表的增删改查 ************************/

	/*	 
	 * list method
	 * 
	 * @param request
	 * @param response
	 * @return
	 * @throws Exception
	 */
	 
	@RequestMapping(value = "/list")
	public String list(HttpServletRequest request, HttpServletResponse response)
			throws Exception {
		int start = ServletRequestUtils.getIntParameter(request, "page", 1) - 1;
		int size = ServletRequestUtils.getIntParameter(request, "rows", 0);
		String name = ServletRequestUtils.getStringParameter(request, "name",
				"");
		String order = StringUtil.getOrderString(request); // 取得排序参数

		String result = null;
		try {
			result = menuService.list(name, start, size, order);
		} catch (Exception e) {
			if (log.isErrorEnabled()) {
				log.error("查询列表失败", e);
			}
			result = "";
		}
		/*String sortName = ServletRequestUtils.getStringParameter(request,
				"sort", "");
		String sortOrder = ServletRequestUtils.getStringParameter(request,
				"order", "");
		Map<String, Object> searchMap = new HashMap<String, Object>();
		searchMap.put("pageNumber", start + 1);
		searchMap.put("rows", size);
		searchMap.put("sortName", sortName);
		searchMap.put("sortOrder", sortOrder);
		Gson gson = new GsonBuilder().setDateFormat("yyyy-MM-dd").create();
		String s = gson.toJson(searchMap);
		s = URLEncoder.encode(s, "UTF-8");
*/
		StringUtil.writeToWeb(result, "html", response);
		return null;
	}
	 
	public MenuService getMenuService() {
		return menuService;
	}

	public void setMenuService(MenuService menuService) {
		this.menuService = menuService;
	}

}
