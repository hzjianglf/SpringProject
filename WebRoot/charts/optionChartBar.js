/*折线图 柱状图混合图  */
function optionChartBar(){
			option = {
			    tooltip : {
			        trigger: 'axis'
			    },
			    toolbox: {
			        show : true,
			        feature : {
			            mark : {show: true},
			            dataView : {show: true, readOnly: false},
			            magicType: {show: true, type: ['line', 'bar']},
			            restore : {show: true},
			            saveAsImage : {show: true}
			        }
			    },
			    calculable : true,
			    legend: {
			        data:['蒸发量','降水量','平均温度']
			    },
			    xAxis : [
			        {
			            type : 'category',
			            data : ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月']
			        }
			    ],
			    yAxis : [
			        
			        {
			            type : 'value',
			            position:'left',//设置纵坐标位置  默认为  'left' 可选 'right','top'
			            name : '温度',
			            axisLabel : {
			                formatter: '{value} °C'
			            }
			        },{
			            type : 'value',
			            name : '水量',
			            show:false,//是否显示纵坐标
			            axisLabel : {
			                formatter: '{value} ml'
			            }
			        }
			    ],
			    series : [
			
			        {
			            name:'蒸发量',
			            type:'bar',
			            yAxisIndex: 1,//设置使用哪个纵坐标  默认是0   
			            data:[2.0, 4.9, 7.0, 23.2, 25.6, 76.7, 135.6, 162.2, 32.6, 20.0, 6.4, 3.3]
			        },
			        {
			            name:'降水量',
			            type:'bar',
			            yAxisIndex: 1,//设置使用哪个纵坐标  默认是0   
			            data:[2.6, 5.9, 9.0, 26.4, 28.7, 70.7, 175.6, 182.2, 48.7, 18.8, 6.0, 2.3]
			        },
			        {
			            name:'平均温度',
			            type:'line',
			            yAxisIndex: 0,//设置使用哪个纵坐标  默认是0   
			            data:[2.0, 2.2, 3.3, 4.5, 6.3, 10.2, 20.3, 23.4, 23.0, 16.5, 12.0, 6.2]
			        }
			    ]
			};
	return option;
}
                    