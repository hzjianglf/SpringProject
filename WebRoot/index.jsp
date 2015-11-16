<%@ page language="java" import="java.util.*" pageEncoding="utf-8"%>
<%@taglib prefix="shiro" uri="http://shiro.apache.org/tags"%>
<%
String path = request.getContextPath();
String basePath = request.getScheme()+"://"+request.getServerName()+":"+request.getServerPort()+path+"/";
%>

<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN">
<html>
  <head> 
    <base href="<%=basePath%>">
    <title>SpringMVC+Hibernate +MySql+ EasyUI ---CRUD</title>
    <style type="text/css">
     .page-container{ padding-top: 35px;}
    </style>
	<meta http-equiv="pragma" content="no-cache">
	<meta http-equiv="cache-control" content="no-cache">
	<meta http-equiv="expires" content="0">    
	<meta http-equiv="keywords" content="keyword1,keyword2,keyword3">
	<meta http-equiv="description" content="This is my page">
	<meta charset="utf-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <!-- 上述3个meta标签*必须*放在最前面，任何其他内容都*必须*跟随其后！ -->
    <!-- Bootstrap -->
    <link href="plugins/bootstrap/3.0.3/css/bootstrap.min.css" rel="stylesheet">
    <!-- HTML5 shim and Respond.js for IE8 support of HTML5 elements and media queries -->
    <!-- WARNING: Respond.js doesn't work if you view the page via file:// -->
    <!--[if lt IE 9]>
      <script src="plugins/html5shiv/html5shiv.min.js"></script>
      <script src="plugins/respond/respond.min.js"></script>
    <![endif]-->
  </head>
  <body>
<!-- 头部文件 -->
<%@ include file="common/head.jsp"%>
<div class="clearfix"></div>
<div class="page-container" >
	<iframe id="iframeContent" frameborder="0" scrolling="no"  width="100%" height="100%" src="http://localhost:8080/springHibernate/voteyouth/vote.html"> </iframe>
</div>
<!-- 底部文件 -->
<div class="clearfix"></div>
<div class="footer">
		<div class="footer-inner text-center">
		    联系电话：17701310086 QQ：893093993 京ICP备15016180号
		</div>
	</div>
</body>
  <!-- 这个ie8上不好用   http://jquery.com/download/  官网说明：jQuery 2.x has the same API as jQuery 1.x, but does not support Internet Explorer 6, 7, or 8. -->
<!-- <script src="../plugins/jquery/2.0.0/jquery.min.js"></script> -->  
 <!--  <script src="//cdn.bootcss.com/jquery/1.11.3/jquery.min.js"></script>  --> 
  <script src="plugins/jquery/1.11.3/jquery-1.11.3.min.js"></script> 
<script src="plugins/bootstrap/3.0.3/js/bootstrap.min.js"></script>
<script src="plugins/jqueryCookie/jquery.cookie.js"></script>
<script type="text/javascript">
/* 禁用a标签的事件 定义自己的事件*/
	$("a.iframe").click(function (e){
		event.preventDefault();
		var href=$(this).attr("href");
		$("#iframeContent").attr("src",href);
	});
</script>
</html>
