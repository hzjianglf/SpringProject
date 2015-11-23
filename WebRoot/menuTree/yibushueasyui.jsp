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
<title>菜单管理界面</title>
 <link rel="stylesheet" href="plugins/easyui/easyui1.3.2/themes/default/easyui.css" />
<link rel="stylesheet" href="plugins/easyui/easyui1.3.2/themes/icon.css" />
 <link href="plugins/bootstrap/3.0.3/css/bootstrap.min.css" rel="stylesheet">
<!-- 只能使用1.9 以下的版本 否则easyui不支持 -->
  <script charset="UTF-8"  src="plugins/easyui/easyui1.3.2/jquery-1.8.0.min.js"></script> 
<script type="text/javascript" src="plugins/easyui/easyui1.3.2/jquery.easyui.min.js"></script> 
<script type="text/javascript" src="menuTree/yibushueasyui.js"></script>
<script src="plugins/bootstrap/3.0.3/js/bootstrap.min.js"></script>  
<script type="text/javascript">
	var searchString;
	 
	//暂时未用
	function getCookie(c_name){
	     if (document.cookie.length>0){
		  c_start=document.cookie.indexOf(c_name + "=");
		  if (c_start!=-1){ 
		    c_start=c_start + c_name.length+1;
		    c_end=document.cookie.indexOf(";",c_start);
		    if (c_end==-1) {
		    	c_end=document.cookie.length;
		    }
		    return document.cookie.substring(c_start,c_end);
		   } 
		  }
		return "";
	}
	
	var pageSize = 20;
	var pageNumber = 1;
	var sortName = '';
	var sortOrder = '';
	function initDate(){
		var s = getCookie("role");
		s = decodeURIComponent(s);  
		if(s != null && s != ""){
			searchMap = eval('(' + s + ')');
			pageSize = searchMap.rows;
			if(pageSize == null || pageSize == ""){
				pageSize = 20;
			}
			pageNumber = searchMap.pageNumber;
			sortName = searchMap.sortName;
			sortOrder = searchMap.sortOrder;
			$("#name").val(searchMap.name );
		}
	}
	
	$(function(){
		/*  $("#doSearch").click(function(){
			doSearch();
		}); 
		initDate();*/
		var name=$("#name").val();
		$('#dg').datagrid({
		    url:"user/list",
			pagination:true,
			singleSelect:true,
		    pageSize:pageSize,
		    pageNumber:pageNumber,
		    sortOrder:sortOrder,
		    sortName:sortName,
		    queryParams:{  
		        name:name
		    },
		   // width:800,
		   	columns:[[
		   		{field:'name',title:'名称', width:100, align:"center",sortable:true},
		   		{field:'age',title:'年龄', width:50, align:"center",sortable:true},
		   		{field:'address',title:'地址', width:50, align:"center",sortable:true},
		   		{field:'operation',title:'操作', width:340, align:"center", sortable:false,
		   			formatter:function(value,row,index){
		   				var s ="";
		                s+="<a href=\"javascript:void(0)\"><span onclick=\"javaScript:gotoModify('"+row.id+"');\">修改</span></a> ";
               			s += "|";
		                s+="<a href=\"javascript:void(0)\"><span onclick=\"javaScript:gotoDel('"+row.id+"');\">删除</span>&nbsp;&nbsp;</a>";
			            return s;
		   			}
		   		}
		   	]]
		});
		 var p = $('#dg').datagrid('getPager');    
         $(p).pagination({    
              pageList: [10,20,50,100]
          });  
		
		$("#doSearch").click(function(){
			doSearch();
		});
	});
	
	
	function gotoAdd(){
		var url = 'user/gotoAdd';
		window.location.href=url;
	}
	function gotoModify(id){
		var url = 'user/gotoModify?id='+id;
		window.location.href=url;
	}
	function gotoDel(id){
		if(!confirm('确定删除所选记录？')){
			return;
		}
		var url = 'user/delete?id='+id;
		$.ajax({
			type : 'post',
			url : url,
			dataType: "json",
    			success:function(data){
					if(data.success == true){
						doSearch();
					}else{
						alert(data.msg);
					}
				}
			});
	}
		
	function doSearch(){
		var name=$("#name").val();
		/* var schoolId=$("#schoolId").val(); */
		$("#dg").datagrid('load',{  
	        name:name
	    }); //重新载入 
	}
	function resizeDg(){
		$('#dg').datagrid("resize", { width: $(window).width() * 0.4});
	}
</script>
</head>
</head>

<body onload="resizeDg();" onresize="resizeDg();" >
<div class="row">
	<div class="col-md-4">
			<div class="panel panel-default">
		  <div class="panel-heading">
		    <h3 class="panel-title">树形菜单视图</h3>
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
	<div class="col-md-8">
	<div class="panel panel-default">
		  <div class="panel-heading">
		    <h3 class="panel-title">菜单列表</h3>
		  </div>
		  <div class="panel-body">
		     <div class="row">
		            名称： <input name="name" id="name" type="text" /> 
		           <a href="javascript:void(0);" id="doSearch" class="btn" >查询</a> 
		   </div>
		   <div class="row"> 
		   	<a href="javascript:void(0);" onclick="gotoAdd();" class="btn" >新增</a> 
		   </div>
			<div class="row" >
				<!-- c_top start-->
				 <div class="col-md-1">
				   <div id="dg" ></div> 
				 </div>
			 
		  </div>
		</div>
	</div>
</div>

</body>
</html>
