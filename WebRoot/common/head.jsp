 <%@ page language="java" import="com.lyj.base.entity.MenuInfo"  pageEncoding="utf-8"%>
 <%@taglib prefix="shiro" uri="http://shiro.apache.org/tags"%>
 <%@ taglib prefix="c" uri="http://java.sun.com/jsp/jstl/core" %>
<%@ taglib prefix="fmt" uri="http://java.sun.com/jsp/jstl/fmt" %>
<%@ taglib prefix="fn" uri="http://java.sun.com/jsp/jstl/functions" %>
 <div class="header">
   <!-- <nav class="navbar navbar-default  navbar-fixed-top"> -->
   <nav class="navbar navbar-default ">
  <div class="container">
    	<ul class="nav navbar-nav">
    	 <c:forEach var="menu" items="${parentMenu}">
    	 	<c:if test="${menu['type']==1}">
    	 		<li class=""><a href="${menu['menuUrl']}" class="iframe">${menu["menuDesc"]} <span class="sr-only">(current)</span></a></li>
    	 	</c:if>
    	 	<c:if test="${menu['type']==0}">
    	 		<li class="dropdown">
          			<a href="#" class="dropdown-toggle" data-toggle="dropdown" role="button" aria-haspopup="true" aria-expanded="false">${menu["menuDesc"]} <span class="caret"></span></a>
         			 <ul class="dropdown-menu">
         			 	<c:forEach var="childOne" items="${childMenu}">
         			 		<c:if test="${childOne['parentId']== menu['id']}">
         			 			<li><a href="${childOne['menuUrl']}" class="iframe">${childOne['menuDesc']}</a></li>
         			 		</c:if>
         			 	</c:forEach>
		         	 </ul>
       			 </li> 
    	 	</c:if>
    	</c:forEach>
       <!-- <li class=""><a href="user/index" class="iframe">用户管理<span class="sr-only">(current)</span></a></li>
        <li class="dropdown">
          <a href="#" class="dropdown-toggle" data-toggle="dropdown" role="button" aria-haspopup="true" aria-expanded="false">测试界面 <span class="caret"></span></a>
          <ul class="dropdown-menu">
            <li><a href="charts/test.html" class="iframe">图表测试</a></li>
            <li><a href="voteyouth/vote.html" class="iframe">投票测试</a></li>
            <li><a href="user/gotoAdd" class="content">ajax测试</a></li>
            <li><a href="#">Something else here</a></li>
            <li role="separator" class="divider"></li>
          </ul>
        </li>  -->
        <!-- <li class=""><a href="menuTree/yibushueasyui.jsp" class="iframe">菜单管理<span class="sr-only">(current)</span></a></li>
        <li class=""><a href="role/index" class="iframe">角色管理<span class="sr-only">(current)</span></a></li> -->
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
