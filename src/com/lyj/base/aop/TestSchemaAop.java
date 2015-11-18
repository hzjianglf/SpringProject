package com.lyj.base.aop;


public class TestSchemaAop {
	
	public void before(){
		System.out.println("before");
	}
	
	public void afterReturning(Object object) throws Throwable {
		System.out.println("after returning");
		System.out.println(object);
		
	}
	
	public void afterThrowing(Object object) throws Throwable {
		System.out.println("after throwing");
		System.out.println(object);
	}
	
	
	public void after() throws Throwable {
		System.out.println("after finally");
	}

 
}
