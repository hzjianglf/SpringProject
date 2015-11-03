package com.xs.demo.listener;

import java.util.HashSet;
import java.util.Set;

import javax.servlet.ServletContextEvent;
import javax.servlet.ServletContextListener;
import javax.servlet.http.HttpSession;
import javax.servlet.http.HttpSessionEvent;
import javax.servlet.http.HttpSessionListener;
/**
 * SpringMVC+Hibernate +MySql+ EasyUI ---CRUD
 * @author 宗潇帅
 * 类名称：SessionListener 
 * @date 2014-11-15 下午4:35:06 
 * 备注：
 */
public class SessionListener implements HttpSessionListener,ServletContextListener {

	private static Set<HttpSession> sessionSet = new HashSet<HttpSession>();
	@Override
	public void sessionCreated(HttpSessionEvent event) {
		sessionSet.add(event.getSession());
		event.getSession().getServletContext().setAttribute("sessionSet", sessionSet);
	}

	@Override
	public void sessionDestroyed(HttpSessionEvent event) {
		sessionSet.remove(event.getSession());
		event.getSession().getServletContext().setAttribute("sessionSet", sessionSet);
	}

	@Override
	public void contextInitialized(ServletContextEvent paramServletContextEvent) {
		String a=paramServletContextEvent.getServletContext().getInitParameter("webAppRootKey");
		System.out.println("========实现ServeletContexListener可以得到context-param 中的配置项============="+a);
		
	}

	@Override
	public void contextDestroyed(ServletContextEvent paramServletContextEvent) {
		 
		
	}


}
