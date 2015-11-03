var topColor='';
var bodyColor='';
var ctx='';
function initUserColor(tc,bc,c){
	topColor=tc;
	bodyColor=bc;
	ctx=c;
}
function changUserColor(tc,bc){
	var url = ctx+'/userSys/changUserColor?clientType=web&topColor='+tc+'&bodyColor='+bc;
	$.ajax({
		type : 'post',
		url : url,
		dataType: "json",
		success:function(data){
			if(data.success == true){
			}else{
			}
		}
	});
}


$(document).ready(function () {
  $('.top-bar, #colorSelector-top-bar').css('backgroundColor', '#'+topColor);
  $('.styler').click(function() {
    $(".styler").toggleClass("styler-active");
    $('.styler-show').slideToggle('slow');     
  }); /* to show the styler */
  
  $('#colorSelector-top-bar').tipTip({content: "Change the top bar color", defaultPosition: "right"});
  $('#colorSelector-box-head').tipTip({content: "Change the box header color", defaultPosition: "right"});
  /* for the tooltips describing what each colorpicker changes */

  $('#colorSelector-top-bar').ColorPicker({
	  	  color: '#'+topColor,
          onShow: function (colpkr) {
            $(colpkr).fadeIn(500);
            return false;
          },
          onHide: function (colpkr) {
            $(colpkr).fadeOut(500);
            changUserColor(topColor,bodyColor);
            return false;
          },
          onChange: function (hsb, hex, rgb) {
            $('.top-bar, #colorSelector-top-bar').css('backgroundColor', '#' + hex);
            topColor=hex;
          }
  });
  $('#colorSelector-box-head').ColorPicker({
  		  color: '#'+bodyColor,
          onShow: function (colpkr) {
            $(colpkr).fadeIn(500);
            return false;
          },
          onHide: function (colpkr) {
            $(colpkr).fadeOut(500);
            changUserColor(topColor,bodyColor);
            return false;
          },
          onChange: function (hsb, hex, rgb) {
            $('.box-head, #colorSelector-box-head').css('backgroundColor', '#' + hex);
            bodyColor=hex;
            changeBodyColor(hex);
          }
  });

  
});