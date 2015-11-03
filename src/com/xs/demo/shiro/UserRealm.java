package com.xs.demo.shiro;
import org.apache.shiro.SecurityUtils;
import org.apache.shiro.authc.AuthenticationException;
import org.apache.shiro.authc.AuthenticationInfo;
import org.apache.shiro.authc.AuthenticationToken;
import org.apache.shiro.authc.IncorrectCredentialsException;
import org.apache.shiro.authc.SimpleAuthenticationInfo;
import org.apache.shiro.authc.UnknownAccountException;
import org.apache.shiro.authz.AuthorizationInfo;
import org.apache.shiro.realm.AuthorizingRealm;
import org.apache.shiro.subject.PrincipalCollection;
import org.apache.shiro.util.ByteSource;

import com.xs.demo.util.StringUtil;
public class UserRealm extends AuthorizingRealm{
 protected AuthorizationInfo doGetAuthorizationInfo(PrincipalCollection principals) {
  return null;
 }
 protected AuthenticationInfo doGetAuthenticationInfo(AuthenticationToken token) throws AuthenticationException {
  String username=(String) token.getPrincipal();//得到用户名  
  String password = new String((char[])token.getCredentials()); //得到密码 
  if(!username.equals("admin")){
	  SecurityUtils.getSubject().getSession().setAttribute("error", "用户名错误");
	  throw new UnknownAccountException(); //如果用户名错误  
	  
  }
  if(!"123".equals(password)) {  
	  SecurityUtils.getSubject().getSession().setAttribute("error", "用户密码错误");
      throw new IncorrectCredentialsException(); //如果密码错误  
  }  
  SimpleAuthenticationInfo authenticationInfo=new SimpleAuthenticationInfo(username,password,ByteSource.Util.bytes(username+"8d78869f470951332959580424d4bf4f"),getName());
  return authenticationInfo;
 }
}