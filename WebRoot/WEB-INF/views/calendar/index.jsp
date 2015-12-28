<%@ page language="java" pageEncoding="UTF-8"%>
<html>
<head>
 <link href="../plugins/fullcalendar/2.5.0/jquery-ui.min.css" rel="stylesheet">
 <link href="../plugins/fullcalendar/2.5.0/fullcalendar.min.css" rel="stylesheet">
 <link href="../plugins/fullcalendar/2.5.0/fullcalendar.print.css" rel='stylesheet' media='print' >
 <script type="text/javascript" src="../plugins/fullcalendar/2.5.0/moment.min.js" ></script>
 <script type="text/javascript" src="../plugins/fullcalendar/2.5.0/jquery.min.js" ></script>
<script type="text/javascript" src="../plugins/fullcalendar/2.5.0/fullcalendar.min.js" ></script>
<script type="text/javascript" src="../plugins/fullcalendar/2.5.0/zh-cn.js" ></script>

<style>
  body {
		margin: 0;
		padding: 0;
		font-family: "Lucida Grande",Helvetica,Arial,Verdana,sans-serif;
		font-size: 14px;
	}

	#top {
		background: #eee;
		border-bottom: 1px solid #ddd;
		padding: 0 10px;
		line-height: 40px;
		font-size: 12px;
	}

	#calendar {
		max-width: 900px;
		margin: 40px auto;
		padding: 0 10px;
	}
  
</style>
</head>
<body>
<!--alert-success  alert-info alert-warning alert-danger  -->
<!-- <div class="row">
	<div  class="col-md-12">
		<div id="calendar"></div>
	</div>
</div> -->
<div id="calendar"></div>
</body>
<script type="text/javascript">
$(document).ready(function() {
	$('#calendar').fullCalendar({
		header: {
			left: 'prev,next today',
			center: 'title',
			right: 'month,agendaWeek,agendaDay'
		},
		defaultDate: '2015-12-12',
		lang: 'zh-cn',
		buttonIcons: false, // show the prev/next text
		weekNumbers: true,
		editable: true,
		eventLimit: true, // allow "more" link when too many events
		selectable: true,
		select:function (span, ev) {
			console.log(span);
			console.log(ev);
		},
		events: [
			{
				title: 'All Day Event',
				start: '2015-12-01'
			},
			{
				title: 'Long Event',
				start: '2015-12-07',
				end: '2015-12-10'
			},
			{
				id: 999,
				title: 'Repeating Event',
				start: '2015-12-09T16:00:00'
			},
			{
				id: 999,
				title: 'Repeating Event',
				start: '2015-12-16T16:00:00'
			},
			{
				title: 'Conference',
				start: '2015-12-11',
				end: '2015-12-13'
			},
			{
				title: 'Meeting',
				start: '2015-12-12T10:30:00',
				end: '2015-12-12T12:30:00'
			},
			{
				title: 'Lunch',
				start: '2015-12-12T12:00:00'
			},
			{
				title: 'Meeting',
				start: '2015-12-12T14:30:00'
			},
			{
				title: 'Happy Hour',
				start: '2015-12-12T17:30:00'
			},
			{
				title: 'Dinner',
				start: '2015-12-12T20:00:00'
			},
			{
				title: 'Birthday Party',
				start: '2015-12-13T07:00:00'
			},
			{
				title: 'Click for Google',
				url: 'http://google.com/',
				start: '2015-12-28'
			}
		]
	});
});
	 console.log('ddddddddddddddddddddd');
</script>
</html>
