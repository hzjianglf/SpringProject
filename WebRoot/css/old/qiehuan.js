function qiehuan(num,length){
	 for(var id = 0;id<=length;id++)
		   {
		     if(id==num)
			{
				document.getElementById("mynav"+id).className="timu_on";
				
			}
			else
	       {
				document.getElementById("mynav"+id).className="timu_off";
			}
		}
	}
	
function class_qiehuan(num,length){
	 for(var id = 0;id<=length;id++)
		   {
		     if(id==num)
			{   
				
				document.getElementById("class_mynav"+id).className="class_timu_on";
				
			}
			else
	       {    
				document.getElementById("class_mynav"+id).className="class_timu_off";
			}
		}
	}
	
function sc_qiehuan(num,length){
	 for(var id = 0;id<=length;id++)
		{
		   
			if(id==num)
			{   
				document.getElementById("sc_qh_con"+id).style.display="block";
				document.getElementById("sc_mynav"+id).className="sc_timu_on";
				
			}
			else
	  		 {
				document.getElementById("sc_qh_con"+id).style.display="none";
				document.getElementById("sc_mynav"+id).className="sc_timu_off";
			}
		}
	}
	
		