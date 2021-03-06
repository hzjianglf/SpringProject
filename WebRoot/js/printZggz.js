//打印开始
// strPrintName 打印任务名
// printDatagrid 要打印的datagrid
function CreateFormPage(ctx,strPrintName, printDatagrid) {
    var tableString = '<div align="center"><table cellspacing="0" class="pb">';
    var frozenColumns = printDatagrid.datagrid("options").frozenColumns;  // 得到frozenColumns对象
    var columns = printDatagrid.datagrid("options").columns;    // 得到columns对象
    var nameList = '';
    // 载入title
    if (typeof columns != 'undefined' && columns != '') {
        $(columns).each(function (index) {
            tableString += '\n<tr>';
            if (typeof frozenColumns != 'undefined' && typeof frozenColumns[index] != 'undefined') {
                for (var i = 1; i < frozenColumns[index].length; ++i) {
                    if (!frozenColumns[index][i].hidden) {
                        tableString += '\n<th width="' + frozenColumns[index][i].width + '"';
                        if (typeof frozenColumns[index][i].rowspan != 'undefined' && frozenColumns[index][i].rowspan > 1) {
                            tableString += ' rowspan="' + frozenColumns[index][i].rowspan + '"';
                        }
                        if (typeof frozenColumns[index][i].colspan != 'undefined' && frozenColumns[index][i].colspan > 1) {
                            tableString += ' colspan="' + frozenColumns[index][i].colspan + '"';
                        }
                        if (typeof frozenColumns[index][i].field != 'undefined' && frozenColumns[index][i].field != '') {
                            nameList += ',{"f":"' + frozenColumns[index][i].field + '", "a":"' + frozenColumns[index][i].align + '"}';
                        }
                        tableString += '>' + frozenColumns[0][i].title + '</th>';
                    }
                }
            }
            for (var i = 1; i < columns[index].length; ++i) {
                if (!columns[index][i].hidden&&columns[index][i].field!='operation') {
                    tableString += '\n<th width="' + columns[index][i].width + '"';
                    if (typeof columns[index][i].rowspan != 'undefined' && columns[index][i].rowspan > 1) {
                        tableString += ' rowspan="' + columns[index][i].rowspan + '"';
                    }
                    if (typeof columns[index][i].colspan != 'undefined' && columns[index][i].colspan > 1) {
                        tableString += ' colspan="' + columns[index][i].colspan + '"';
                    }
                    if (typeof columns[index][i].field != 'undefined' && columns[index][i].field != '') {
                        nameList += ',{"f":"' + columns[index][i].field + '", "a":"' + columns[index][i].align + '"}';
                    }
	                tableString += '>' + columns[index][i].title + '</th>';
                }
            }
            tableString += '\n</tr>';
        });
    }
    // 载入内容
    var rows = printDatagrid.datagrid("getRows"); // 这段代码是获取当前页的所有行
    var nl = eval('([' + nameList.substring(1) + '])');
    for (var i = 0; i < rows.length; ++i) {
        tableString += '\n<tr>';
        $(nl).each(function (j) {
            var e = nl[j].f.lastIndexOf('_0');
            tableString += '\n<td';
            if (nl[j].a != 'undefined' && nl[j].a != '') {
                tableString += ' style="text-align:' + nl[j].a + ';"';
            }
            tableString += '>';
            if (e + 2 == nl[j].f.length) {
                tableString += rows[i][nl[j].f.substring(0, e)];
            }
            else{
            	if(nl[j].f=="status"){//判断启用停用，先放这  以后没准放后台处理
            		if(rows[i][nl[j].f]==1){
                		tableString += "已发放";
                	}
            		else if(rows[i][nl[j].f]==2){
                		tableString += '已撤销';
                	}
            		else if(rows[i][nl[j].f]==3){
                		tableString += '未发放';
                	}
            	}
            	else if(nl[j].f=="fffs"){
            		if(rows[i][nl[j].f]==1){
                		tableString += "转账";
                	}
            		else if(rows[i][nl[j].f]==2){
                		tableString += '现金';
                	}
            	}
            	else{
            		if(rows[i][nl[j].f]!=undefined){
                		tableString += rows[i][nl[j].f];
                	}else{
                		tableString += '&nbsp';
                	}
            	}
            }
            tableString += '</td>';
        });
        tableString += '\n</tr>';
    }
    tableString += '\n</table></div>';
    strPrintName=encodeURI(strPrintName);
    window.showModalDialog(ctx+"/print/print?clientType=web&strPrintName="+strPrintName, tableString,
    "location:No;status:No;help:No;dialogWidth:800px;dialogHeight:600px;scroll:auto;");
}
//打印结束