function dynamicTable(objName){
	this.obj = objName;
	this.tableId;
	this.inputSize = 10;
	this.tdWidth = 50;
	this.applicationContext = '';
	this.questionList = [];
	this.idIndex = 0;
	this.questionTypes = [];
	this.canInputAnswerTypes = [];
	this.yesNoFlags = [];
	this.level = [];
};
//初始化变量
dynamicTable.prototype.initParams = function(tableId,applicationContext,questionList,questionTypes,canInputAnswerTypes,yesNoFlags,level){
	this.tableId = tableId;
	this.applicationContext = applicationContext;
	this.questionList = questionList;
	this.questionTypes = questionTypes;
	this.canInputAnswerTypes = canInputAnswerTypes;
	this.yesNoFlags = yesNoFlags;
	this.level = level;
};


//得到id为rowId的所有行,返回数组
dynamicTable.prototype.getRowsById = function(rowId){
	return document.getElementsByName(rowId);
};
//设置行序号
dynamicTable.prototype.resetRowIndex = function(){
	var index = 1;
	var rowIndex = document.getElementsByName('rowIndex');
	for(var i=0;i<rowIndex.length;i++){
		rowIndex[i].innerHTML = ''+(index++);
	}
	if(document.getElementById('totle'))
	document.getElementById('totle').innerHTML = ''+(index-1);
};
dynamicTable.prototype.addRow = function(rowObj,isSetValue,questionList){
	//创建一个TD
	var newCell0 = document.createElement('TD');
	newCell0.align="center";
	newCell0.width="10%";
	newCell0.innerHTML = '<image src="'+this.applicationContext+'/images/question/add-attach.gif" onclick="'+this.obj+'.addRowByClick(this)" title="增加" style="cursor:pointer;">&nbsp;<image src="'+this.applicationContext+'/images/question/del-attach.gif" onclick="'+this.obj+'.removeRow(this)" title="减少" style="cursor:pointer;">';
	newCell0.innerHTML  += '  <image src="'+this.applicationContext+'/images/question/move-up.gif" onclick="'+this.obj+'.moveUp(this)" title="上移" style="cursor:pointer;">&nbsp;<image src="'+this.applicationContext+'/images/question/move-down.gif" onclick="'+this.obj+'.moveDown(this)" title="下移" style="cursor:pointer;">';
	//加入到TR中
	rowObj.appendChild(newCell0);
	var newCell1 = document.createElement('TD');
	newCell1.align="center";
	
	var tempContent = this.getContent(rowObj,isSetValue,questionList);
	newCell1.innerHTML = tempContent;
	rowObj.appendChild(newCell1);
};
//上移
dynamicTable.prototype.moveUp= function(obj){//上移1个tr 
	var tableObj = document.getElementById(this.tableId);
	var clickRow = obj.parentNode.parentNode;
        if (clickRow.rowIndex>0){ 
            this.swapTr(clickRow,tableObj.rows[clickRow.rowIndex-1]);
            this.resetRowIndex();
        } 
};
dynamicTable.prototype.swapTr=function(tr1,tr2){
       var target=(tr1.rowIndex<tr2.rowIndex)?tr2.nextSibling:tr2; 
       var tBody=tr1.parentNode 
       tBody.replaceChild(tr2,tr1); //用tr1替换tr2
       tBody.insertBefore(tr1,target);//将target插入到tr1原来的位置
}

//下移
dynamicTable.prototype.moveDown= function(obj){
	var tableObj = document.getElementById(this.tableId);
	var clickRow = obj.parentNode.parentNode;
	if (clickRow.rowIndex<tableObj.rows.length-1)  { 
           this.swapTr(clickRow,tableObj.rows[clickRow.rowIndex+1]); 
           this.resetRowIndex();
     } 
}

dynamicTable.prototype.getNoHtmlContent = function(value){
	var regEx = /\<br>/g;
	return value.replace(regEx,'\r\n');
};
dynamicTable.prototype.getContent = function(rowObj,isSetValue,questionList){
	var tempHTML='';
	tempHTML+='<input type="hidden" id="newFlag_'+rowObj.id+'" name="newFlag" value="';
	if(isSetValue){
		tempHTML+=questionList[4];
	}
	tempHTML+='">';
	tempHTML+='<input type="hidden"  name="questionId" value="';
	if(isSetValue){
		tempHTML+=questionList[2];
	}
	tempHTML+='">';
	tempHTML+='<table width="100%" class="name" cellpadding="0" cellspacing="0">';
	tempHTML+='<tr>';
	tempHTML+='<td colspan="2" align="left">第【<span name="rowIndex" id="rowIndex"></span>】道题目</td>';
	tempHTML+='</tr>';
	tempHTML+='<tr>'; 
	tempHTML+=' <td align="right" width="10%">题　　目：</td>';
	tempHTML+=' <td align="left"><input type="hidden" name="answerTypeIndex" value="'+rowObj.id+'">';
	tempHTML+=' 	<textarea name="inquireDesc" notnull="true"  maxlength="1000" rows="4" onchange="'+this.obj+'.onchangeNewFlagValue(\''+rowObj.id+'\')" caption="题目" style="width:90%">';
	if(isSetValue){
		tempHTML+=this.getNoHtmlContent(questionList[0]);
	}
	tempHTML+='</textarea><span class="fontRed">*</span></td>'; 
	tempHTML+='</tr>';
	
	tempHTML+='<tr>'; 
	tempHTML+=' <td align="right">题　　型：</td>';
	tempHTML+=' <td align="left">';
	for(var i=0 ; i<this.questionTypes.length ; i++){  
		tempHTML+='<input type="radio" notnull="true" caption="题型" name="answerType_'+rowObj.id+'" value="'+this.questionTypes[i][1]+'" onchange="'+this.obj+'.onchangeNewFlagValue(\''+rowObj.id+'\')" onclick="'+this.obj+'.onAnswerTypeClick(\''+rowObj.id+'\')"';
		if(isSetValue && this.questionTypes[i][1]==questionList[1]){
			tempHTML+=' checked';
		}
		tempHTML+='>'+this.questionTypes[i][0]+'&nbsp;';
	}
	tempHTML+='<span class="fontRed">*</span></td>'; 
	tempHTML+='</tr>';
	
	if(this.level!=null&&this.level.length>0){
		tempHTML+='<tr>'; 
		tempHTML+=' <td align="right">难    度：</td>';
		tempHTML+=' <td align="left">';
		for(var i=0 ; i<this.level.length ; i++){  
			tempHTML+='<input type="radio" notnull="true" caption="难度" name="level_'+rowObj.id+'" value="'+this.level[i][1]+'"';
			if(isSetValue && this.level[i][1]==questionList[5]){
				tempHTML+=' checked';
			}
			tempHTML+='>'+this.level[i][0]+'&nbsp;';
		}
		tempHTML+='<span class="fontRed">*</span></td>'; 
		tempHTML+='</tr>';
	}
	
	if(isSetValue && QUESTION_TYPE_TEXT==questionList[1]){
		tempHTML+='<tr id="div_'+rowObj.id+'">';
	}else{
		tempHTML+='<tr id="div_'+rowObj.id+'" style="display:none">';
	}
	tempHTML+='<td align="right">上传附件否：</td>';
	tempHTML+='<td><select name="attachmentFlag_'+rowObj.id+'" style="width: 150px;" caption="上传附件否" onchange="'+this.obj+'.onchangeNewFlagValue(\''+rowObj.id+'\')">';
	for(var i=0;i<this.yesNoFlags.length;i++){
		tempHTML += '<option value="'+this.yesNoFlags[i][1]+'"';
	    if(isSetValue && this.yesNoFlags[i][1]==questionList[5]){
			tempHTML+=' selected';
		}
		tempHTML+='>'+this.yesNoFlags[i][0]+'</option>&nbsp;'
	}
	tempHTML+='<span class="fontRed">*</span></td>';
	
	tempHTML+='</tr>';
	tempHTML+='<tr>';
	tempHTML+=' <td align="right">供选答案：</td>';
 	tempHTML+='<td align="left">';
	tempHTML+='<table id="table_input_'+rowObj.id+'" width="100%" class="name" cellpadding="0" cellspacing="0">';
	tempHTML+='<thead></thead>';
	tempHTML+='<tfoot></tfoot>';
	tempHTML+='</table>';
    tempHTML+='	</td></tr>';
	tempHTML+='</table>';
	
	return tempHTML;
}
//点击增加按钮增加一行
dynamicTable.prototype.addRowByClick = function(obj){
	var clickRow = obj.parentNode.parentNode;
	this.addOneRow(clickRow,false);
	
};
dynamicTable.prototype.addOneRow = function(clickRow,isSetValue){
	var tableObj = document.getElementById(this.tableId);
	var rowObj = document.createElement('TR');
	rowObj.id = 'row_'+(this.idIndex++);
	rowObj.className = clickRow.className;
	this.addRow(rowObj,isSetValue,null);
	//所有TR都增加到childNodes[1]上面了
	if(clickRow.nextSibling){
		tableObj.childNodes[1].insertBefore(rowObj,clickRow.nextSibling);
	}else{
		tableObj.childNodes[1].appendChild(rowObj);
	}
	this.resetRowIndex();
};
//点击删除按钮删除一行
dynamicTable.prototype.removeRow = function(obj){
	var clickRow = obj.parentNode.parentNode;
	var tableObj = document.getElementById(this.tableId);
	if(tableObj.childNodes[1].childNodes.length==1){
		this.clearInputValue(clickRow,clickRow.id);
		return;
	}
	tableObj.childNodes[1].removeChild(clickRow);
	this.resetRowIndex();
	
};
//清空输入框的值
dynamicTable.prototype.clearInputValue = function(obj,idFlag){
	
};
//初始化table
dynamicTable.prototype.initTable = function(){
	//首先得到要操作的表格
	var tableObj = document.getElementById(this.tableId);
	if(this.questionList.length>0){ 
		for(var i = 0; i<this.questionList.length; i++){ 
			var rowObj = document.createElement('TR');
			//设置行的ID
			rowObj.id = 'row_'+(this.idIndex++); 
			//调用给行增加列的方法
			this.addRow(rowObj,true,this.questionList[i]);
			//动态给表格增加行
			tableObj.childNodes[1].appendChild(rowObj);
			this.resetRowIndex();
			for(var j=0;j<this.questionList[i][3].length;j++){
				this.inputAdd(rowObj.id,true,this.questionList[i][3][j],this.questionList[i][4]);
			}
		}
	}else{
		var rowObj = document.createElement('TR');
		//设置行的ID
		rowObj.id = 'row_'+(this.idIndex++);
		//调用给行增加列的方法
		this.addRow(rowObj,false);
		//动态给表格增加行
		tableObj.childNodes[1].appendChild(rowObj);
		this.resetRowIndex();
	}
};

dynamicTable.prototype.onAnswerTypeClick = function(rowId){
	var table_input_Obj = document.getElementById('table_input_'+rowId);
	var tableChildObj = new Array();
	for(var i=0;i<table_input_Obj.childNodes[1].childNodes.length;i++){
		tableChildObj[tableChildObj.length] = table_input_Obj.childNodes[1].childNodes[i];
	}
	for(var i=0;i<tableChildObj.length;i++){
		table_input_Obj.childNodes[1].removeChild(tableChildObj[i]);
	}
	var radioObj = document.getElementsByName('answerType_'+rowId);//得到对应的radio
	var checkValue = '';
	for(var i=0;i<radioObj.length;i++){
		if(radioObj[i].checked){
			checkValue = radioObj[i].value;
			break;
		}
	}
	var canInputAnswer = false;
	for(var i=0;i<this.canInputAnswerTypes.length;i++){
		if(canInputAnswerTypes[i] == checkValue){
			canInputAnswer = true;
			break;
		}
	}
	if(canInputAnswer){//是否出现选项和答案项
		var rowObj = document.createElement('TR');
		rowObj.id = 'answerType_'+(this.idIndex++);
		var newCell0 = document.createElement('TD');
		newCell0.align="center";
		newCell0.width="10%";
		var rnum = table_input_Obj.rows.length; 
		newCell0.innerHTML = '<image src="'+this.applicationContext+'/images/question/add-attach.gif" onclick="'+this.obj+'.inputAdd(\''+rowId+'\',false)" title="增加" style="cursor:pointer;">&nbsp;<image src="'+this.applicationContext+'/images/question/del-attach.gif" onclick="'+this.obj+'.inputDel(\''+rowId+'\',this)" title="减少" style="cursor:pointer;">';
		//加入到TR中
		rowObj.appendChild(newCell0);
		var newCell1 = document.createElement('TD');
		newCell1.width="70%";
		var newCell2 = document.createElement('TD');
		newCell2.width="20%";
		newCell2.align="left";
		newCell1.innerHTML = '<input type="text" notnull="true" maxlength="200" caption="供选答案" name="answerDesc_'+rowId+'" style="width:90%;"><span class="fontRed">*</span>';
		newCell2.innerHTML = '设为答案<input type="checkbox" notnull="true" caption="答案" name="answer_'+rowId+'" >';
		rowObj.appendChild(newCell1);
		rowObj.appendChild(newCell2);
		table_input_Obj.childNodes[1].appendChild(rowObj);
		document.getElementById("div_"+rowId).style.display = "none";
		
	}else{
		var rowObj = document.createElement('TR');
		rowObj.id = 'answerType_'+(this.idIndex++);
		var rnum = table_input_Obj.rows.length; 
		//加入到TR中
		var newCell1 = document.createElement('TD');
		newCell1.innerHTML = '<input type="text" notnull="true" maxlength="200" caption="供选答案" name="answerDesc_'+rowId+'" style="width:90%;"><span class="fontRed">*</span>';
		rowObj.appendChild(newCell1);
		table_input_Obj.childNodes[1].appendChild(rowObj);
		document.getElementById("div_"+rowId).style.display = "none";
		
	}
};
dynamicTable.prototype.onchangeNewFlagValue= function(rowId){
	var newFlagObject = document.getElementById('newFlag_'+rowId);
	newFlagObject.value = 'Y';
}
dynamicTable.prototype.inputAdd = function(rowId,isSetValue,answerDesc,result){  
	var table_input_Obj = document.getElementById('table_input_'+rowId);
	if(result!=null&&result.length==0){
		var rowObj = document.createElement('TR');
		rowObj.id = 'answerType_'+(this.idIndex++);
		var rnum = table_input_Obj.rows.length; 
		//加入到TR中
		var newCell1 = document.createElement('TD');
		
		var tempHTML = '<input type="text" notnull="true" maxlength="200" onchange="'+this.obj+'.onchangeNewFlagValue(\''+rowId+'\')" caption="供选答案" name="answerDesc_'+rowId+'" style="width:90%"';
		if(isSetValue){
			 tempHTML += ' value="'+answerDesc+'"';
		}
		tempHTML += '><span class="fontRed">*</span>';
		newCell1.innerHTML = tempHTML;
		rowObj.appendChild(newCell1);
		table_input_Obj.childNodes[1].appendChild(rowObj);
		document.getElementById("div_"+rowId).style.display = "none";
	}else{
		var rowObj = document.createElement('TR');
		rowObj.id = 'answerDesc_'+(this.idIndex++);
		var newCell0 = document.createElement('TD');
		newCell0.align="center";
		newCell0.width="10%";
		var rnum = table_input_Obj.rows.length;
		newCell0.innerHTML = '<image src="'+this.applicationContext+'/images/question/add-attach.gif" onclick="'+this.obj+'.inputAdd(\''+rowId+'\',false)" title="增加" style="cursor:pointer;">&nbsp;<image src="'+this.applicationContext+'/images/question/del-attach.gif" onclick="'+this.obj+'.inputDel(\''+rowId+'\',this)" title="减少" style="cursor:pointer;">';
		//加入到TR中
		rowObj.appendChild(newCell0);
		var newCell1 = document.createElement('TD');
		newCell1.width="70%";
		var newCell2 = document.createElement('TD');
		newCell2.width="20%";
		newCell2.align="left";
		var rnum = table_input_Obj.rows.length; 
		var tempHTML = '<input type="text" notnull="true" maxlength="200" onchange="'+this.obj+'.onchangeNewFlagValue(\''+rowId+'\')" caption="供选答案" name="answerDesc_'+rowId+'" style="width:90%"';
		if(isSetValue){
			 tempHTML += ' value="'+answerDesc+'"';
		}
		tempHTML += '><span class="fontRed">*</span>';
		newCell1.innerHTML = tempHTML;
		var checked=false;
		
		for(var k=0;result!=null&&k<result.length;k++){
			if(answerDesc==result[k]){
				checked=true;
			}
		}
		if(!checked){
			newCell2.innerHTML = '设为答案<input type="checkbox" notnull="true"  caption="答案" name="answer_'+rowId+'" >';
		}else{
			newCell2.innerHTML = '设为答案<input type="checkbox" notnull="true" checked="checked"  caption="答案" name="answer_'+rowId+'" >';
		}
		rowObj.appendChild(newCell1);
		rowObj.appendChild(newCell2);
		table_input_Obj.childNodes[1].appendChild(rowObj);
		
	}
};
dynamicTable.prototype.inputDel = function(rowId,nodeObj){ 
	var newFlagObject = document.getElementById('newFlag_'+rowId); 
	newFlagObject.value='Y';
	var clickRow = nodeObj.parentNode.parentNode;
	var table_input_Obj = document.getElementById('table_input_'+rowId); 
	var i = table_input_Obj.childNodes[1].childNodes.length;
	if(i>1){
		table_input_Obj.childNodes[1].removeChild(clickRow);
	}
	
};
dynamicTable.prototype.addRowByImport = function(questionLists){
	var tableObj = document.getElementById(this.tableId);
	if(questionLists.length>0){ 
		for(var i = 0; i<questionLists.length; i++){ 
			var rowObj = document.createElement('TR');
			//设置行的ID
			rowObj.id = 'row_'+(this.idIndex++); 
			//调用给行增加列的方法
			this.addRow(rowObj,true,questionLists[i]);
			//动态给表格增加行
			tableObj.childNodes[1].appendChild(rowObj);
			this.resetRowIndex();
			for(var j=0;j<questionLists[i][3].length;j++){
				this.inputAdd(rowObj.id,true,questionLists[i][3][j],questionLists[i][4]);
				
			}
		}
		
	}
};
