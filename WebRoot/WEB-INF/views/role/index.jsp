<%@ page contentType="text/html;charset=UTF-8" %>
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
<%@ include file="/common/meta.jsp"%>
<meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
<title>SpringMVC+Hibernate +MySql+ EasyUI ---CRUD调试bug</title>
 <link href="${ctx }/plugins/bootstrap/3.0.3/css/bootstrap.min.css" rel="stylesheet">
 <script src="${ctx }/plugins/bootstrap/3.0.3/js/bootstrap.min.js"></script>  
<script type="text/javascript">
	var searchString;

	function resizeDg(){
		$('#dg').datagrid("resize", { width: $(window).width() * 0.4});
	}
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
		    url:"${ctx }/role/list",
			pagination:true,
			singleSelect:true,
		    pageSize:pageSize,
		    pageNumber:pageNumber,
		    sortOrder:sortOrder,
		    sortName:sortName,
		    queryParams:{  
		        name:name
		    },
		    width:800,
		   	columns:[[
		   		{field:'name',title:'名称', width:100, align:"center",sortable:true},
		   		{field:'id',title:'ID', width:50, align:"center",sortable:true},
		   		{field:'operation',title:'操作', width:340, align:"center", sortable:false,
		   			formatter:function(value,row,index){
		   				var s ="";
		                s+="<a href=\"javascript:void(0)\"><span onclick=\"javaScript:gotoModify('"+row.id+"');\">修改</span></a> ";
               			s += "|";
		                s+="<a href=\"javascript:void(0)\"><span onclick=\"javaScript:gotoDel('"+row.id+"');\">删除</span>&nbsp;&nbsp;</a>";
               			s += "|";
		               // s+="<a href=\"javascript:void(0)\"><span onclick=\"javaScript:gotoGrantMenu('"+row.id+"');\">授权</span>&nbsp;&nbsp;</a>";
		                s+="<a href=\"${ctx }/role/gotoGrantMenus?roleId="+row.id+"\" class=\"iframe\"> 授权</a>";
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
		var url = '${ctx }/role/gotoAdd';
		window.location.href=url;
	}
	function gotoModify(id){
		var url = '${ctx}/role/gotoModify?id='+id;
		window.location.href=url;
	}
	function gotoDel(id){
		if(!confirm('确定删除所选记录？')){
			return;
		}
		var url = '${ctx}/role/delete?id='+id;
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
	function gotoGrantMenu(id){
		$('#menuTree').tree({
			checkbox : true,
			url : '${ctx }/menu/treeQuery?id=0',
			onBeforeExpand : function(node, param) {
				console.log(node.id);
				// url"EasyTreeQuery.action?id=" + node.id;  默认会传递一个id参数
				$('#menuTree').tree('options').url = "${ctx }/menu/treeFindByPid";// change the url                     
			},
			onLoadSuccess : function() {
				$("#shouquan").modal();

			}
		});
	}	
	function  grantMenus(){
		//得到 选中的选项
		var nodes= $('#menuTree').tree('getChecked');
		for(var i=0;i<nodes.length;i++){
			console.log(nodes[i].id);
		}
	}
</script>
</head>
<body onload="resizeDg();" onresize="resizeDg();" >
<div class="neirong">
<div class="add-content" style="margin-top:0">
	<div class="xinxi2">
       	<div class="search_box">
           <p>名称： <input name="name" id="name" type="text" /></p>
           <a href="javascript:void(0);" id="doSearch" class="blank_btn">查询</a></div>
           <div class="btn_div">
           <a href="javascript:void(0);" onclick="gotoAdd();" id="xtsz_rygl_jsgl_add" class="blank_btn">新增</a> 
           </div>
   </div>
	<div class="contant_list" >
		<!-- c_top start-->
		<table  width="100%">
			<tr>
				<td>
					<table id="dg"></table>
				</td>
			</tr>
		</table>
	</div>
  </div>
</div>
<div class="modal fade" id="shouquan">
  <div class="modal-dialog">
    <div class="modal-content">
      <div class="modal-header">
        <button type="button" class="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">&times;</span></button>
        <h4 class="modal-title">增加</h4>
      </div>
     <!--  <form action="menu/treeEdite" id="form1" method="post"> --> <!-- 待提交的From 表单 -->
      <div class="modal-body">
					<div id="menuTree">
					</div>
	</div>
      <div class="modal-footer">
        <button type="button" class="btn btn-default"  data-dismiss="modal">关闭</button>
        <button  class="btn btn-primary" onclick="grantMenus();" id="doSubmit" >保存</button>
      </div>
     <!-- </form> -->
    </div><!-- /.modal-content -->
  </div><!-- /.modal-dialog -->
</div><!-- /.modal -->
</body>
</html>