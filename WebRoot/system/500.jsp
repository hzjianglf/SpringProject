<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
<%@ include file="/common/meta.jsp"%>
<meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
<title>500</title>
<script type="text/javascript">
	function gotoHomePage(){
		top.document.location.href="${ctx}/";	
	}
</script>
</head>

<body>
<div class="false_page">
	<table class="false_main" cellpadding="0" cellspacing="0">
    	<tr>
        	<td valign="middle" style=" text-align:center"><img src="../images/error/500_bg.gif" usemap="#Map" border="0" /></td>
        </tr>
    </table>
</div>

<map name="Map" id="Map">
  <area shape="rect" coords="197,364,297,386" href="javascript:void(0);" onclick="gotoHomePage();" />
</map>
</body>
</html>
