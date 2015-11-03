$(function(){
	$('#tj1,#tj2,#tj3,#tj4,#tj5').each(function(){
		var $this=$(this);
		$('.tp ul li',$this).each(function(i){$(this).data('tagindex',i);})
		$('.tp ul li',$this).click(function(){var j=$(this).data('tagindex');
			$('.tp ul li',$this).removeClass('on');$(this).addClass('on');
			$('.one',$this).hide();$('.one:eq('+j+')',$this).fadeIn(300);
			return false;
		});
	})
});