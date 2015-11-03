function myLoadShow(status,title,msg){
	if(status=="show"){
		if(jQuery("#loadDialog").attr("id")){
			jQuery("#loadDialog").remove();
		}
		var titl = 'load';
		if(title){
			titl = title;
		}
        var height=window.document.body.scrollHeight;
		height=height-250;
		if(height<=200){
			height=200;
		}
		
		jQuery("<div id='loadDialog' title='" + titl + "'><center class='bgload'>" + msg + "</center></div>").appendTo(jQuery("body"));
		jQuery("#loadDialog").dialog({
			width: 300,
		    minHeight:150,
			autoOpen: false,
			resizable: false,
			position: [400,height],
			stack: false,
			zIndex:5, 
			bgiframe: true,
			overlay: {opacity: 0.5, background: "black" ,overflow:'auto'}, 
			modal:true
		});
		jQuery("#loadDialog").dialog("open");
	}
	if(status=='close'){
		if(jQuery("#loadDialog").attr("id")){
			jQuery("#loadDialog").dialog("close");
}	}
};