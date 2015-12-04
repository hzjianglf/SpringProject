package com.lyj.base.shiro;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

import org.apache.shiro.SecurityUtils;
import org.apache.shiro.authc.AuthenticationException;
import org.apache.shiro.authc.AuthenticationInfo;
import org.apache.shiro.authc.AuthenticationToken;
import org.apache.shiro.authc.IncorrectCredentialsException;
import org.apache.shiro.authc.SimpleAuthenticationInfo;
import org.apache.shiro.authc.UnknownAccountException;
import org.apache.shiro.authz.AuthorizationInfo;
import org.apache.shiro.authz.SimpleAuthorizationInfo;
import org.apache.shiro.realm.AuthorizingRealm;
import org.apache.shiro.session.Session;
import org.apache.shiro.subject.PrincipalCollection;
import org.apache.shiro.util.ByteSource;
import org.springframework.beans.factory.annotation.Autowired;

import com.lyj.base.entity.MenuInfo;
import com.lyj.base.service.MenuService;
import com.lyj.base.util.StringUtil;

public class UserRealm extends AuthorizingRealm {
	@Autowired
	private MenuService menuServcie;
	protected AuthorizationInfo doGetAuthorizationInfo(
			PrincipalCollection principals) {
		String loginName = (String) principals.fromRealm(getName()).iterator()
				.next();
		SimpleAuthorizationInfo info = new SimpleAuthorizationInfo();
		Session session = SecurityUtils.getSubject().getSession();
		Set<String> roles = new HashSet();
		Set<String> permissions = new HashSet();
		roles.add("manager");
		permissions.add("user:show");
		permissions.add("user:create");
		permissions.add("user:delete");
		permissions.add("user:update");
		System.out.println("验证用户权限角色开始---------------");
		if ((session != null)
				&& (!StringUtil.isEmpty(session.getAttribute("role")))) {
			info.addRoles((Set) session.getAttribute("role"));
			System.out.println("读取sesson角色");
		} else {
			System.out.println("读取数据库角色");
			session.setAttribute("role", roles);
			info.addRoles(roles);
		}
		if ((session != null)
				&& (!StringUtil.isEmpty(session.getAttribute("permission")))) {
			System.out.println("读取session数据权限");
			info.addStringPermissions((Set) session.getAttribute("permission"));
		} else {
			System.out.println("读取数据库权限");
			session.setAttribute("permission", permissions);
			info.addStringPermissions(permissions);
		}
		System.out.println("验证用户权限角色结束---------------");
		return info;
	}

	protected AuthenticationInfo doGetAuthenticationInfo(
			AuthenticationToken token) throws AuthenticationException {
		String username = (String) token.getPrincipal();
		String password = new String((char[]) token.getCredentials());
		if (!username.equals("admin")) {
			SecurityUtils.getSubject().getSession()
					.setAttribute("error", "用户名错误");
			throw new UnknownAccountException();
		}
		if (!"123".equals(password)) {
			SecurityUtils.getSubject().getSession()
					.setAttribute("error", "用户密码错误");
			throw new IncorrectCredentialsException();
		}
		SimpleAuthenticationInfo authenticationInfo = new SimpleAuthenticationInfo(
				username, password, ByteSource.Util.bytes(username
						+ "8d78869f470951332959580424d4bf4f"), getName());
		Session session = SecurityUtils.getSubject().getSession();
		List<MenuInfo> pMenu = new ArrayList();
		List<MenuInfo> childMenu = new ArrayList();
		List<MenuInfo> allMenu=menuServcie.list(MenuInfo.class);
		for(MenuInfo menuInfo:allMenu){
			if(menuInfo.getParentId()==0){
				pMenu.add(menuInfo);
			}else{
				childMenu.add(menuInfo);
			}
		}
		/*MenuInfo info = new MenuInfo();
		info.setId(Integer.valueOf(1));
		info.setMenuDesc("用户管理");
		info.setMenuOrder(1);
		info.setMenuUrl("user/index");
		info.setParentId(0);
		info.setType(1);
		MenuInfo info1 = new MenuInfo();
		info1.setId(Integer.valueOf(2));
		info1.setMenuDesc("测试界面");
		info1.setMenuOrder(2);
		info1.setMenuUrl("user/index");
		info1.setParentId(0);
		info1.setType(0);
		MenuInfo info2 = new MenuInfo();
		info2.setMenuDesc("图表测试");
		info2.setMenuOrder(2);
		info2.setMenuUrl("charts/test.html");
		info2.setParentId(2);
		info2.setType(2);
		pMenu.add(info);
		pMenu.add(info1);
		childMenu.add(info2);*/
		session.setAttribute("parentMenu", pMenu);
		session.setAttribute("childMenu", childMenu);
		return authenticationInfo;
	}

}
