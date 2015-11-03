

function checkUploadImage(paramValue){
	var filepath=formatStr(paramValue);
	 if(filepath!=null&&filepath!=''){
	 	try{
	 		document.getElementById('stuImageURL').src = filepath;
	 	}catch(e){
	 	}
		var extname = filepath.substring(filepath.lastIndexOf(".")+1,filepath.length);
		    extname = extname.toLowerCase();//处理了大小写
		    if(extname== "bmp"||extname== "jpg"||extname=="gif"||extname=="gpeg"||extname=="png"){
			    return  true;
		    }else{
		    	 alert("只能上传bmp,jpg,gif,gpeg,png格式的图片");
		    	return false;
		    }
	}
  return true;
}

