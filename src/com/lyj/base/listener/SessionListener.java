  package com.lyj.base.listener;
  
  import java.util.HashSet;
import java.util.Set;

import javax.servlet.ServletContextEvent;
import javax.servlet.ServletContextListener;
import javax.servlet.http.HttpSession;
import javax.servlet.http.HttpSessionEvent;
import javax.servlet.http.HttpSessionListener;
  
  public class SessionListener
    implements HttpSessionListener, ServletContextListener
  {
    private static Set<HttpSession> sessionSet = new HashSet();
    
    public void sessionCreated(HttpSessionEvent event)
    {
      sessionSet.add(event.getSession());
      event.getSession().getServletContext().setAttribute("sessionSet", sessionSet);
    }
    
    public void sessionDestroyed(HttpSessionEvent event)
    {
      sessionSet.remove(event.getSession());
      event.getSession().getServletContext().setAttribute("sessionSet", sessionSet);
    }
    
    public void contextInitialized(ServletContextEvent paramServletContextEvent)
    {
      String a = paramServletContextEvent.getServletContext().getInitParameter("webAppRootKey");
      System.out.println("========实现ServeletContexListener可以得到context-param 中的配置项=============" + a);
    }
    
    public void contextDestroyed(ServletContextEvent paramServletContextEvent) {}
  }
