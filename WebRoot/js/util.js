/**
	拼接字符串工具类,用法与java中的StringBuffer类似
	经测试,在大批量数据拼接时,在IE中比直接用s+= 'a'这种形式快大概30多倍
	在其它浏览器中差距不明显
*/
function StringBuffer(){
	this.__string__ = new Array();
}
StringBuffer.prototype.append = function(str){
	this.__string__.push(str);
	return this;
}
StringBuffer.prototype.toString = function(){
	return this.__string__.join("");
}


//模态网页对话框，兼容各种浏览器
function showZZModalDialog(url,args,style){
	var returnVal = window.showModalDialog(url,args,style);
	if(returnVal == undefined){
		returnVal = window.returnValue;
	}
	return returnVal;
}

//重新调整iframe大小，避免重复滚动条
function resizeIframe(iframe) {
	//var iframe = document.getElementById(iframeId);
	//alert("abc");
	try {
		var bHeight = iframe.contentWindow.document.body.scrollHeight;
		var dHeight = iframe.contentWindow.document.documentElement.scrollHeight;
		var height = Math.max(bHeight, dHeight);
		iframe.height = height;
	}
	catch (ex) {
	}
}

/***
 * 
 * @param {} interval
 * @param {} date1
 * @param {} date2
 * @return {}
 */
function dateDiff(interval, date1, date2)
{
    var objInterval = {'D' : 1000 * 60 * 60 * 24, 'H' : 1000 * 60 * 60, 'M' : 1000 * 60, 'S' : 1000, 'T' : 1};
    interval = interval.toUpperCase();
    var dt1 = Date.parse(date1.replace(/-/g, '/'));
    var dt2 = Date.parse(date2.replace(/-/g, '/'));
    try
    {
        return Math.round((dt2 - dt1) / eval('(objInterval.' + interval + ')'));
    }
    catch (e)
    {
        return e.message;
    }     
    
}

//给String类添加去空的方法
String.prototype.replaceAll= function(expType,value){
return this.replace(new RegExp(expType,"gm"),value);    
}

/**
 * 验证两小数或者整数且不超过两位小数，并且不能为空
 * @param {} checkValue   验证的字符串
 * @param {} whetherAlert 是否需要自己动提示
 * @param {} alertValue   提示内容
 * @return {Boolean}
 */
function checkTwoDecimalValue(checkValue,whetherAlert,alertValue){
	if(!new RegExp(/^\d+(\.\d{1,2})?$/).exec(checkValue)){
		if(whetherAlert){
			var tempValue=formatStr(alertValue);
			 if(tempValue!=null&&tempValue!=''){
			 	alert(tempValue);
			 }else{
			 	alert("必须为小数或整数,小数最多保留两位!");
			 }
		}
		return false;
	}
	return true;
}

/**
 * 必须为整数。且不能为空
 * @param {} checkValue
 * @param {} whetherAlert
 * @param {} alertValue
 * @return {Boolean}
 */
function checkNumber(checkValue,whetherAlert,alertValue){
	if(!new RegExp(/^\d+$/).exec(checkValue)){
		if(whetherAlert){
			var tempValue=formatStr(alertValue);
			 if(tempValue!=null&&tempValue!=''){
			 	alert(tempValue);
			 }else{
			 	alert("必须为整数");
			 }
		}
		return false;
	}
	return true;
}
/**
 * 可以为空，如果不为空则必须是整数
 * @param {} checkValue
 * @param {} whetherAlert
 * @param {} alertValue
 * @return {Boolean}
 */
function checkNumberOrNull(checkValue,whetherAlert,alertValue){
	if(!new RegExp(/^\d*$/).exec(checkValue)){
		if(whetherAlert){
			var tempValue=formatStr(alertValue);
			 if(tempValue!=null&&tempValue!=''){
			 	alert(tempValue);
			 }else{
			 	alert("必须为整数");
			 }
		}
		return false;
	}
	return true;
}
/**
 * 可以为空，如果不为空则必须不包含中文
 * @param {} checkValue
 * @param {} whetherAlert
 * @param {} alertValue
 * @return {Boolean}
 */
function checkChinese(checkValue,whetherAlert,alertValue){
	if(/.*[\u4e00-\u9fa5]+.*$/.test(checkValue)){
		if(whetherAlert){
			var tempValue=formatStr(alertValue);
			 if(tempValue!=null&&tempValue!=''){
			 	alert(tempValue);
			 }else{
			 	alert("必须不包含中文");
			 }
		}
		return false;
	}
	return true;
}

/**
 * 获取Radio的值
 * 
 * @param {}
 *            radioName
 * @return {}
 */
function getRadioCheckedValue(radioName) {
	var resultValue = "";
	var tempRadio = document.getElementsByName(radioName)
	for (var i = 0; i < tempRadio.length; i++) {
		if (tempRadio[i].checked)
			resultValue = tempRadio[i].value;
	}
	return resultValue;
}

/**
 * 数字格式化，保留两位小数
 * @param {} value
 * @return {}
 */

function renderFloat(value){
	try{
		return parseFloat((value)||0).toFixed(2);
	}catch(e){
		return 0;
	}
}
/**
 * 格式化输出且该函数去掉了英文的逗号，单引号，双引号
 * 以免发生JS错误
 * @param {} _tmp
 * @return {String}
 */
function formatStr(_tmp){
	try{
		if('undefined'==typeof(_tmp))
			return '';
		if(_tmp=="renderDate")
		return  "";
		if(0==_tmp||'0'==_tmp)
			return _tmp;
		if(!_tmp)
			return '';
		if('null'==_tmp||'NULL'==_tmp)
			return '';
	}catch(e){
		alert(e.name+":"+e.message);
	}
	var rStr=_tmp.toString().replaceAll("'","").replaceAll("\"","");
	return rStr;
}
String.prototype.trim = function() {
	return this.replace(/(^\s*)|(\s*$)/g, "");
}

/**
 * 显示或隐列
 * @param {} SID 列ID
 * @param {} tableID  表格ID
 */
 function selectHidColumn(columnID,tableID){
	var tab=document.getElementById(tableID);
	try{
	for (var i = 0; i < tab.rows.length; i++) {
	    	var oTR = tab.rows[i+1];
			var oTD = oTR.cells;
			for (var j =0; j < oTD.length; j++){
			var tempValue= oTD[j].id;
				if(tempValue!=null&&tempValue!=''){
					oTD[j].style.display="none";
				}
				if(oTD[j].id==columnID){
					oTD[j].style.display="";
				}
			}
	}
  }catch(e){}
}



/**
 * 
 * 获取已选中的dom值（如checkbox，radio,select）
 * @param {} fieldName 
 * @param {} isAll
 * @return {}用","串联已选中的值
 */
function getAllCheckStr(fieldName,isAll) 
{
	var field=document.getElementsByName(fieldName);
	var _b=isAll||false;
	var checkStr=[],j=0;
	for (var i = 0; i < field.length; i++) 
	{
		if(_b||true == field[i].checked||true == field[i].selected)
			checkStr[j++]=field[i].value;
	}
	return checkStr.join(",");
}


/**
 * 获取所有的dom（不分是否选中）的值
 * @param {} field
 * @return {}
 */
function getAllValue(field){	
	var checkStr=[];
	for (var i = 0; i < field.length; i++) 
	{
		checkStr[i]=field[i].value;
	}
	return checkStr.join(",");
}

/**
 * 全选或者全不选
 * @param {} para
 * @return {String}
 */
function checkAll(para,checkbox) 
{
	var field=document.getElementsByName(para);
	var checkflag = true;

	if(checkbox){
		if(true==checkbox||true==checkbox.checked);
		else checkflag=false;
	}	
	for (var i = 0; i < field.length; i++) 
	{
		field[i].checked = checkflag;
	}
	return checkflag; 
}
/**
 * ----------------------------左右互动框CODE START-----------------------------------------
 * @type Boolean
 */
var singleSel=false;
function addSelect(comeID,toID){
	 var listSelect = document.getElementById(comeID);
     var haveSelect = document.getElementById(toID);
     for (var i = 0; i < listSelect.options.length; i++) {
        if (listSelect.options[i].selected) {
            var option = document.createElement("option");
            option.value = listSelect.options[i].value;
            option.text = listSelect.options[i].text;
            addOptionToSelect(haveSelect, option);
        }
    }
}
function addOptionToSelect(select, option) {
    if (select.length == 0) {
       select.options.add(option);
    }
    else{
        var flag = true;
        for (var i = 0; i < select.options.length; i++) {
            if (select.options[i].value == option.value) {
                flag = false;
                break;
            }
        }
        if (flag) {
            try{
            select.options.add(option);}
            catch(e){}
        }
    }
}

function removeSelect(removeID) {
    var haveSelect = document.getElementById(removeID);
    var values = [];
    for (var i = 0; i < haveSelect.length; i++) {
        if (haveSelect.options[i].selected) {
            values.push(haveSelect.options[i].value);
        }
    }
    for (var i = 0; i < values.length; i++) {
        for (var j = 0; j < haveSelect.length; j++) {
            if (haveSelect.options[j].value == values[i]) {
                haveSelect.removeChild(haveSelect.options[j]);
                break;
            }
        }
    }
}

/**
 * ----------------------------左右互动框CODE END-----------------------------------------
 * @type Boolean
 */
var cursorWaitObj;//设置鼠标等待的控件
function setCursorWait(obj){
	try{
		cursorWaitObj = obj;
		obj.style.cursor='wait';
		window.document.body.style.cursor='wait';
	}catch(e){}
}
function setCursorAuto(){
	try{
		cursorWaitObj.style.cursor='auto';
		cursorWaitObj = null;
		window.document.body.style.cursor='auto';
	}catch(e){}
}


 /****
  * startDate开始时间，endDate结束时间，传入2个日期对比
  * startDate<endDate result true,startDate>endDate result false
  * @param {} startDate
  * @param {} endDate
  * @return {Boolean}
  */
function checkBirthDay(startDate,endDate) {
	if (startDate != null && startDate != '') {
		var fullDate = startDate.split("-");
		var year = parseInt(fullDate[0], 10);
		var month = parseInt(fullDate[1], 10);
		var day = parseInt(fullDate[2], 10);
		var endDateFull=endDate.split("-");
		var curYear = parseInt(endDateFull[0], 10);
		var curMonth = parseInt(endDateFull[1], 10);
		var curDay = parseInt(endDateFull[2], 10);
		var lastYear = (curYear - year);
		var lastMonth = (curMonth - month);
		var lastDay = (curDay - day);
		if (lastYear == 0) {
			if (lastMonth == 0) {
				if (lastDay >=0) {
					return true;
				} else {
					return false;
				}
			}
			if (lastMonth > 0) {
				return true;
			} else {
				return false;
			}
		}
		if (lastYear > 0) {
			return true;
		} else {
			return false;
		}
	}
}



