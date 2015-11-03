var flag = false;
//扩展easyui表单的验证
$.extend($.fn.validatebox.defaults.rules, {
    //验证汉字
    CHS: {
        validator: function (value) {
            return /^[\u0391-\uFFE5]+$/.test(value);
        },
        message: '只能输入汉字'
    },
    //移动手机号码验证
    mobile: {//value值为文本框中的值
        validator: function (value) {
            var reg = /^1[3|4|5|8|9]\d{9}$/;
            return reg.test(value);
        },
        message: '输入的手机号码格式不正确'
    },
    //国内邮编验证
    zipcode: {
        validator: function (value) {
            var reg = /^[1-9]\d{5}$/;
            return reg.test(value);
        },
        message: '邮编必须是非0开始的6位数字'
    },
    //用户账号验证(只能包括 _ 数字 字母) 
    account: {//param的值为[]中值
        validator: function (value, param) {
            if (value.length < param[0] || value.length > param[1]) {
                $.fn.validatebox.defaults.rules.account.message = '用户名长度必须在' + param[0] + '至' + param[1] + '范围';
                return false;
            } else {
                if (!/^[\w]+$/.test(value)) {
                    $.fn.validatebox.defaults.rules.account.message = '用户名只能数字、字母、下划线组成';
                    return false;
                } else {
                    return true;
                }
            }
        }, message: ''
    },
    //身份证格式验证
    sfzgs: {
        validator: function (value, param) {
        	$.ajax({
  			  type: 'POST',
  			  asycn:false,
  			  url: param[0] + "/login/checkIdcard?clientType=web",
  			  data: {'idcardCode':value},
  			  dataType:"json",
  			  timeout: 5000,
  			  error: function(){
  				  flag = false;
  			  },
  			  success: function(result){
  				  if(result.success || (!result.success && result.code != 2)){
  					  flag = true;
  				  }else{
  					  flag = false;
  				  }
  			  }
        	});
        	return flag;
        }, 
        message: '身份证号格式错误'
    },
    sfzcz: {
    	validator: function (value, param) {
    		$.ajax({
    			type: 'POST',
    			url: param[0] + "/login/checkIdcard?clientType=web",
    			data: {'idcardCode':value},
    			dataType:"json",
    			timeout: 5000,
    			error: function(){
    				flag = false;
    			},
    			success: function(result){
    				if(result.success || (!result.success && result.code != 1)){
    					flag = true;
    				}else{
    					flag = false;
    				}
    			}
    		});
    		return flag;
    	}, 
    	message: '用户已存在，请直接登录，系统支持身份证号登录'
    },
    passwordEquals: {
        validator: function(value,param){
            return value == $(param[0]).val();
        },
        message: '密码不匹配'
    }
});