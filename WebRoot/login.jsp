<%@page language="java" pageEncoding="UTF-8"%>
<html>
<head>
<title>shiro-spring登录页面</title>
<style>.error{color:red;}</style>
</head>
<body>
 <div class="error">${error}</div>
 <form action="" method="post">
  用户名：<input name="username" type="text"> 密码：<input
   name="password" type="password">
    记住我：<input type="radio"
   name="rememberMe" type="rememberMe">
  <button type="submit">登录</button>
 </form>
</body>
</html>