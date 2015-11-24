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
<style type="text/css">
/*bootstrap兼容问题和easyui的bug*/
.panel-header, .panel-body {
border-width: 0px !important;
}
.datagrid,.combo-p{
border:solid 1px #D4D4D4 !important;
}
.datagrid *{
-webkit-box-sizing: content-box !important;
-moz-box-sizing: content-box !important;
box-sizing: content-box !important;
}

</style>
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
		    url:"menu/list",
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
		   		{field:'menu_desc',title:'名称', width:100, align:"center",sortable:true},
		   		{field:'menu_url',title:'url', width:50, align:"center",sortable:true},
		   		{field:'parent_id',title:'父菜单', width:50, align:"center",sortable:true},
		   		{field:'menu_order',title:'排序', width:50, align:"center",sortable:true},
		   		{field:'operation',title:'操作', width:340, align:"center", sortable:false,
		   			formatter:function(value,row,index){
		   				var s ="";
		                s+="<a href=\"javascript:void(0)\"><span onclick=\"javaScript:gotoModify('"+row.id+"','"+row.menu_desc+"','"+row.menu_url+"','"+row.menu_order+"','"+row.parent_id+"');\">修改</span></a> ";
               			s += "|";
		                s+="<a href=\"javascript:void(0)\"><span onclick=\"javaScript:gotoDel('"+row.id+"','"+row.menu_desc+"');\">删除</span>&nbsp;&nbsp;</a>";
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
		$("#zengjia").modal()  ;
	}
	/* 修改菜单方法 */
	function add(){
		var text=$("#formText1").val();
		var url=$("#formUrl1").val();
		var order=$("#formOrder1").val();
		var parentId=$("#formParentId1").val();
		$.ajax({
			type : 'post',
			url : 'menu/treeAdd',
			data:"menuDesc="+text+"&menuUrl="+url+"&menuOrder="+order+"&parentId="+parentId,
			dataType: "json",
    		success:function(data){
    			$("#zengjia").modal("hide")  ;
					if(data.success == true){
						doSearch();
						reloadTree();
					}else{
						alert(data.msg);
					}
				}
			});
		
	}
	function gotoModify(id,text,url,order,parentId){
		/* var url = 'user/gotoModify?id='+id;
		window.location.href=url; */
		$("#formId").val(id);
		$("#formText").val(text);
		$("#formUrl").val(url);
		$("#formOrder").val(order);
		$("#formParentId").val(parentId);
		$("#xiugai").modal()  ;
	}
	
	/* 修改菜单方法 */
	function modify(){
		var id=$("#formId").val();
		var text=$("#formText").val();
		var url=$("#formUrl").val();
		var order=$("#formOrder").val();
		var parentId=$("#formParentId").val();
		$.ajax({
			type : 'post',
			url : 'menu/treeEdite',
			data:"id="+id+"&menuDesc="+text+"&menuUrl="+url+"&menuOrder="+order+"&parentId="+parentId,
			dataType: "json",
    		success:function(data){
    			$("#xiugai").modal("hide")  ;
					if(data.success == true){
						doSearch();
						reloadTree();
					}else{
						alert(data.msg);
					}
				}
			});
		
	}
	function gotoDel(id,text){
		if(!confirm('确定删除所选记录？')){
			return;
		}
		var url = 'menu/treeDelete?id='+id+'&text='+text;
		$.ajax({
			type : 'post',
			url : url,
			dataType: "json",
    			success:function(data){
					if(data.success == true){
						doSearch();
						reloadTree();
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
<div id="myAlert" class="alert alert-warning">
   <a href="#" class="close" data-dismiss="alert">
      &times;
   </a>
   <strong>警告！</strong>您的网络连接有问题。
</div>
<div class="row">
	<div class="col-md-4  ">
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
	<div class="col-md-8 ">
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
</div>

<!-- <div class="row">
<button type="button" class="btn btn-primary" data-toggle="modal" data-target="#xiugai">修改</button>
</div> -->
<!-- 修改 模态框 -->
<div class="modal fade" id="xiugai">
  <div class="modal-dialog">
    <div class="modal-content">
      <div class="modal-header">
        <button type="button" class="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">&times;</span></button>
        <h4 class="modal-title">修改</h4>
      </div>
     <!--  <form action="menu/treeEdite" id="form1" method="post"> --> <!-- 待提交的From 表单 -->
      <div class="modal-body">
						<%-- <form action="${ctx }/user/modify" id="form1" method="post"> --%>
							<input type="hidden" id="formId" name="formId" value="${menuInfo.id }"></input>
							<div class="dengji_table">
								<div class="basic_table">
									<div class="clospan">
										<p class="basic_name">名称</p>
										<p>
											<input name="formText" id="formText" type="text"
												class="easyui-validatebox" data-options="required:true"
												value="${menuInfo.menuDesc}" />
										</p>
									</div>
								</div>
								<div class="basic_table">
									<div class="clospan">
										<p class="basic_name" style="border-right: none;">URL</p>
										<p>
											<input name="formUrl" id="formUrl"  
												class="easyui-validatebox" data-options="required:true"
												value="${menuInfo.menuUrl}" />
										</p>
									</div>
								</div>
								<div class="basic_table">
									<div class="clospan">
										<p class="basic_name" style="border-right: none;">父菜单ID</p>
										<p>
											<input name="formParentId" id="formParentId"  
												class="easyui-validatebox" data-options="required:true"
												value="${menuInfo.parentId}" />
										</p>
									</div>
								</div>
								<div class="basic_table">
									<div class="clospan">
										<p class="basic_name" style="border-right: none;">排序</p>
										<p>
											<input name="formOrder" id="formOrder" type="text"
												class="easyui-validatebox" data-options="required:false"
												value="${menuInfo.menuOrder}" />
										</p>
									</div>
								</div>
							</div>
	</div>
      <div class="modal-footer">
        <button type="button" class="btn btn-default"  data-dismiss="modal">关闭</button>
        <button  class="btn btn-primary" onclick="modify();" id="doSubmit" >保存</button>
      </div>
     <!-- </form> -->
    </div><!-- /.modal-content -->
  </div><!-- /.modal-dialog -->
</div><!-- /.modal -->
<div class="modal fade" id="zengjia">
  <div class="modal-dialog">
    <div class="modal-content">
      <div class="modal-header">
        <button type="button" class="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">&times;</span></button>
        <h4 class="modal-title">修改</h4>
      </div>
     <!--  <form action="menu/treeEdite" id="form1" method="post"> --> <!-- 待提交的From 表单 -->
      <div class="modal-body">
						<%-- <form action="${ctx }/user/modify" id="form1" method="post"> --%>
							<div class="dengji_table">
								<div class="basic_table">
									<div class="clospan">
										<p class="basic_name">名称</p>
										<p>
											<input name="formText1" id="formText1" type="text"
												class="easyui-validatebox" data-options="required:true"
												value="${menuInfo.menuDesc}" />
										</p>
									</div>
								</div>
								<div class="basic_table">
									<div class="clospan">
										<p class="basic_name" style="border-right: none;">URL</p>
										<p>
											<input name="formUrl1" id="formUrl1"  
												class="easyui-validatebox" data-options="required:true"
												value="${menuInfo.menuUrl}" />
										</p>
									</div>
								</div>
								<div class="basic_table">
									<div class="clospan">
										<p class="basic_name" style="border-right: none;">父菜单ID</p>
										<p>
											<input name="formParentId1" id="formParentId1"  
												class="easyui-validatebox" data-options="required:true"
												value="${menuInfo.parentId}" />
										</p>
									</div>
								</div>
								<div class="basic_table">
									<div class="clospan">
										<p class="basic_name" style="border-right: none;">排序</p>
										<p>
											<input name="formOrder1" id="formOrder1" type="text"
												class="easyui-validatebox" data-options="required:false"
												value="${menuInfo.menuOrder}" />
										</p>
									</div>
								</div>
							</div>
	</div>
      <div class="modal-footer">
        <button type="button" class="btn btn-default"  data-dismiss="modal">关闭</button>
        <button  class="btn btn-primary" onclick="add();" id="doSubmit" >保存</button>
      </div>
     <!-- </form> -->
    </div><!-- /.modal-content -->
  </div><!-- /.modal-dialog -->
</div><!-- /.modal -->
</body>
</html>
