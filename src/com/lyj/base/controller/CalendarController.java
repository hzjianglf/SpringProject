package com.lyj.base.controller;

import java.util.List;

import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseBody;

import com.lyj.base.entity.NewsInfo;
import com.lyj.base.service.CalendarService;
import com.lyj.base.service.NewsService;
@Controller
@RequestMapping(value="/calendar")
public class CalendarController {
	 private CalendarService calendarService;
	 
	 @RequestMapping(value="/index")
		public String index(HttpServletRequest request,
				HttpServletResponse response)throws Exception{
			return "/views/calendar/index";
		}
	 @RequestMapping(value="/list")
	 @ResponseBody
	 public List<NewsInfo> list(HttpServletRequest request,HttpServletResponse response, Model model){
		 List<NewsInfo> newsInfoList= calendarService.list(NewsInfo.class);
		  
		 return newsInfoList;
	 }
	 
	 
	
}