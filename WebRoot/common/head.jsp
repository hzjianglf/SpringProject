 <%@ page language="java"  pageEncoding="utf-8"%>
 <%@taglib prefix="shiro" uri="http://shiro.apache.org/tags"%>
 <div class="header">
   <nav class="navbar navbar-default  navbar-fixed-top">
  <div class="container">
    	<ul class="nav navbar-nav">
        <li class=""><a href="user/index" class="iframe">用户管理 <span class="sr-only">(current)</span></a></li>
        <li class="dropdown">
          <a href="#" class="dropdown-toggle" data-toggle="dropdown" role="button" aria-haspopup="true" aria-expanded="false">测试界面 <span class="caret"></span></a>
          <ul class="dropdown-menu">
            <li><a href="charts/test.html" class="iframe">图表测试</a></li>
            <li><a href="voteyouth/vote.html" class="iframe">投票测试</a></li>
            <li><a href="#">Something else here</a></li>
            <li role="separator" class="divider"></li>
          </ul>
        </li>
      </ul>
       <ul class="nav navbar-nav navbar-right ">
         <li class="dropdown">
          <a href="#" class="dropdown-toggle" data-toggle="dropdown" role="button" aria-haspopup="true" aria-expanded="false"> 欢迎[<shiro:principal/>]登录 <span class="caret"></span></a>
	          <ul class="dropdown-menu">
	            <li> <shiro:guest>
				  <a href="${pageContext.request.contextPath}/login.jsp">点击登录</a> 
			 </shiro:guest> </li>
	            <li> <shiro:user>
				 <a href="${pageContext.request.contextPath}/logout">点击退出</a> 
			 </shiro:user></li>
	          </ul>
		  </li>
		  </ul>
  </div>
</nav>
</div>
