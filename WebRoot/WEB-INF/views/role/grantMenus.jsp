<%@ page contentType="text/html;charset=UTF-8" %>
<%
	String path = request.getContextPath();
	String basePath = request.getScheme() + "://"
			+ request.getServerName() + ":" + request.getServerPort()
			+ path + "/";
%>
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
<title>SpringMVC+Hibernate +MySql+ EasyUI ---CRUD调试bug</title>
<base href="<%=basePath%>">
 <link rel="stylesheet" href="plugins/easyui/easyui1.3.2/themes/default/easyui.css" />
<link rel="stylesheet" href="plugins/easyui/easyui1.3.2/themes/icon.css" />
 <link href="plugins/bootstrap/3.0.3/css/bootstrap.min.css" rel="stylesheet">
<!-- 只能使用1.9 以下的版本 否则easyui不支持 -->
  <script charset="UTF-8"  src="plugins/easyui/easyui1.3.2/jquery-1.8.0.min.js"></script> 
<script type="text/javascript" src="plugins/easyui/easyui1.3.2/jquery.easyui.min.js"></script> 
<script type="text/javascript" src="plugins/bootstrap/3.0.3/js/bootstrap.min.js"></script>  
<script type="text/javascript">
$(function(){
	gotoGrantMenu();
});
	function gotoGrantMenu(){
		var roleId='${roleId}';
		$('#menuTree').tree({
			checkbox : true,
			url : 'menu/grantTree?roleId='+roleId,
			onBeforeExpand : function(node, param) {
				// url"EasyTreeQuery.action?id=" + node.id;  默认会传递一个id参数
				//$('#menuTree').tree('options').url = "menu/treeFindByPid";// change the url                     
			},
			onLoadSuccess : function() {
				//$("#shouquan").modal();

			}
		});
	}	
	function  grantMenus(){
		var roleId=$("#roleId").val();//授权角色ID
		//得到 选中的选项
		var nodes= $('#menuTree').tree('getChecked');//菜单IDS
		var nodeIds=[];
		for(var i=0;i<nodes.length;i++){
			nodeIds.push(nodes[i].id);
		}
		$.ajax({
			type : 'post',
			url : 'role/grantMenus',
			data:"roleId="+roleId+"&menuIds="+nodeIds,
			dataType: "json",
    		success:function(data){
    			  alert("授权成功");
				}
			});
	}
</script>
</head>
 <body>
 <input type="hidden" id="roleId" value="${roleId}" />
 	<div class="panel panel-default">
		  <div class="panel-heading">
		    <h3 class="panel-title">树形菜单视图</h3>
		  </div>
		  <div class="panel-body">
		      <div id="menuTree">
			 </div>
			 <button type="button" class="btn btn-default"  data-dismiss="modal">关闭</button>
       		 <button  class="btn btn-primary" onclick="grantMenus();" id="doSubmit" >保存</button>
		  </div>
	</div>
 </body>
</html>