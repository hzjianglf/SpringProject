package com.xs.demo.shiro;
import javax.servlet.ServletRequest;
import javax.servlet.ServletResponse;

import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;
import org.apache.shiro.authc.AuthenticationToken;
import org.apache.shiro.subject.Subject;
import org.apache.shiro.web.filter.authc.FormAuthenticationFilter;
import org.apache.shiro.web.util.WebUtils;
public class MyFormAuthenticationFilter extends FormAuthenticationFilter{
	private static Log log = LogFactory.getLog(MyFormAuthenticationFilter.class);
	@Override
	protected boolean onLoginSuccess(AuthenticationToken token,
			Subject subject, ServletRequest request, ServletResponse response)
			throws Exception {
		 WebUtils.issueRedirect(request, response, getSuccessUrl());
		 
 //   super.onLoginSuccess(token, subject, request, response);
		return false;
	}
}