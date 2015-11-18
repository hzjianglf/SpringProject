package com.lyj.base.aop;

import java.lang.reflect.Method;

import org.springframework.aop.ThrowsAdvice;

public class AfterThrow implements ThrowsAdvice{

	public void afterThrowing(Exception e){
		System.out.println("==================");
		e.printStackTrace();
		System.out.println("------------------");
	}
	
	public void afterThrowing(Method m, Object[] args, Object target, Exception e){
		System.out.println("afterThrowing advice begin...");
		System.out.println(m);
		System.out.println(args);
		System.out.println(target);
		e.printStackTrace();
		System.out.println("afterThrowing advice end...");
	}
	
	
}
