package com.xs.demo.service;

import java.io.Serializable;
import java.util.List;

import com.xs.demo.dao.BaseDao;


/**
 * SpringMVC+Hibernate +MySql+ EasyUI ---CRUD
 * service层的共有父类，提供了简单的增删改查。
 * 
 *
 */
public class BaseService {

	BaseDao baseDao;
	
	
	/**
	 * 根据主键，返回实体
	 * @param id 主键
	 * @return	实体或空（如果没有查到）
	 */
	public <T> T get(Class<T> entityClass, Serializable id){
		return baseDao.get(entityClass, id);
	}
	
	/**
	 * 保存实体对象，返回主键
	 * @param model
	 * @return
	 */
	public Serializable save(Object model){
		return baseDao.save(model);
	}
	
	/**
	 * 更新实体对象，不返回值
	 * @param entity
	 */
	public void update(Object model){
		baseDao.update(model);
	}
	
	
	/**
	 * 保存或更新
	 * @param model 实体类
	 */
    public void saveOrUpdate(Object model) {
    	baseDao.saveOrUpdate(model);
    }
	/**
	 * 删除指定对象，不返回值
	 * @param model
	 */
	public void delete(Object model){
		baseDao.delete(model);
	}
	
	/**
	 * 查出所有对象
	 * @param entityClass
	 * @return
	 */
	public <T> List<T> list(Class<T> entityClass){
		return baseDao.list(entityClass);
	}

	/**
	 * 统计所有对象个数
	 * @param entityClass
	 * @return
	 */
	public int count(Class<?> entityClass){
		return baseDao.count(entityClass);
	}
	
	
	public BaseDao getBaseDao() {
		return baseDao;
	}

	public void setBaseDao(BaseDao baseDao) {
		this.baseDao = baseDao;
	}
}
