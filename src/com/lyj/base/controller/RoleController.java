package com.lyj.base.controller;

import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.ServletRequestUtils;
import org.springframework.web.bind.annotation.RequestMapping;

import com.lyj.base.entity.RoleInfo;
import com.lyj.base.service.RoleService;
import com.lyj.base.util.StringUtil;
/**
 * SpringMVC+Hibernate +MySql+ EasyUI ---CRUD
 * @author LIUYIJIAO
 * 类名称：UserController 
 * @date 2014-11-15 下午4:05:32 
 * 备注：
 */
@Controller
@RequestMapping(value="/role")
public class RoleController {
	
	RoleService roleService;
	
	private static Log log = LogFactory.getLog(RoleController.class);
	
	/**
	 * index --list
	 * @param request
	 * @param response
	 * @return
	 * @throws Exception
	 */
	@RequestMapping(value="/index")
	public String index(HttpServletRequest request,
			HttpServletResponse response)throws Exception{
		return "/views/role/index";
	}
	/**
	 * list method
	 * @param request
	 * @param response
	 * @return
	 * @throws Exception
	 */
	@RequestMapping(value = "/list")
	public String list(HttpServletRequest request,
			HttpServletResponse response) throws Exception{
		int start = ServletRequestUtils.getIntParameter(request, "page", 1)-1;
		int size = ServletRequestUtils.getIntParameter(request, "rows", 0);
		String name = ServletRequestUtils.getStringParameter(request, "name","");
		String order = StringUtil.getOrderString(request);	//取得排序参数
		
		String result = null;
		try{
			result = roleService.list(name,start, size, order);
		}catch (Exception e) {
			if(log.isErrorEnabled()){
				log.error("查询列表失败", e);
			}
			result = "";
		}
		/*String sortName = ServletRequestUtils.getStringParameter(request, "sort", "");
		String sortOrder = ServletRequestUtils.getStringParameter(request, "order", "");
		Map<String, Object> searchMap = new HashMap<String,Object>();
		searchMap.put("pageNumber", start+1);
		searchMap.put("rows", size);
		searchMap.put("sortName", sortName);
		searchMap.put("sortOrder", sortOrder);
		Gson gson = new GsonBuilder().setDateFormat("yyyy-MM-dd").create();
		String s = gson.toJson(searchMap);
		s = URLEncoder.encode(s,"UTF-8");*/ 
		
		StringUtil.writeToWeb(result, "html", response);
		return null;
	}
	/**
	 * gotoAdd --page
	 * @param request
	 * @param response
	 * @return
	 * @throws Exception
	 */
	@RequestMapping(value="/gotoAdd")
	public String gotoAdd(HttpServletRequest request,
			HttpServletResponse response) throws Exception{
		return "views/role/add";
	}
	/**
	 * add --method
	 * @param request
	 * @param response
	 * @return
	 * @throws Exception
	 */
	@RequestMapping(value="/add")
	public String add(HttpServletRequest request,
			HttpServletResponse response)throws Exception {
		String result = null;
		RoleInfo roleinfo = (RoleInfo)StringUtil.requestToObject(request, RoleInfo.class);
		RoleInfo dbRoleinfo =  roleService.getRoleByName(roleinfo.getRoleName());
		if(dbRoleinfo!=null){
			result = "{\"success\":false,\"msg\":\"名称已存在！\"}";
			StringUtil.writeToWeb(result, "html", response);
			return null;
		}
		try{
			if(roleinfo.getRoleName().trim().length()<0){
				result = "{\"success\":false,\"msg\":\"名称不能为空！\"}";
				StringUtil.writeToWeb(result, "html", response);
				return null;
			}else{
				result = roleService.save(roleinfo);
			}
		}catch(Exception e){
			if(log.isErrorEnabled()){
				log.error("新增失败", e);
			}
			result = "{\"success\":false,\"msg\":\"系统错误，请稍候再试！\"}";
		}
		StringUtil.writeToWeb(result, "html", response);
		return null;
	}
	/**
	 * gotoModify --page
	 * @param request
	 * @param response
	 * @return
	 */
	@RequestMapping(value="/gotoModify")
	public String gotoModify(HttpServletRequest request,
			HttpServletResponse response)throws Exception {
		Integer id = ServletRequestUtils.getIntParameter(request,"id");
		RoleInfo roleinfo = roleService.get(RoleInfo.class,id);
		request.setAttribute("roleinfo", roleinfo);
			return "views/role/modify";
	}
	/**
	 * modify --method
	 * @param request
	 * @param response
	 * @return
	 * @throws Exception
	 */
	@RequestMapping(value="/modify")
	public String modify(HttpServletRequest request,
			HttpServletResponse response) throws Exception {
		Integer id = ServletRequestUtils.getIntParameter(request, "id");
		RoleInfo dbRoleinfo = roleService.get(RoleInfo.class, id);
		RoleInfo roleInfo = (RoleInfo) StringUtil.requestToObject(request, RoleInfo.class);
		String result;
		if(!dbRoleinfo.getRoleName().equals(roleInfo.getRoleName())){
			RoleInfo hasRoleInfo = roleService.getRoleByName(roleInfo.getRoleName());
			if(hasRoleInfo!=null){
				result = "{\"success\":false,\"msg\":\"角色名称已存在！\"}";
				StringUtil.writeToWeb(result, "html", response);
				return null;
			}
		}
		try{
			result = roleService.update(request,roleInfo, id);
		}catch (Exception e ){
			if(log.isErrorEnabled()){
				log.error("修改失败", e);
			}
			result = "{\"success\":false,\"msg\":\"系统错误，请稍候再试！\"}";
		}
		StringUtil.writeToWeb(result, "html", response);
		return null;
	}
	/**
	 * delete --method
	 * @param request
	 * @param response
	 * @return
	 * @throws Exception
	 */
	@RequestMapping(value = "/delete")
	public String delete(HttpServletRequest request,
			HttpServletResponse response) throws Exception{
		Integer id = ServletRequestUtils.getIntParameter(request, "id");
		
		try{
			if(null != id){
				roleService.delete(id);
			}
			String result = "{\"success\":true,\"msg\":\"删除成功\"}";
			StringUtil.writeToWeb(result, "html", response);
			return null;
		} catch (Exception e) {
			if(log.isErrorEnabled()){
				log.error("删除失败", e);
			}
			String result = "{\"success\":false,\"msg\":\"删除失败，请稍候再试！\"}";
			StringUtil.writeToWeb(result, "html", response);
			return null;
		}
	}
	
	@RequestMapping(value = "/grantMenus")
	public void grantMenus(HttpServletRequest request,HttpServletResponse response) throws Exception{
		String menuIds = ServletRequestUtils.getStringParameter(request, "menuIds");
		int roleId = ServletRequestUtils.getIntParameter(request, "roleId");
		System.out.println(menuIds);
		roleService.grantMenus(menuIds,roleId);
		String result = "{\"success\":true,\"msg\":\"授权成功！\"}";
		StringUtil.writeToWeb(result, "html", response);
	}
	@RequestMapping(value = "/gotoGrantMenus")
	public String gotoGrantMenus(HttpServletRequest request,HttpServletResponse response) throws Exception{
		int roleId = ServletRequestUtils.getIntParameter(request,"roleId");
		request.setAttribute("roleId", roleId);
		 return "/views/role/grantMenus";
	}
	public RoleService getRoleService() {
		return roleService;
	}
	public void setRoleService(RoleService roleService) {
		this.roleService = roleService;
	}
 
}