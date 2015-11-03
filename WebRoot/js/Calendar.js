function DateLinkMapping(date, link,aClass) {
    this.Date = date;
    this.Link = link;
    this.AClass = aClass;
    
}
var Calendar = {
    settings:
            {
                firstDayOfWeek: 1,
                baseClass: "calendar",
                curDayClass: "curDay",
                prevMonthCellClass: "prevMonth",
                nextMonthCellClass: "nextMonth",
                curMonthNormalCellClass: "curMonthNormalCellClass",
                prevNextMonthDaysVisible: true
            },
    containerId: "",
    weekDayNames: [],
    dateLinkMappings: [],
    Init: function(weekDayNames, dateLinkMappings, settings) {
        if (!weekDayNames || weekDayNames.length && weekDayNames.length != 7) {
            this.weekDayNames[1] = "星期一";
            this.weekDayNames[2] = "星期二";
            this.weekDayNames[3] = "星期三";
            this.weekDayNames[4] = "星期四";
            this.weekDayNames[5] = "星期五";
            this.weekDayNames[6] = "星期六";
            this.weekDayNames[7] = "星期日";
        }
        else {
            this.weekDayNames = weekDayNames;
        }
        if (dateLinkMappings) {
            this.dateLinkMappings = dateLinkMappings;
        }
    },
    RenderCalendar: function(divId, month, year) {
        this.containerId = divId;
        var ht = [];

        ht.push("<table class='", this.settings.baseClass, "' cellspacing='0' cellpadding='0' border='0'>");
        ht.push(this._RenderTitle(month, year));
        ht.push(this._RenderBody(month, year));
        ht.push("</table>");

        document.getElementById(divId).innerHTML = ht.join("");
        this._InitEvent(divId, month, year);
    },
    _RenderTitle: function(month, year) {
        var ht = [];
        //日期
        ht.push("<tr class='cbj'>");
        ht.push("<th colspan='7' style='width:100%;'>" +
        		"<div class='prev_calender' id='", this.containerId, "_prevMonth' title='上一月'><</div>" +
        		"<div class='prev_calender' id='", this.containerId, "_prevYear' title='上一年'><<</div>" +
        		"<div class='now_calender'>", year, "年", month, "月</div>" +
        		"<div class='next_calender' id='", this.containerId, "_nextMonth' title='下一月'>></div>" +
        		"<div class='next_calender' id='", this.containerId, "_nextYear' title='下一年'>>></div>" +
        		"</th>");
        ht.push("</tr>");
        //星期
        ht.push("<tr>");
        for (var i = 0; i < 7; i++) {
            var day = (i + this.settings.firstDayOfWeek) == 7 ? 7 : (i + this.settings.firstDayOfWeek) % 7;
            ht.push("<th>", this.weekDayNames[day], "</th>");
        }
        ht.push("</tr>");
        return ht.join("");
    },
    _RenderBody: function(month, year) {
        var date = new Date(year, month - 1, 1);
        var day = date.getDay();
        var dayOfMonth = 1;
        var daysOfPrevMonth = (7 - this.settings.firstDayOfWeek + day) % 7;
        var totalDays = this._GetTotalDays(month, year);
        var totalDaysOfPrevMonth = this._GetToalDaysOfPrevMonth(month, year);
        var ht = [];
        var curDate;

        for (var i = 0; ; i++) {
            curDate = null;
            if (i % 7 == 0) {//新起一行
                ht.push("<tr>");
            }
            ht.push("<td>");
            ht.push("<a ");
            if (i >= daysOfPrevMonth && dayOfMonth <= totalDays) {//本月
                curDate = new Date(year, month - 1, dayOfMonth);
                if (Date.parse(new Date().toDateString()) - curDate == 0) {
                    ht.push(" class='", this.settings.curDayClass, " ");
                }
                else {
                    ht.push(" class='", this.settings.curMonthNormalCellClass, " ");
                }
                dayOfMonth++;

            }
            else if (i < daysOfPrevMonth) {//上月
                if (this.settings.prevNextMonthDaysVisible) {
                    var prevMonth = month;
                    var prevYear = year;
                    if (month == 1) {
                        prevMonth = 12;
                        prevYear = prevYear - 1;
                    }
                    else {
                        prevMonth = prevMonth - 1;
                    }
                    curDate = new Date(prevYear, prevMonth - 1, totalDaysOfPrevMonth - (daysOfPrevMonth - i - 1));
                    if (Date.parse(new Date().toDateString()) - curDate == 0) {
                        ht.push(" class='", this.settings.curDayClass, " ");
                    }else{
                    	ht.push(" class='", this.settings.prevMonthCellClass, " ");
                    }
                }
            }
            else {//下月
                if (this.settings.prevNextMonthDaysVisible) {
                    var nextMonth = month;
                    var nextYear = year;
                    if (month == 12) {
                        nextMonth = 1;
                        nextYear = nextYear + 1;
                    }
                    else {
                        nextMonth = nextMonth + 1;
                    }
                    curDate = new Date(nextYear, nextMonth - 1, i - dayOfMonth - daysOfPrevMonth + 2);
                    if (Date.parse(new Date().toDateString()) - curDate == 0) {
                        ht.push(" class='", this.settings.curDayClass, " ");
                    }else{
                    	ht.push(" class='", this.settings.nextMonthCellClass, " ");
                    }
                }
            }
            ht.push(this._BuildCell(curDate));
            ht.push("</td>");
            if (i % 7 == 6) {//结束一行
                ht.push("</tr>");
            }
            if (i % 7 == 6 && dayOfMonth - 1 >= totalDays) {
                break;
            }
        }
        return ht.join("");
    },
    _BuildCell: function(curDate) {
        var ht = [];
        if (curDate) {
            for (var j = 0; j < this.dateLinkMappings.length; j++) {
                if (Date.parse(this.dateLinkMappings[j].Date) - curDate == 0) {
                    ht.push(this.dateLinkMappings[j].AClass,"' href='", this.dateLinkMappings[j].Link, "'>",curDate.getDate(),"</a>");
                    break;
                }
            }
            if (j == this.dateLinkMappings.length) {
                ht.push("'>",curDate.getDate(),"</a>");
            }
        }
        else {
            ht.push("'>&nbsp;</a>");
        }
        return ht.join("");
    },
    _InitEvent: function(divId, month, year) {
		
        var t = this;
        document.getElementById(this.containerId + "_prevMonth").style.cursor = "pointer";
        document.getElementById(this.containerId + "_nextMonth").style.cursor = "pointer";

        document.getElementById(this.containerId + "_prevMonth").onclick = function() {
            if (month == 1) {
                month = 12;
                year = year - 1;
            }
            else {
                month = month - 1;
            }
            //t.RenderCalendar(divId, month, year);放到前面去执行
			onCalendarChange(divId, month, year);
        };
        document.getElementById(this.containerId + "_nextMonth").onclick = function() {
            if (month == 12) {
                month = 1;
                year = year + 1;
            }
            else {
                month = month + 1;
            }
            //t.RenderCalendar(divId, month, year);
			onCalendarChange(divId, month, year);
        };
		
		document.getElementById(this.containerId + "_prevYear").onclick = function() {
            year = year - 1;
           // t.RenderCalendar(divId, month, year);
			onCalendarChange(divId, month, year);
        };
        document.getElementById(this.containerId + "_nextYear").onclick = function() {
            year = year + 1;
           // t.RenderCalendar(divId, month, year);
			onCalendarChange(divId, month, year);
        };
		
    },
    //计算指定月的总天数
    _GetTotalDays: function(month, year) {
        if (month == 2) {
            if (this._IsLeapYear(year)) {
                return 29;
            }
            else {
                return 28;
            }
        }
        else if (month == 4 || month == 6 || month == 9 || month == 11) {
            return 30;
        }
        else {
            return 31;
        }
    },
    _GetToalDaysOfPrevMonth: function(month, year) {
        if (month == 1) {
            month = 12;
            year = year - 1;
        }
        else {
            month = month - 1;
        }
        return this._GetTotalDays(month, year);
    },
    //判断是否是闰年
    _IsLeapYear: function(year) {
        return year % 400 == 0 || (year % 4 == 0 && year % 100 != 0);
    }
};