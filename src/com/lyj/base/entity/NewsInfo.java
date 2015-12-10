 package com.lyj.base.entity;
 
 import java.io.Serializable;

import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.GeneratedValue;
import javax.persistence.GenerationType;
import javax.persistence.Id;
import javax.persistence.Table;
 
 @Entity
 @Table(name="news_Info", catalog="oschina")
 public class NewsInfo  implements Serializable
 {
	private static final long serialVersionUID = 1L;
	private Integer id;
    private String title;//标题
    private String content;//内容 
    private String  imgUrl;//图片url
    private String  contentUrl;//内容地址
  
   @Id
   @GeneratedValue(strategy=GenerationType.IDENTITY)
   @Column(name="id", unique=true, nullable=false)
   public Integer getId()
   {
     return this.id;
   }
   
   public void setId(Integer id)
   {
     this.id = id;
   }
   
   @Column(name="title")
   public String getTitle()
   {
     return this.title;
   }
   
   public void setTitle(String title)
   {
     this.title = title;
   }
   @Column(name="content")
	public String getContent() {
		return content;
	}
	
	public void setContent(String content) {
		this.content = content;
	}
	@Column(name="imgUrl")
	public String getImgUrl() {
		return imgUrl;
	}
	
	public void setImgUrl(String imgUrl) {
		this.imgUrl = imgUrl;
	}
	@Column(name="contentUrl")
	public String getContentUrl() {
		return contentUrl;
	}
	
	public void setContentUrl(String contentUrl) {
		this.contentUrl = contentUrl;
	}
   
   
 }
 