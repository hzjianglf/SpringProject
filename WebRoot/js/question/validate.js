    
    /**
    * 功能描述：提供前台js的校验,改造stuts taglib同时到stuts
    * 文件名称：validate.js
    */
    var bCancel = false; 
    /**
     * js前端校验总方法
     *
     *
     * @param form 要校验的form
     * 
     * @return boolean true为校验成功，法false为校验失败
     * 
     */
    function validateJsTypeForm(form) {                                                                   
      if (bCancel) 
          return true; 
      else 
          return validateAll(form);
    }

    function validateAll(form) {
        var eles = form.elements;
        var isValid = true;
        for(i=0;i<eles.length;i++)
        {
            if (eles[i].type == 'text' ||
                eles[i].type == 'textarea') 
            {
                var oldValue = eles[i].value;
                var newValue =  trim(oldValue);
                if(oldValue!=newValue){
                	eles[i].value = newValue;	
                }
                
            }
        }
        for(i=0;i<eles.length;i++)
        {
            if (eles[i].type == 'text' ||
                eles[i].type == 'textarea' ||
                eles[i].type == 'file' ||
                eles[i].type == 'select-one' ||
                eles[i].type == 'password') 
            {
                if(eles[i].getAttribute('notnull') == 'true'){
                    isValid = validateRequired(eles[i]);
                    if(!isValid) break;
                }
            }
          if (eles[i].type == 'checkbox' ||                
                eles[i].type == 'radio' )
           {  
			    if(eles[i].getAttribute('notnull') == 'true'){
					isValid = validateChecked(eles[i]);
                    if(!isValid) break;
                }
		   }	            
            if (eles[i].type == 'text' ||
                       eles[i].type == 'textarea' ||
                       eles[i].type == 'password')
            {
                if(eles[i].getAttribute('maxLength') != null || eles[i].getAttribute('maxLength') != null){
                    isValid = validateMaxLength(eles[i]);
                    if(!isValid) break;
                }
            }
            if (eles[i].type == 'text' ||
                       eles[i].type == 'textarea' ||
                       eles[i].type == 'password')
            {
                if(eles[i].getAttribute('minlength') != null){
                    isValid = validateMinLength(eles[i]);
                    if(!isValid) break;
                }
            }
            if ((eles[i].type == 'text' ||
                eles[i].type == 'textarea' ||
                eles[i].type == 'select-one' ||
                eles[i].type == 'radio') &&
                (eles[i].value.length > 0))
            {
                if(eles[i].getAttribute('fieldtype')=='integer'){
                    isValid = validateInteger(eles[i]) && validateIntRange(eles[i]);
                    if(!isValid) break;
                }
            }
            if ((eles[i].type == 'text' ||
                 eles[i].type == 'textarea') &&
                (eles[i].value.length > 0)) 
            {
                if(eles[i].getAttribute('fieldtype')=='date'){
                    isValid = validateDate(eles[i]);
                    if(!isValid) break;
                }
            }
            if ((eles[i].type == 'text' ||
                 eles[i].type == 'textarea') &&
                (eles[i].value.length > 0)) 
            {
                if(eles[i].getAttribute('fieldtype')=='creditcard'){
                    isValid = validateCreditCard(eles[i]);
                    if(!isValid) break;
                }
               if(eles[i].getAttribute('fieldtype')=='identityCard'){
                    isValid = validateIdentityCard(eles[i]);
                    if(!isValid) break;
                }               
                if(eles[i].getAttribute('fieldtype')=='phone'){
                    isValid = validatePhone(eles[i]);
                    if(!isValid) break;
                }
                if(eles[i].getAttribute('fieldtype')=='fax'){
                    isValid = validateFax(eles[i]);
                    if(!isValid) break;
                }
                if(eles[i].getAttribute('fieldtype')=='postalcode'){
                    isValid = validatePostalcode(eles[i]);
                    if(!isValid) break;
                }    
            }
            if (eles[i].type == 'text' ||
                eles[i].type == 'textarea' ||
                eles[i].type == 'select-one' ||
	        eles[i].type == 'radio') 
            {
                if(eles[i].getAttribute('fieldtype')=='byte'){
                    isValid = validateByte(eles[i]);
                    if(!isValid) break;
                }
            }
            if ((eles[i].type == 'text' ||
                eles[i].type == 'textarea' ||
                eles[i].type == 'select-one' ||
                eles[i].type == 'radio') &&
                (eles[i].value.length > 0))
            {
                 if(eles[i].getAttribute('fieldtype')=='short'){
                    isValid = validateShort(eles[i]) && validateIntRange(eles[i]);
                    if(!isValid) break;
                 }
            }
            if ((eles[i].type == 'text' ||
                eles[i].type == 'textarea' ||
                eles[i].type == 'select-one' ||
                eles[i].type == 'radio') &&
                (eles[i].value.length > 0))
            {
                if(eles[i].getAttribute('fieldtype')=='float'){
                    isValid = validateFloat(eles[i]) && validateFloatRange(eles[i]);
                    if(!isValid) break;
                }
            }
            if ((eles[i].type == 'text' ||
                 eles[i].type == 'textarea') &&
                (eles[i].value.length > 0)) 
            {
                 if(eles[i].getAttribute('fieldtype') == 'email'){
                    isValid = validateEmail(eles[i]);
                    if(!isValid) break;
                 }
            }
            if ((eles[i].type == 'text' || 
                 eles[i].type == 'textarea') && 
                 (eles[i].value.length > 0)) 
            {
                if(eles[i].mask != null){
                    isValid = validateMask(eles[i]);
                    if(!isValid) break;
                }
            }
            
        }
        return isValid;
    }
    /**
     * 构造校验的基础数据参数2的一部分，得到元素的显示名称
     *
     *
     * @param element form的元素
     * 
     * @return String 元素的显示名称
     *
     */
     function getCaption(element){
         var arr2 = "";
         if(element.getAttribute('caption') != null)
             arr2 = element.getAttribute('caption');
         else if(element.name != null)
             arr2 = element.name;
         else if(eles[i].id != null)
             arr2 = element.id;
         return "'" + arr2 + "'";
     }
    /**
     * 构造校验整数、实数范围的基础数据参数2，得到提示信息
     *
     *
     * @param element form的元素
     * 
     * @return String 得到提示信息
     * 
     */
     function getMsg(element,min,max){
         var msg="";
         if(min != null && max != null)
             msg = getCaption(element)+ "必须介于 " + min + " ~ " + max + " !";
         else if(min!= null)
             msg = getCaption(element)+ "不能小于 " + min + " !";
         else if(max != null)
             msg = getCaption(element)+ "不能大于 " + max + " !";
         return msg;
     }
    /**
     * 单个字符校验
     *
     *
     * @param field 校验的输入域
     * 
     * @return boolean 单个字符校验，true校验成功，false校验失败
     * 
     */
     function validateByte(field){
        var value = field.value;
        var msg = '' ;
        var bValid = true;
	// get field's value
	if (field.type == "select-one") {
	    var si = field.selectedIndex;
	    if (si >= 0) {
	        value = field.options[si].value;
	    }
	} else {
	    value = field.value;
	}
	if (value.length > 0) {
	    if (!isAllDigits(value)) {
	    	msg = "请在" + getCaption(field) + "输入一个字符!";
	        bValid = false;
            } else {
                var iValue = parseInt(value);
	        if (isNaN(iValue) || !(iValue >= -128 && iValue <= 127)) {
	            msg = "请在" + getCaption(field) + "输入一个字符!";
                    bValid = false;
                }
            }
        }
        if (msg != '') {
            field.focus();
            showMsg(msg);
        }
        return bValid;
     }
    /**
     * 输入字符长度校验
     *
     *
     * @param field 校验的输入域
     * 
     * @return boolean 输入字符长度校验，true校验成功，false校验失败
     * 
     */
    function validateMaxLength(field) {
        var value = field.value;
        var msg = '' ;
        var isValid = true;
	var iMax = field.getAttribute('maxLength');
	if(field.getAttribute('maxLength')!=null) iMax = field.getAttribute('maxLength');
	if (field.value.length > iMax || realLength(field.value) > iMax) {
            msg ="输入"+getCaption(field)+"的长度不能超过" + iMax + "个字符（一个汉字占两个字符）!";
	    isValid = false;
	}
        if (msg != '') {
            field.focus();
            showMsg(msg);
        }
        return isValid;
    }
   /**
    * 是否为必输项校验
    *
    *
    * @param field 校验的输入域
    * 
    * @return boolean 是否为必输项校验，true校验成功，false校验失败
    * 
    */
    function validateRequired(field){
        var isValid = true;
        var value = '';
        var msg = '';
	   	// get field's value
	 	if (field.type == "select-one") {
	 	    var si = field.selectedIndex;
		    if (si >= 0) {
		        value = field.options[si].value;
		    }
		} else {
		    value = field.value;
		}
		if (value.length == 0) {
				
	            msg = getCaption(field) + "不能为空！";
	            isValid = false;
        }
        
        if (msg != '') {
            field.focus();
            showMsg(msg);
        }
        return isValid;
    }
    
   /**
    * 是否为必输项校验，针对单选钮及复选框必须选一项。
    *
    *
    * @param field 校验的输入域
    * 
    * @return boolean 是否为必输项校验，true校验成功，false校验失败
    * 
    */
    function validateChecked(field){
        var isValid = true;
        var isChecked = false;
        var msg = '';
		if(field.type == "radio" || field.type == "checkbox"){
		 	checkObj = document.getElementsByName(field.name);
			if(checkObj.length == 1){
				//只有一项情况
			   isChecked = field.checked;
			} else {
				//多项情况
				for(var i=0;i<checkObj.length;i++) {
					if(checkObj[i].checked == true) {
						isChecked = true;
						break;
					}
				}
			}
		}

		if (isChecked == false) {
	            msg = "至少要选"+getCaption(field) + "中的一项！";
	            isValid = false;
        }
        
        if (msg != '') {
            field.focus();
            showMsg(msg);
        }
        return isValid;
    }    

    // Trim whitespace from left and right sides of s.
    function trim(s) {
        return s.replace( /^\s*/, "" ).replace( /\s*$/, "" );
    }
    /**
     * 长整数校验
     *
     *
     * @param field 校验的输入域
     * 
     * @return boolean 长整数校验，true校验成功，false校验失败
     * 
     */
    function validateInteger(field) {
        var bValid = true;
        var msg = '';
        var value = '';
	// get field's value
	if (field.type == "select-one") {
	    var si = field.selectedIndex;
	    if (si >= 0) {
                value = field.options[si].value;
	    }
	} else {
	    value = field.value;
	}
        if (!isAllDigits(value)) {
	    bValid = false;
	    msg = "请在" + getCaption(field) + "输入长整数！";
        }
        if (msg != '') {
            field.focus();
            showMsg(msg);
        }
        return bValid;
    }
    /**
     * 是否为数字
     *
     *
     * @param field 校验的输入域
     * 
     * @return boolean 是否为数字，true校验成功，false校验失败
     * 
     */
    function isAllDigits(argvalue) {
        argvalue = argvalue.toString();
        var validChars = "0123456789";
        var startFrom = 0;
        if (argvalue.substring(0, 2) == "0x") {
            validChars = "0123456789abcdefABCDEF";
            startFrom = 2;
        }
		
		else if (argvalue.charAt(0) == "-") {
            startFrom = 1;
            if(argvalue.length==1){
            	return false;
            }
       }
        for (var n = startFrom; n < argvalue.length; n++) {
            if (validChars.indexOf(argvalue.substring(n, n+1)) == -1) return false;
        }
        return true;
      }
    /**
     * 日期校验
     *
     *
     * @param field 校验的输入域
     * 
     * @return boolean 日期校验，true校验成功，false校验失败
     * 
     */
    function validateDate(field) {
        var value = field.value;
        var msg = '' ;
        var datePattern;
        var bValid = true;
        if(field.datepatternstrict != null){
            datePattern = field.datepatternstrict;
        }else{
            datePattern = "yyyy-MM-dd";
        }
        if (datePattern.length > 0) {
            var MONTH = "MM";
            var DAY = "dd";
            var YEAR = "yyyy";
            var orderMonth = datePattern.indexOf(MONTH);
            var orderDay = datePattern.indexOf(DAY);
            var orderYear = datePattern.indexOf(YEAR);
            if (orderDay==-1 && orderMonth==-1){
            	dateRegexp = new RegExp("^(\\d{4})$");
            	var matched = dateRegexp.exec(value);
                if(matched == null){
                    msg = "请在" + getCaption(field) + "输入年(" + datePattern + ")！";
                    bValid =  false;
                }
            }else if (orderDay==-1){
            	if(orderMonth < orderYear){
            	    var iDelim1 = orderMonth + MONTH.length;
            	    var delim1 = datePattern.substring(iDelim1, iDelim1 + 1);
           	    if (iDelim1 == orderYear) {
            	    	dateRegexp = new RegExp("^(\\d{2})(\\d{4})$");
            	    }else{
            	        dateRegexp = new RegExp("^(\\d{2})[" + delim1 + "](\\d{4})$");
            	    }
                    var matched = dateRegexp.exec(value);
                    if(matched != null) {
                        if (!isValidDate2(matched[1])) {
                    	    msg = "请在" + getCaption(field) + "输入年月(" + datePattern + ")！";
                            bValid =  false;
                        }
                    } else {
                        msg = "请在" + getCaption(field) + "输入年月(" + datePattern + ")！";
                        bValid =  false;
                    }
            	}else{
            	    var iDelim1 = orderYear + YEAR.length;
            	    var delim1 = datePattern.substring(iDelim1, iDelim1 + 1);
            	    if (iDelim1 == orderMonth) {
            	    	dateRegexp = new RegExp("^(\\d{4})(\\d{2})$");
            	    }else{
            	        dateRegexp = new RegExp("^(\\d{4})[" + delim1 + "](\\d{2})$");
            	    }
                    var matched = dateRegexp.exec(value);
                    if(matched != null) {
                        if (!isValidDate2(matched[2])) {
                    	    msg = "请在" + getCaption(field) + "输入年月(" + datePattern + ")！";
                            bValid =  false;
                        }
                    } else {
                        msg = "请在" + getCaption(field) + "输入年月(" + datePattern + ")！";
                        bValid =  false;
                    }
                }
            }else if (orderDay < orderYear && orderDay > orderMonth) {
                var iDelim1 = orderMonth + MONTH.length;
                var iDelim2 = orderDay + DAY.length;
                var delim1 = datePattern.substring(iDelim1, iDelim1 + 1);
                var delim2 = datePattern.substring(iDelim2, iDelim2 + 1);
                if (iDelim1 == orderDay && iDelim2 == orderYear) {
                    dateRegexp = new RegExp("^(\\d{2})(\\d{2})(\\d{4})$");
                } else if (iDelim1 == orderDay) {
                    dateRegexp = new RegExp("^(\\d{2})(\\d{2})[" + delim2 + "](\\d{4})$");
                } else if (iDelim2 == orderYear) {
                    dateRegexp = new RegExp("^(\\d{2})[" + delim1 + "](\\d{2})(\\d{4})$");
                } else {
                    dateRegexp = new RegExp("^(\\d{2})[" + delim1 + "](\\d{2})[" + delim2 + "](\\d{4})$");
                }
                var matched = dateRegexp.exec(value);
                if(matched != null) {
                    if (!isValidDate(matched[2], matched[1], matched[3])) {
                    	msg = "请在" + getCaption(field) + "输入日期(" + datePattern + ")！";
                        bValid =  false;
                    }
                } else {
                    msg = "请在" + getCaption(field) + "输入日期(" + datePattern + ")！";
                    bValid =  false;
                }
            } else if (orderMonth < orderYear && orderMonth > orderDay) {
                var iDelim1 = orderDay + DAY.length;
                var iDelim2 = orderMonth + MONTH.length;
                var delim1 = datePattern.substring(iDelim1, iDelim1 + 1);
                var delim2 = datePattern.substring(iDelim2, iDelim2 + 1);
                if (iDelim1 == orderMonth && iDelim2 == orderYea) {
                    dateRegexp = new RegExp("^(\\d{2})(\\d{2})(\\d{4})$");
                } else if (iDelim1 == orderMonth) {
                    dateRegexp = new RegExp("^(\\d{2})(\\d{2})[" + delim2 + "](\\d{4})$");
                } else if (iDelim2 == orderYear) {
                    dateRegexp = new RegExp("^(\\d{2})[" + delim1 + "](\\d{2})(\\d{4})$");
                } else {
                    dateRegexp = new RegExp("^(\\d{2})[" + delim1 + "](\\d{2})[" + delim2 + "](\\d{4})$");
                }
                var matched = dateRegexp.exec(value);
                if(matched != null) {
                    if (!isValidDate(matched[1], matched[2], matched[3])) {
                    	msg = "请在" + getCaption(field) + "输入日期(" + datePattern + ")！";
                        bValid =  false;
                    }
                } else {
                    msg = "请在" + getCaption(field) + "输入日期(" + datePattern + ")！";
                    bValid =  false;
                }
            } else if ((orderMonth > orderYear && orderMonth < orderDay)) {
                var iDelim1 = orderYear + YEAR.length;
                var iDelim2 = orderMonth + MONTH.length;
                var delim1 = datePattern.substring(iDelim1, iDelim1 + 1);
                var delim2 = datePattern.substring(iDelim2, iDelim2 + 1);
                if (iDelim1 == orderMonth && iDelim2 == orderDay) {
                    dateRegexp = new RegExp("^(\\d{4})(\\d{2})(\\d{2})$");
                } else if (iDelim1 == orderMonth) {
                    dateRegexp = new RegExp("^(\\d{4})(\\d{2})[" + delim2 + "](\\d{2})$");
                } else if (iDelim2 == orderDay) {
                    dateRegexp = new RegExp("^(\\d{4})[" + delim1 + "](\\d{2})(\\d{2})$");
                } else {
                    dateRegexp = new RegExp("^(\\d{4})[" + delim1 + "](\\d{2})[" + delim2 + "](\\d{2})$");
                }
                var matched = dateRegexp.exec(value);
                if(matched != null) {
                    if (!isValidDate(matched[3], matched[2], matched[1])) {
                    	msg = "请在" + getCaption(field) + "输入日期(" + datePattern + ")！";
                        bValid =  false;
                    }
                } else {
                    msg = "请在" + getCaption(field) + "输入日期(" + datePattern + ")！";
                    bValid =  false;
                }
            } else {
                msg = "请在" + getCaption(field) + "输入日期(" + datePattern + ")！";
                bValid =  false;
            }
        }
        if (msg != '') {
            field.focus();
            showMsg(msg);
        }
        return bValid;
    }
    /**
     * 是否是月份
     *
     *
     * @param field 校验的输入域
     * 
     * @return boolean 是否是日期，true校验成功，false校验失败
     * 
     */
     function isValidDate2(month) {
	        if (month < 1 || month > 12) {
                    return false;
                }
                return true;
      }
    /**
     * 是否是日期
     *
     *
     * @param field 校验的输入域
     * 
     * @return boolean 是否是日期，true校验成功，false校验失败
     * 
     */
     function isValidDate(day, month, year) {
	        if (month < 1 || month > 12) {
                    return false;
                }
                if (day < 1 || day > 31) {
                    return false;
                }
                if ((month == 4 || month == 6 || month == 9 || month == 11) &&
                    (day == 31)) {
                    return false;
                }
                if (month == 2) {
                    var leap = (year % 4 == 0 &&
                               (year % 100 != 0 || year % 400 == 0));
                    if (day>29 || (day == 29 && !leap)) {
                        return false;
                    }
                }
                return true;
      }
    /**
     * Credit Card校验
     *
     *
     * @param field 校验的输入域
     * 
     * @return boolean Credit Card校验，true校验成功，false校验失败
     * 
     */
    function validateCreditCard(field){
        var value = field.value;
        var msg = '' ;
        var bValid = true;
	if (!luhnCheck(value)) {
	    msg = "请在" + getCaption(field) + "输入creditcard！";
	    bValid = false;
	}
        if (msg != '') {
            field.focus();
            showMsg(msg);
        }
        return bValid;
    }
    /**
     * Reference: http://www.ling.nwu.edu/~sburke/pub/luhn_lib.pl
     */
    function luhnCheck(cardNumber) {
        if (isLuhnNum(cardNumber)) {
            var no_digit = cardNumber.length;
            var oddoeven = no_digit & 1;
            var sum = 0;
            for (var count = 0; count < no_digit; count++) {
                var digit = parseInt(cardNumber.charAt(count));
                if (!((count & 1) ^ oddoeven)) {
                    digit *= 2;
                    if (digit > 9) digit -= 9;
                };
                sum += digit;
            };
            if (sum == 0) return false;
            if (sum % 10 == 0) return true;
        };
        return false;
    }

    function isLuhnNum(argvalue) {
        argvalue = argvalue.toString();
        if (argvalue.length == 0) {
            return false;
        }
        for (var n = 0; n < argvalue.length; n++) {
            if ((argvalue.substring(n, n+1) < "0") ||
                (argvalue.substring(n,n+1) > "9")) {
                return false;
            }
        }
        return true;
    }
    /**
     * 整数范围校验
     *
     *
     * @param field 校验的输入域
     * 
     * @return boolean 整数范围校验，true校验成功，false校验失败
     * 
     */
    function validateIntRange(field) {

        var value = field.value;
        var msg = '' ;
        var isValid = true;
        
	var iMin = field.getAttribute('min');
	var iMax = field.getAttribute('max');
	
	if(field.getAttribute('fieldtype')=='short'){
	    iMin = (iMin==null || iMin<-32768)?-32768:iMin;
	    iMax = (iMax==null || iMax>32767)?32767:iMax;
	}else if(field.getAttribute('fieldtype')=='integer'){
	    iMin = (iMin==null || iMin<-2147483648)?-2147483648:iMin;
	    iMax = (iMax==null || iMax>2147483647)?2147483647:iMax;
	}
        var iValue = parseInt(field.value);
        if ((iMin!=null && iValue < iMin) || (iMax!=null && iValue > iMax)) {
            isValid = false;
            msg = getMsg(field,iMin,iMax);
        }
        
        if (msg != '') {
            field.focus();
            showMsg(msg);
        }
        return isValid;
    }
    /**
     * 实数范围校验
     *
     *
     * @param field 校验的输入域
     * 
     * @return boolean 整数范围校验，true校验成功，false校验失败
     * 
     */
    function validateFloatRange(field) {
        var value = field.value;
        var msg = '' ;
        var isValid = true;
        
	var fMin = field.getAttribute('min');
	var fMax = field.getAttribute('max');
        var fValue = parseFloat(field.value);
        if (((fMin!=null && fValue < fMin) || (fMax!=null && fValue > fMax))) {
            isValid = false;
            msg = getMsg(field,fMin,fMax);
        }
        if (msg != '') {
            field.focus();
            showMsg(msg);
        }
        return isValid;
    }
    /**
     * 短整数校验
     *
     *
     * @param field 校验的输入域
     * 
     * @return boolean 短整数校验，true校验成功，false校验失败
     * 
     */
     
    function validateShort(field) {
        var msg = '' ;
        var bValid = true;
        var value = '';
	// get field's value
	if (field.type == "select-one") {
	    var si = field.selectedIndex;
	    if (si >= 0) {
		value = field.options[si].value;
	    }
	} else {
	    value = field.value;
	}
	
        if (!isAllDigits(value)) {
            bValid = false;
            msg = "请在" + getCaption(field) + "输入整数！";
        }
                       
        if (msg != '') {
            field.focus();
            showMsg(msg);
        }
        return bValid;
    }
    /**
     * 实数校验
     *
     *
     * @param field 校验的输入域
     * 
     * @return boolean 实数校验，true校验成功，false校验失败
     * 
     */
    function validateFloat(field) {

        var msg = '' ;
        var bValid = true;
        
    	var value = '';
	// get field's value
	if (field.type == "select-one") {
	    var si = field.selectedIndex;
	    if (si >= 0) {
		value = field.options[si].value;
            }
	} else {
	    value = field.value;
	}
        
	// remove '.' before checking digits
	//value = replaceStr(value,",","");
	var tempArray = value.split('.');
	var joinedString= tempArray.join('');

	if (!isAllDigits(joinedString)) {
	    bValid = false;
	    msg = "请在" + getCaption(field) + "输入实数！";		
	} else {
	    var iValue = parseFloat(value);
	    if (isNaN(iValue)) {
	        msg = "请在" + getCaption(field) + "输入实数！";
	        bValid = false;			
	    }else{
	    	//小数位数最多多少位
	    	var scaleNum = field.scale;
	    	if(scaleNum && scaleNum!=''){
	    		scaleNum = parseInt(scaleNum);
	    		if(tempArray.length>1){
	    			if(tempArray[1].length>scaleNum){
	    				msg = getCaption(field) + "的小数位数最多只能填写"+scaleNum+"位！";
	    				bValid = false;
	    			}
	    		}
	    	}
	    }
	}
                        
        if (msg != '') {
            field.focus();
            showMsg(msg);
        }
        return bValid;
    }
    function replaceStr(sourceStr,str1,str2){
    	var rtn = sourceStr;
    	rtn = rtn.replace(str1,str2);
    	if(rtn.indexOf(str1)>=0)
    	    rtn = replaceStr(rtn,str1,str2);
    	return rtn;
    }
    /**
     * email校验
     *
     *
     * @param field 校验的输入域
     * 
     * @return boolean email校验，true校验成功，false校验失败
     * 
     */
    function validateEmail(field) {
        var value = field.value;
        var msg = '' ;
        var bValid = true;
        if (!checkEmail(value)) {
            msg = "请在" + getCaption(field) + "输入Email地址,如：stamhankar@hotmail.com";
            bValid = false;
        }
        
        if (msg != '') {
            field.focus();
            showMsg(msg);
        }
        return bValid;
    }
           
 function checkEmail2(mail){
var emailPattern = /\w+@.+\..+$/;
if (emailPattern.test(mail)==false)
return false;
else
return true;
}      
           
           
           
           
            /**
             * Reference: Sandeep V. Tamhankar (stamhankar@hotmail.com),
             * http://javascript.internet.com
             */
            function checkEmail(emailStr) {
               if (emailStr.length == 0) {
                   return true;
               }
               var emailPat=/^(.+)@(.+)$/;
               var specialChars="\\(\\)<>@,;:\\\\\\\"\\.\\[\\]";
               var validChars="\[^\\s" + specialChars + "\]";
               var quotedUser="(\"[^\"]*\")";
               var ipDomainPat=/^(\d{1,3})[.](\d{1,3})[.](\d{1,3})[.](\d{1,3})$/;
               var atom=validChars + '+';
               var word="(" + atom + "|" + quotedUser + ")";
               var userPat=new RegExp("^" + word + "(\\." + word + ")*$");
               var domainPat=new RegExp("^" + atom + "(\\." + atom + ")*$");
               var matchArray=emailStr.match(emailPat);
               if (matchArray == null) {
                   return false;
               }
               var user=matchArray[1];
               var domain=matchArray[2];
               if (user.match(userPat) == null) {
                   return false;
               }
               var IPArray = domain.match(ipDomainPat);
               if (IPArray != null) {
                   for (var i = 1; i <= 4; i++) {
                      if (IPArray[i] > 255) {
                         return false;
                      }
                   }
                   return true;
               }
               var domainArray=domain.match(domainPat);
               if (domainArray == null) {
                   return false;
               }
               var atomPat=new RegExp(atom,"g");
               var domArr=domain.match(atomPat);
               var len=domArr.length;
               if ((domArr[domArr.length-1].length < 2) ||
                   (domArr[domArr.length-1].length > 3)) {
                   return false;
               }
               if (len < 2) {
                   return false;
               }
               return true;
            }
    /**
     * mask校验
     *
     *
     * @param field 校验的输入域
     * 
     * @return boolean mask校验，true校验成功，false校验失败
     * 
     */
    function validateMask(field) {
        var value = field.value;
        var msg = '' ;
        var isValid = true;
        if (!matchPattern(value, field.getAttribute('mask'))) {
            msg = "请在" + getCaption(field) + "输入为格式'" + field.getAttribute('mask') + "'数据!";
            isValid = false;
        }
        if (msg != '') {
            field.focus();
            showMsg(msg);
        }
        return isValid;
    }
    function matchPattern(value, mask) {
        return eval(mask).exec(value);
    }
    /**
     * 输入最小长度校验
     *
     *
     * @param field 校验的输入域
     * 
     * @return boolean mask校验，true校验成功，false校验失败
     * 
     */
    function validateMinLength(field){
        var value = field.value;
        var msg = '' ;
        var isValid = true;
        
        var iMin = field.getAttribute('minlength');
        if ((trim(field.value).length > 0) && realLength(field.value) < iMin) {
            msg = getCaption(field) + "输入长度不能小于" + field.getAttribute('minlength') + "个字!" ;
            isValid = false;
        }
        if (msg != '') {
            field.focus();
            showMsg(msg);
        }
        return isValid;
    }


    /**
     * 输入最小长度校验
     *
     *
     * @param value 数值
     * 
     * @return int 返回实际的长度
     * 
     */
     function realLength(value)
     { 
         var vlen=0;
         for (var i=0; i<value.length; i++){
             vlen++;
             if (escape(value.charAt(i)).indexOf("%u") != -1) vlen++;
         }
         return vlen;
      }
    /**
     * 显示消息
     *
     *
     * @param msg 消息内容
     * 
     * 
     */
     var rootPath = "./";
     function showMsg(messages){
	   //var msg = new Array(messages,'数据校验错误',2);
	   var msg = new Array(messages);
	   alert(msg);
	 //var ret=window.showModalDialog(rootPath + 'contents/system/message/Message.htm',msg,"status:no;scroll:no;help:no");
	 //return ret;
     }
    /**
     * 去空格
     * @param str 源字符
     */
     function trim(str)
     {
     	if(typeof(str)!='undefined'){
     		return str.replace(/^\s+/, '').replace(/\s+$/, '');
     	}else{
     		return "";
     	}
    }

     /**
     * 是否为数字(0-9)
     *
     *
     * @param field 校验的输入域
     * 
     * @return boolean 是否为数字(0-9)，true校验成功，false校验失败
     * 
     */
    function zero2nine(argvalue) {
        argvalue = argvalue.toString();
        var validChars = "0123456789";
        var startFrom = 0;
        for (var n = startFrom; n < argvalue.length; n++) {
            if (validChars.indexOf(argvalue.substring(n, n+1)) == -1) return false;
        }
        return true;
      } 
      
    function checkIdentityCard(argvalue) {
        argvalue = argvalue.toString();
        var validNumbers = "0123456789";
        var validChars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
        var startFrom = 0;
        var n = 0;
        for (n = 0; n < argvalue.length-1; n++) {
            if (validNumbers.indexOf(argvalue.substring(n, n+1)) == -1) return false;
        }
        if((validNumbers.indexOf(argvalue.substring(n, n+1)) == -1) && (validChars.indexOf(argvalue.substring(n,n+1)) == -1)) return false;
        return true;
      } 
            
     /**
     * 是否为电话号码
     *
     *
     * @param field 校验的输入域
     * 
     * @return boolean 是否为电话号码，true校验成功，false校验失败
     * 
     */
    function isPhone(argvalue) {
        argvalue = argvalue.toString();
        var validChars = "0123456789-";
        var startFrom = 0;
        for (var n = startFrom; n < argvalue.length; n++) {
            if (validChars.indexOf(argvalue.substring(n, n+1)) == -1) return false;
        }
        return true;
      } 
      
    /**
     * 电话号码校验
     *
     *
     * @param field 校验的输入域
     * 
     * @return boolean bValid 电话号码校验，true校验成功，false校验失败
     * 
     */
    function validatePhone(field){
        var value = field.value;
        var msg = '' ;
        var bValid = true;
		if (!isPhone(value)) {
		    msg = "请在" + getCaption(field) + "输入正确的电话号码！";
		    bValid = false;
		}
        if (msg != '') {
            field.focus();
            showMsg(msg);
        }
        return bValid;
    } 
    
    /**
     * 传真号码校验
     *
     *
     * @param field 校验的输入域
     * 
     * @return boolean bValid 传真号码校验，true校验成功，false校验失败
     * 
     */
    function validateFax(field){
        var value = field.value;
        var msg = '' ;
        var bValid = true;
		if (!isPhone(value)) {
		    msg = "请在" + getCaption(field) + "输入正确的传真号码！";
		    bValid = false;
		}
        if (msg != '') {
            field.focus();
            showMsg(msg);
        }
        return bValid;
    }     
         
     /**
     * 是否为身份证号码
     *
     *
     * @param field 校验的输入域
     * 
     * @return boolean 是否为身份证号码，true校验成功，false校验失败
     * 
     */

    function isIdentityCard(argvalue) {
 		if(argvalue.length != 15 && argvalue.length != 18) {
 			return false;
 		}
 		if(argvalue.length ==18)
 		{
 			if(!checkIdentityCard(argvalue)) {
 				return false;
 			} else {
 						return true;
 					} 			
        }
        if(argvalue.length ==15)
        {
 			if(!zero2nine(argvalue)) {
 				return false;
 			} else {
 						return true;
 					}
        }
      } 

    /**
     * 身份证号码校验
     *
     *
     * @param field 校验的输入域
     * 
     * @return boolean bValid 身份证号码校验，true校验成功，false校验失败
     * 
     */
    function validateIdentityCard(field){
        var value = field.value;
        var msg = '' ;
        var bValid = true;
		if (!isIdentityCard(value)) {
		    msg = "请在" + getCaption(field) + "输入正确的身份证号码！";
		    bValid = false;
		}
        if (msg != '') {
            field.focus();
            showMsg(msg);
        }
        return bValid;
    } 
    
        /**
     * 检测Text输入框内容是否为空
     */
    function validateNotNullText(windHandler){
        var eles = windHandler.document.all;
        var isValid = true;
        for(i=0;i<eles.length;i++)
        {
            if (eles[i].type == 'text' || eles[i].type == 'textarea'){
               if(eles[i].getAttribute('notnull') == 'true'){
                    isValid = validateRequired(eles[i]);
                    if(!isValid) break;
               }
            }
        }
        return isValid;
     }
     
     /**
      * 重置表单的Text
      */
     function resetInputText(windHandler){
     	 var eles = windHandler.document.all;
        for(i=0;i<eles.length;i++)
        {
            if (eles[i].type == 'text' || eles[i].type == 'textarea'){
               eles[i].value = "";
            }
        }
     }
     //校验IP地址格式   
	  function checkip(ipStr)   
	  {   
		 var exp=/^(\d{1,2}|1\d\d|2[0-4]\d|25[0-5])\.(\d{1,2}|1\d\d|2[0-4]\d|25[0-5])\.(\d{1,2}|1\d\d|2[0-4]\d|25[0-5])\.(\d{1,2}|1\d\d|2[0-4]\d|25[0-5])$/; 
         var reg = ipStr.match(exp);
         if(reg==null){
            return false;
         }
         else{
            return true;
         } 
	   }   
    /**
     * 邮编校验
     *
     *
     * @param field 校验的输入域
     * 
     * @return boolean 邮编校验，true校验成功，false校验失败
     * 
     */
    function validatePostalcode(field) {
        var bValid = true;
        var msg = '';
        var value = '';
	    value = field.value;
        if (!zero2nine(value)) {
		    bValid = false;
		    msg = "请在" + getCaption(field) + "输入正确的邮编！（例如：100101）";
        }
        if (msg != '') {
            field.focus();
            showMsg(msg);
        }
        return bValid;
    }
     
     