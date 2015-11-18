package com.lyj.base.aop;

import java.lang.reflect.Method;

import org.springframework.aop.AfterReturningAdvice;

public class AfterReturn implements AfterReturningAdvice {

	@Override
	public void afterReturning(Object returnValue, Method method,
			Object[] args, Object target) throws Throwable {
		System.out.println("afterReturning advice begin...");
		System.out.println(returnValue);
		System.out.println(method);
		System.out.println(args);
		System.out.println(target);
		System.out.println("afterRetruning advice end...");
		
	}

}
