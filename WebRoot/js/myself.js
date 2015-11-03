$(function(){
		$(".kan").click(function(){
			$(".nr").slideToggle();
			change_logo($(this));	
		});
		$(".kan2").click(function(){
			$(".nr-right").slideToggle();
			change_logo2($(this));	
		});
		$(".tiaoli").click(function(){
			$(".nr-right").slideToggle();	
		});
	});
	
	function change_logo(selecter){
		if(selecter){
		if(selecter.css("background-image").indexOf("xia.png")>0){
			selecter.css("background-image","url('images/shang.png')");
		}
		else{
			selecter.css("background-image","url('images/xia.png')");
		}
		}
	}
	function change_logo2(selecter){
		if(selecter){
		if(selecter.css("background-image").indexOf("shang.png")>0){
			selecter.css("background-image","url('images/xia.png')");
		}
		else{
			selecter.css("background-image","url('images/shang.png')");
		}
		}
	}
	
	function qh(num){	
		for(j=1;j<=6;j++){
			if(j==num){
				document.getElementById("i"+j).style.background='url("images/down.png") right no-repeat';
			}
			else{
				document.getElementById("i"+j).style.background='url("images/top.png") right no-repeat';	
			}
		}
		change(num);	
	}
	
	function change(num){
		for(j=1;j<=6;j++){
			if(j==num){
				document.getElementById("c"+j).style.color='#3585aa';				
			}
			else{
				document.getElementById("c"+j).style.color='#000';					
			}
		}
	}
    
    function change_bg(num){
    	for(j=1;j<=5;j++){
			if(j==num){
				document.getElementById("bg"+j).style.background='url("images/yuan1.png") no-repeat center';				
			}
			else{
				document.getElementById("bg"+j).style.background='url("images/yuan2.gif") no-repeat center';					
			}
		}
    }
    
    function change_bg2(num){
    	for(j=1;j<=5;j++){
			if(j==num){
				document.getElementById("g"+j).style.background='url("images/yuan1.png") no-repeat center';				
			}
			else{
				document.getElementById("g"+j).style.background='url("images/yuan2.gif") no-repeat center';					
			}
		}
    }
	
	function change_img(selecter){
		if(selecter){
		if(selecter.css("background-image").indexOf("daohang.png")>0){
			selecter.css("background-image","url('images/daohangTop.png')");
		}
		else{
			selecter.css("background-image","url('images/daohang.png')");
		}
		}
	}
	function changeWidth(){
		var d=document.documentElement.clientWidth-174;
		document.getElementById("tabs").style.width=d+"px";
		setnrHeight();
	}
	
	function setnrHeight(){
		var h=document.documentElement.clientHeight;
		document.getElementById("neirong").height=h;
	}