<%@page language="java" pageEncoding="UTF-8"%>
<%@taglib prefix="shiro" uri="http://shiro.apache.org/tags"%>
<html>
<head>
<title>shiro-spring欢迎页面</title>
</head>
<body>
 <shiro:guest>
  欢迎游客访问，<a href="${pageContext.request.contextPath}/login.jsp">点击登录</a><br/>
 </shiro:guest>
 <shiro:user>
  欢迎[<shiro:principal/>]登录，<a href="${pageContext.request.contextPath}/logout">点击退出</a><br/>
 </shiro:user>
</body>
</html>