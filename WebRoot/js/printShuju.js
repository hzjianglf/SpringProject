//打印开始
// strPrintName 打印任务名
// printDatagrid 要打印的datagrid
function CreateFormPage(ctx,strPrintName) {
	var xf=$("#xf").val();
	var zsf=$("#zsf").val();
	var hsf=$("#hsf").val();
	var bx=$("#bx").val();
	var yj=$("#yj").val();
	var zj=$("#zj").val();
	var sj=$("#sj").val();
	if(xf==null || xf==""){
		xf=0;
	}
	if(zsf==null || zsf==""){
		zsf=0;
	}
	if(hsf==null || hsf==""){
		hsf=0;
	}
	if(bx==null || bx==""){
		bx=0;
	}
	if(yj==null || yj==""){
		yj=0;
	}
	if(zj==null || zj==""){
		zj=0;
	}
	if(sj==null || sj==""){
		sj=0;
	}
	xf=parseFloat(xf).toLocaleString();
	zsf=parseFloat(zsf).toLocaleString();
	hsf=parseFloat(hsf).toLocaleString();
	bx=parseFloat(bx).toLocaleString();
	yj=parseFloat(yj).toLocaleString();
	zj=parseFloat(zj).toLocaleString();
	sj=parseFloat(sj).toLocaleString();
	var tableString = '<div class="shoujubox" style="height:240px;"><div class="shouju_title"><div class="shouju_title"><strong>缴费明细</strong>';
    tableString+='<span>学员：</span><b>'+$("#xy").html()+'</b>';
    tableString+='<div class="shoujubox" style="background: #f1d7e1;"><p class="shujuname"><span>发票号：</span><input value="'+$("#fph").val()+'" /><strong>※收　据※</strong></p>';
    tableString+='<table cellpadding="0" cellspacing="0" class="shuju_table"><tr><td class="td1">学习时间</td>';
    tableString+='<td colspan="8" class="td4" style="border-right:none"><span>'+$("#beginTime").html()+'</span>';
    tableString+='<b class="zi">至</b><span>'+$("#endTime").html()+'</span></td></tr>';
    tableString+='<tr><td rowspan="3" class="td1">缴费实况</td><td class="td2">　</td>';
    tableString+='<td class="td1">学费</td><td class="td1">住宿费</td><td class="td1">伙食费</td><td class="td1">保险费</td><td class="td1">押金</td><td class="td1">合计</td><td class="td1" style="border-right:none;">实缴</td>';
    tableString+='</tr><tr><td class="td2">应缴</td>';
    tableString+='<td class="td1"><input type="text" class="text_" value="'+xf+'" readonly="readonly" /></td>';
    tableString+='<td class="td1"><input type="text" class="text_" value="'+zsf+'" readonly="readonly" /></td>';
    tableString+='<td class="td1"><input type="text" class="text_" value="'+hsf+'" readonly="readonly" /></td>';
    tableString+='<td class="td1"><input type="text" class="text_" value="'+bx+'" readonly="readonly" /></td>';
    tableString+='<td class="td1"><input type="text" class="text_" value="'+yj+'" readonly="readonly" /></td>';
    tableString+='<td class="td1"><input type="text" class="text_" value="'+zj+'" readonly="readonly" /></td>';
    tableString+='<td class="td1" style="border-right:none;"><input type="text" class="text_" value="'+sj+'" readonly="readonly" /></td>';
    tableString+='</tr><tr><td colspan="9" class="td3"><p style=" width:150px"><span>机构：</span><input value="'+$("#jigou").val()+'" /></p>';
    tableString+='<p><span>收款人：</span><input value="'+$("#skr").val()+'" /></p>';
    tableString+='<p><span>续费人：</span><input value="'+$("#jfr").val()+'" /></p></td></tr></table></div>';
    tableString+='</div>';
    window.showModalDialog(ctx+"/print/print?clientType=web&strPrintName="+strPrintName, tableString,
    "location:No;status:No;help:No;dialogWidth:800px;dialogHeight:600px;scroll:auto;");
}
function PrintTfd(ctx2,strPrintName2) {
	var qf2=$("#qf2").val();
	var sj2=$("#sj2").val();
	if(qf2==null || qf2==""){
		qf2=0;
	}
	if(sj2==null || sj2==""){
		sj2=0;
	}
	qf2=parseFloat(qf2).toLocaleString();
	sj2=parseFloat(sj2).toLocaleString();
	var tableString = '<div class="shoujubox" style="height:240px;"><div class="shouju_title"><div class="shouju_title"><strong>退费明细</strong>';
    tableString+='<span>学员：</span><b>'+$("#xy2").html()+'</b>';
    tableString+='<div class="shoujubox" style="background: #f1d7e1;"><p class="shujuname"><span>发票号：</span><input value="'+$("#fph2").val()+'" /><strong>※退　费※</strong></p>';
    tableString+='<table cellpadding="0" cellspacing="0" class="shuju_table"><tr><td class="td1">学习时间</td>';
    tableString+='<td colspan="8" class="td4" style="border-right:none"><span>'+$("#beginTime2").html()+'</span>';
    tableString+='<b class="zi">至</b><span>'+$("#endTime2").html()+'</span></td></tr>';
    tableString+='<tr><td rowspan="3" class="td1">缴费实况</td><td class="td1">当前欠费</td><td class="td1" style="border-right:none;">本次退费</td></tr>';
    tableString+='<tr><td class="td1"><input type="text" class="text_" readonly="readonly" onfocus="this.blur()" value="'+qf2+'"  /></td>';
    tableString+='<td class="td1" style="border-right:none;"><input type="text" value="'+sj2+'" class="text_"/></td></tr>';
    tableString+='<tr><td colspan="9" class="td3"><p style=" width:150px"><span>机构：</span><input value="'+$("#jigou2").val()+'" /></p>';
    tableString+='<p><span>收款人：</span><input value="'+$("#skr2").val()+'" /></p>';
    tableString+='<p><span>续费人：</span><input value="'+$("#jfr2").val()+'" /></p></td></tr></table></div>';
    tableString+='</div>';
    window.showModalDialog(ctx2+"/print/print?clientType=web&strPrintName="+strPrintName2, tableString,
    "location:No;status:No;help:No;dialogWidth:800px;dialogHeight:600px;scroll:auto;");
}
function PrintBjd(ctx1,strPrintName1) {
	var qf1=$("#qf1").val();
	var sj1=$("#sj1").val();
	if(qf1==null || qf1==""){
		qf1=0;
	}
	if(sj1==null || sj1==""){
		sj1=0;
	}
	qf1=parseFloat(qf1).toLocaleString();
	sj1=parseFloat(sj1).toLocaleString();
	var tableString = '<div class="shoujubox" style="height:240px;"><div class="shouju_title"><div class="shouju_title"><strong>补交明细</strong>';
	tableString+='<span>学员：</span><b>'+$("#xy1").html()+'</b>';
	tableString+='<div class="shoujubox" style="background: #f1d7e1;"><p class="shujuname"><span>发票号：</span><input value="'+$("#fph1").val()+'" /><strong>※收　据※</strong></p>';
	tableString+='<table cellpadding="0" cellspacing="0" class="shuju_table"><tr><td class="td1">学习时间</td>';
	tableString+='<td colspan="8" class="td4" style="border-right:none"><span>'+$("#beginTime1").html()+'</span>';
	tableString+='<b class="zi">至</b><span>'+$("#endTime1").html()+'</span></td></tr>';
	tableString+='<tr><td rowspan="3" class="td1">缴费实况</td><td class="td1">当前欠费</td><td class="td1" style="border-right:none;">本次交费</td></tr>';
	tableString+='<tr><td class="td1"><input type="text" class="text_" readonly="readonly" onfocus="this.blur()" value="'+qf1+'"  /></td>';
	tableString+='<td class="td1" style="border-right:none;"><input type="text" value="'+sj1+'" class="text_"/></td></tr>';
	tableString+='<tr><td colspan="9" class="td3"><p style=" width:150px"><span>机构：</span><input value="'+$("#jigou1").val()+'" /></p>';
	tableString+='<p><span>收款人：</span><input value="'+$("#skr1").val()+'" /></p>';
	tableString+='<p><span>续费人：</span><input value="'+$("#jfr1").val()+'" /></p></td></tr></table></div>';
	tableString+='</div>';
	window.showModalDialog(ctx1+"/print/print?clientType=web&strPrintName="+strPrintName1, tableString,
	"location:No;status:No;help:No;dialogWidth:800px;dialogHeight:600px;scroll:auto;");
}
//打印结束