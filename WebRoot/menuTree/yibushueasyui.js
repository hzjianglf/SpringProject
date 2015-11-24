$(function() {
	$.messager.progress({
		title : '请稍后',
		msg : '页面加载中...'
	});
	$('#tt').tree({
		checkbox : false,
		url : 'menu/treeQuery?id=0',
		onBeforeExpand : function(node, param) {
			console.log(node.id);
			// url"EasyTreeQuery.action?id=" + node.id;  默认会传递一个id参数
			$('#tt').tree('options').url = "menu/treeFindByPid";// change the url                     
		},
		onLoadSuccess : function(node, data) {
			$.messager.progress('close');

		},
		onClick:function(node){
			console.log(node);
			alert('点击'+node.id);
		},
		onContextMenu : function(e, node) {
			e.preventDefault();
			// 查找节点
			//$('#tt').tree('select', node.target);
			// 显示快捷菜单
			$('#mm').menu('show', {
				left : e.pageX,
				top : e.pageY
			});
		}

	});

});
//添加兄弟节点
function append() {
	var node = $('#tt').tree('getSelected');
	var pid = node.attributes;
	if (node) {
		$.messager.prompt('添加节点', '添加节点名字：', function(text) {
			if (text) {
				insert(text);
			}
		});
		function insert(text) {
			$.ajax({
				type : "POST",
				url : "menu/treeAddBrother.action?text=" +  encodeURI(encodeURI(text)) + "&pid=" + pid,
				cache : false,
				async : false,
				dataType : "json",
				success : function(data) {
					if (data.success) {
						$('#tt').tree('insert', {
							after : node.target,
							data : {
								id : data.id,
								text : text
							}
						});
					}
					;
				}
			});

		}
	}

};
//修改节点
function edite() {
	var x = $('#edite').offset().left;//修改菜单所在位置坐标
	var y = $('#edite').offset().top;
	var node = $('#tt').tree('getSelected');
	// alert('修改'+"菜单ss位置"+e);
	var nodeText = node.text;
	if (node) {
		$('#mydialog').show();
		$('#mydialog').dialog({
			title : '修改菜单',
			collapsible : true,
			minimizable : true,
			maximizable : true,
			padding: 5,
			width: 400,
			left : x + 51,
			top : y - 79,
			model : true,
			buttons : [ {
				text : '提交',
				iconCls : 'icon-ok',
				handler : function() {
					//alert('提交数据');
					update($("#text").val());//修改后的值
				}
			}, {
				text : '取消',
				handler : function() {
					$('#mydialog').dialog('close');
				}
			} ]
		});
		$("#text").val(nodeText);//设置值
		/*$.extend($.fn.validatebox.defaults.rules, {    
		    minLength: {    
		        validator: function(value, param){    
		            return value.length >= param[0];    
		        },    
		        message: '请最少输入2个字符.'   
		    }    
		});  
		$('#text').validatebox({    
		    required: true,    
		    validType: 'minLength[2]'   
		});  */
		function update(text) {
			$.ajax({
				type : "POST",
				url : "menu/treeEdite.action?text=" + encodeURI(encodeURI(text)) + "&id=" + node.id,
				cache : false,
				async : false,
				dataType : "json",
				success : function(data1) {
					//alert('修改菜单success' + node.id + text);

					if (data1.success) {
						$('#tt').tree('update', {
							target : node.target,
							text : text
						});
						//$('#tt').tree('reload', node.target);刷新node
						$('#mydialog').dialog('close');
					}

					else {
						alert(data1.msg);
						$('#mydialog').dialog('close');
					}
					;
				}
			});

		}
	}

};
//删除节点
function shanchu() {
	//alert('删除');
	var node = $('#tt').tree('getSelected');
	if (node) {
		$.messager.confirm('确认', '您确认想要删除记录吗？', function(r) {
			if (r) {
				del();
			}
		});
		function del() {
			$.ajax({
				type : "POST",
				url : "menu/treeDelete.action?id=" + node.id,
				cache : false,
				async : false,
				dataType : "json",
				success : function(data) {
					if (data.success) {
						$('#tt').tree('remove', node.target);

					}
					;
					if (!data.success) {
						alert(data.msg);
					}
					;
				}
			});

		}
	}

}
//搜索
function search(value, name) {
	//alert('搜索' + value);
	if (value.trim() != "") {
		$.ajax({
			type : "POST",
			url : "menu/treeFindByText?text=" + encodeURI(encodeURI(value)),//中文乱码问题  encodeURI需要使用两次！
			 contentType:"application/x-www-form-urlencoded; charset=UTF-8", 
			cache : false,
			async : false,
			dataType : "json",
			success : function(data) {
				if (data.length == 0) {//搜索结果是否为空
					alert('搜索结果为空');
				} else {
					$('#tt').children().remove();
					$('#tt').tree('append', {
						data : data
					});
				}
			}
		});
	} else {
		alert('请输入搜索值');
	}
}
//reload
function reloadTree() {
	//alert('搜索' + value);
		$.ajax({
			type : "POST",
			url : 'menu/treeQuery?id=0', 
			contentType:"application/x-www-form-urlencoded; charset=UTF-8", 
			cache : false,
			async : false,
			dataType : "json",
			success : function(data) {
				if (data.length == 0) {//搜索结果是否为空
					alert('搜索结果为空');
				} else {
					$('#tt').children().remove();
					$('#tt').tree('append', {
						data : data
					});
				}
			}
		});
}