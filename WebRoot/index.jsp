<%@ page language="java" import="java.util.*" pageEncoding="utf-8"%>
<%
String path = request.getContextPath();
String basePath = request.getScheme()+"://"+request.getServerName()+":"+request.getServerPort()+path+"/";
%>

<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN">
<html>
  <head>
    <base href="<%=basePath%>">
    
    <title>SpringMVC+Hibernate +MySql+ EasyUI ---CRUD</title>
	<meta http-equiv="pragma" content="no-cache">
	<meta http-equiv="cache-control" content="no-cache">
	<meta http-equiv="expires" content="0">    
	<meta http-equiv="keywords" content="keyword1,keyword2,keyword3">
	<meta http-equiv="description" content="This is my page">

  </head>
  <body>
    SpringMVC+Hibernate +MySql+ EasyUI ---CRUD<br>
    	CRUD页面 <a href="http://localhost:8080/springHibernate/user/index">http://localhsot:8080/springHibernate/user/index</a>
    	
    	<h3>页面在WEB-INF/views</h3>
  </body>
</html>
