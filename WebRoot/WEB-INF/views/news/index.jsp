<%@ page language="java" pageEncoding="UTF-8"%>
<style>
 .contentImg:hover{
       transform: translate3d(0,-3px,0);  
      box-shadow: 0 0 20px rgba(0,0,0,.3);  
 }
</style>
<html>
<div class="news_content" >
<!--alert-success  alert-info alert-warning alert-danger  -->
<div class="row">
	<div  class="col-md-2"></div>
	<div class="col-md-8">
		<div  class="alert alert-info">
		   <a href="#" class="close" data-dismiss="alert">
		      &times;
		   </a>
		   <h4><a href="http://society.workercn.cn/1/201512/08/151208101317817.shtml" target="_blank" title="流浪狗挡车位被踢 &quot;喊同伙&quot;咬车复仇">流浪狗挡车位被踢 "喊同伙"咬车复仇</a></h4>
		   <div class="row">
		   	<div class="col-md-8 content" >这里面是内容</div>
		   	<div class="col-md-4 contentImg" ><img class="img-responsive" alt="Responsive image"  src="voteyouth/img/4.jpg"></div>
		   </div>
		</div>
	</div>
</div>
</body>
<script type="text/javascript">
	$.ajax({
	   type: "POST",
	   url: "news/list",
	   //dataType: 'json',
	   //data: "name=John&location=Boston",
	   success: function(msg){
	     console.log(msg);
	     var htmlContent="";
	     for(var i=0;i<msg.length;i++){
	    	 htmlContent+='<div class="row">'+
	    				'<div  class="col-md-2"></div>'+
	    				'<div class="col-md-8">'+
	    				'	<div  class="alert alert-info">'+
	    					'   <a href="#" class="close" data-dismiss="alert">'+
	    					'      &times;'+
	    					'   </a>'+
	    					'   <h4><a href="'+msg[i].contentUrl+'" target="_blank">'+msg[i].title+'</a></h4>'+
	    					'   <div class="row">'+
	    					'   	<div class="col-md-8 content" >'+msg[i].content+'</div>'+
	    					'   	<div class="col-md-4 contentImg" ><img class="img-responsive" alt="Responsive image"  src="'+msg[i].imgUrl+'"></div>'+
	    					'   </div>'+
	    				'	</div>'+
	    			  	'</div>'+  
	    			'</div>';
	     }
	     $(".news_content").html(htmlContent);
	   }
	})
</script>
</html>
