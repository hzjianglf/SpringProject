<%@ page language="java" pageEncoding="UTF-8"%>

<%
	String path = request.getContextPath();
	String basePath = request.getScheme() + "://"
			+ request.getServerName() + ":" + request.getServerPort()
			+ path + "/";
%>

<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN">
<html>
<head>
<base href="<%=basePath%>">
<title>Untitled Page</title>
 <link rel="stylesheet" href="plugins/easyui/easyui1.3.2/themes/default/easyui.css" />
<link rel="stylesheet" href="plugins/easyui/easyui1.3.2/themes/icon.css" />
 <link href="plugins/bootstrap/3.0.3/css/bootstrap.min.css" rel="stylesheet">
只能使用1.9 以下的版本 否则easyui不支持
  <script charset="UTF-8"  src="plugins/easyui/easyui1.3.2/jquery-1.8.0.min.js"></script> 
<script type="text/javascript" src="plugins/easyui/easyui1.3.2/jquery.easyui.min.js"></script> 
<script type="text/javascript" src="menuTree/yibushueasyui.js"></script>
<script src="plugins/bootstrap/3.0.3/js/bootstrap.min.js"></script>  
</head>
</head>

<body>
<div class="row">
	<div class="col-md-6">
			<div class="panel panel-default">
		  <div class="panel-heading">
		    <h3 class="panel-title">Panel title</h3>
		  </div>
		  <div class="panel-body">
		    <div id="mm" class="easyui-menu"  >
					<div id="append" onclick="append()" data-options="iconCls:'edit_add'">追加兄弟节点</div>
					<div id="edite" onclick="edite();" data-options="iconCls:'edit_remove'">修改</div>
					<div onclick="shanchu()">移除</div>
				</div>
				<div id="mydialog"
					style="display: none; ">
					<div>
						<label>菜单名称:</label> <input name="text" id="text" >
					</div>
				</div>
				<input id="ss" class="easyui-searchbox" style="width: 300px"
					data-options="searcher:search,prompt:'Please Input Value'"></input>
			
				<div style="width: 150px;">
					<ul id="tt">
					</ul>
				</div>
		  </div>
		</div>
	</div>
	<div class="col-md-6">
		这里放 增删改查功能
	</div>
</div>

</body>
</html>
