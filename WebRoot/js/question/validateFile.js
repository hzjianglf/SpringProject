/*-----校验文件的方法--------*/

		function checkUploadFile(file_name,allowTypeExt,allowMaxSize){						
		    if (file_name==""){
		    	return true;
		    }
	      	var indexDot = file_name.lastIndexOf('.');
	      	if(indexDot==-1){
	       		alert("您上传的文件："+file_name+"，没有扩展名！");
	        	return false;
	      	}
	      	var fileTypeExt = file_name.substring(indexDot+1);
	      	if(allowTypeExt && allowTypeExt!=''){
		      	var allowTypeExts = allowTypeExt.split(',');
		      	var flag = false;
		      	for(var i=0;i<allowTypeExts.length;i++){
		      		if(fileTypeExt.toLowerCase()==allowTypeExts[i].toLowerCase()){
		      			flag = true;
		      			break;
		      		}
		      	}
		      	if(!flag){
		      		alert("系统只支持以下类型的文件："+allowTypeExt);
		      		return false;
		      	}
	      	}
	      	var fileObj = null;
	      	try{
	      		fileObj = new ActiveXObject("Scripting.FileSystemObject");
	      	}catch(err){
	      		//浏览器不支持客户端的文件验证;
	      		return true;
	      	}
			var maxFileSize = 10;
	      	try{
				if(allowMaxSize && allowMaxSize!=''){
					maxFileSize = parseInt(allowMaxSize);
				}
			}catch(err){
				maxFileSize = 10;
			}
			try{
				var file_size = fileObj.GetFile(file_name).Size;
				if(file_size<=0){
					alert("您上传的文件："+file_name+"，没有内容！");
					return false;
				}else if(file_size>maxFileSize*1024*1024){
					alert("您上传的文件："+file_name+"，大小超过了"+maxFileSize+"MB！");
					return false;
				}
			}catch(e){
				alert("您上传的附件："+file_name+"，不是文件！");
				return false;
			}
			return true;
		}
		function getUploadFileName(uploadFileObj){
			var file_name = uploadFileObj.value;
			if (file_name==""){
		    	return "";
		    }
		    var indexDot = file_name.lastIndexOf('.');
	      	if(indexDot==-1){
	       		alert("您上传的文件："+file_name+"，没有扩展名！");
	        	return "";
	      	}
	      	file_name = file_name.substring(0,indexDot);
	      	var indexSlash = file_name.lastIndexOf('\\');
	      	if(indexSlash==-1){
	       		alert("您上传的文件："+file_name+"，路径不正确！");
	        	return "";
	      	}
	      	var result = file_name.substring(indexSlash+1);
	      	return result;
		}
