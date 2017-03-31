/*
SQLyog v10.2 
MySQL - 5.0.13-rc-nt : Database - oschina
*********************************************************************
*/


/*!40101 SET NAMES utf8 */;

/*!40101 SET SQL_MODE=''*/;

/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;
CREATE DATABASE /*!32312 IF NOT EXISTS*/`oschina` /*!40100 DEFAULT CHARACTER SET utf8 */;

USE `oschina`;

/*Table structure for table `menu_info` */

DROP TABLE IF EXISTS `menu_info`;

CREATE TABLE `menu_info` (
  `id` int(11) NOT NULL auto_increment,
  `menu_desc` varchar(255) default NULL COMMENT '菜单名称',
  `menu_order` int(11) default NULL COMMENT '菜单顺序',
  `menu_url` varchar(255) default NULL COMMENT '菜单url',
  `parent_id` int(11) default NULL COMMENT '父菜单ID',
  `type` int(11) default NULL COMMENT '0:非菜单1:一级菜单2:二级菜单',
  `class_name` varchar(11) default NULL,
  PRIMARY KEY  (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

/*Data for the table `menu_info` */

insert  into `menu_info`(`id`,`menu_desc`,`menu_order`,`menu_url`,`parent_id`,`type`) values (1,'用户管理',1,'user/index',0,1);
insert  into `menu_info`(`id`,`menu_desc`,`menu_order`,`menu_url`,`parent_id`,`type`) values (2,'测试界面',2,NULL,0,0);
insert  into `menu_info`(`id`,`menu_desc`,`menu_order`,`menu_url`,`parent_id`,`type`) values (3,'图表测试',3,'charts/test.html',2,2);
insert  into `menu_info`(`id`,`menu_desc`,`menu_order`,`menu_url`,`parent_id`,`type`) values (4,'投票测试',4,'voteyouth/vote.html',2,2);
insert  into `menu_info`(`id`,`menu_desc`,`menu_order`,`menu_url`,`parent_id`,`type`) values (5,'第三层1',5,'ddd',3,2);
insert  into `menu_info`(`id`,`menu_desc`,`menu_order`,`menu_url`,`parent_id`,`type`) values (6,'菜单管理',6,'menuTree/yibushueasyui.jsp',0,1);
insert  into `menu_info`(`id`,`menu_desc`,`menu_order`,`menu_url`,`parent_id`,`type`) values (7,'角色管理',7,'role/index',0,1);

/*Table structure for table `role_info` */

DROP TABLE IF EXISTS `role_info`;

CREATE TABLE `role_info` (
  `id` int(11) NOT NULL auto_increment,
  `name` varchar(255) default NULL,
  PRIMARY KEY  (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

/*Data for the table `role_info` */

insert  into `role_info`(`id`,`name`) values (4,'管理员');
insert  into `role_info`(`id`,`name`) values (5,'观察员');
insert  into `role_info`(`id`,`name`) values (6,'系统管理员');

/*Table structure for table `role_menu` */

DROP TABLE IF EXISTS `role_menu`;

CREATE TABLE `role_menu` (
  `id` int(11) NOT NULL auto_increment,
  `menu_id` int(11) default NULL,
  `role_id` int(11) default NULL,
  PRIMARY KEY  (`id`),
  KEY `FK_7rxvs31cvfu9c37qxnag4ris8` (`menu_id`),
  KEY `FK_r6o1lqlask5jahtkqv3w8sbeh` (`role_id`),
  CONSTRAINT `FK_7rxvs31cvfu9c37qxnag4ris8` FOREIGN KEY (`menu_id`) REFERENCES `menu_info` (`id`),
  CONSTRAINT `FK_r6o1lqlask5jahtkqv3w8sbeh` FOREIGN KEY (`role_id`) REFERENCES `role_info` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

/*Data for the table `role_menu` */

insert  into `role_menu`(`id`,`menu_id`,`role_id`) values (15,1,4);
insert  into `role_menu`(`id`,`menu_id`,`role_id`) values (16,2,4);
insert  into `role_menu`(`id`,`menu_id`,`role_id`) values (17,3,4);
insert  into `role_menu`(`id`,`menu_id`,`role_id`) values (18,5,4);
insert  into `role_menu`(`id`,`menu_id`,`role_id`) values (19,4,4);
insert  into `role_menu`(`id`,`menu_id`,`role_id`) values (20,3,5);
insert  into `role_menu`(`id`,`menu_id`,`role_id`) values (21,5,5);
insert  into `role_menu`(`id`,`menu_id`,`role_id`) values (22,1,6);
insert  into `role_menu`(`id`,`menu_id`,`role_id`) values (23,2,6);
insert  into `role_menu`(`id`,`menu_id`,`role_id`) values (24,3,6);
insert  into `role_menu`(`id`,`menu_id`,`role_id`) values (25,5,6);
insert  into `role_menu`(`id`,`menu_id`,`role_id`) values (26,4,6);

/*Table structure for table `user_info` */

DROP TABLE IF EXISTS `user_info`;

CREATE TABLE `user_info` (
  `id` int(11) NOT NULL auto_increment,
  `address` varchar(255) default NULL,
  `age` int(11) default NULL,
  `birthday` datetime default NULL,
  `name` varchar(255) default NULL,
  `password` varchar(255) default NULL,
  PRIMARY KEY  (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

/*Data for the table `user_info` */

insert  into `user_info`(`id`,`address`,`age`,`birthday`,`name`,`password`) values (1,'北京',1,'2015-11-17 18:19:41','张三','888888');
insert  into `user_info`(`id`,`address`,`age`,`birthday`,`name`,`password`) values (2,'dd',18,'2015-11-18 14:00:20','dddd','888888');
insert  into `user_info`(`id`,`address`,`age`,`birthday`,`name`,`password`) values (3,'北京',18,'2015-11-20 16:25:22','北京','888888');
insert  into `user_info`(`id`,`address`,`age`,`birthday`,`name`,`password`) values (4,'版本',18,'2015-11-23 15:04:28','得到','888888');

/*Table structure for table `user_role` */

DROP TABLE IF EXISTS `user_role`;

CREATE TABLE `user_role` (
  `id` int(11) NOT NULL auto_increment,
  `role_id` int(11) default NULL,
  `user_id` int(11) default NULL,
  PRIMARY KEY  (`id`),
  KEY `FK_it77eq964jhfqtu54081ebtio` (`role_id`),
  KEY `FK_apcc8lxk2xnug8377fatvbn04` (`user_id`),
  CONSTRAINT `FK_apcc8lxk2xnug8377fatvbn04` FOREIGN KEY (`user_id`) REFERENCES `user_info` (`id`),
  CONSTRAINT `FK_it77eq964jhfqtu54081ebtio` FOREIGN KEY (`role_id`) REFERENCES `role_info` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;

/*Data for the table `user_role` */

insert  into `user_role`(`id`,`role_id`,`user_id`) values (8,5,2);
insert  into `user_role`(`id`,`role_id`,`user_id`) values (9,6,1);

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;
