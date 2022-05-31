/*
SQLyog Ultimate v12.5.1 (64 bit)
MySQL - 10.4.22-MariaDB : Database - soa_proyek
*********************************************************************
*/

/*!40101 SET NAMES utf8 */;

/*!40101 SET SQL_MODE=''*/;

/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;
CREATE DATABASE /*!32312 IF NOT EXISTS*/`soa_proyek` /*!40100 DEFAULT CHARACTER SET utf8mb4 */;

USE `soa_proyek`;

/*Table structure for table `book` */

DROP TABLE IF EXISTS `book`;

CREATE TABLE `book` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `judul` varchar(50) DEFAULT NULL,
  `penulis` varchar(50) DEFAULT NULL,
  `penerbit` varchar(50) DEFAULT NULL,
  `tanggal_terbit` varchar(12) DEFAULT NULL,
  `status` varchar(10) DEFAULT NULL,
  `harga` int(11) DEFAULT NULL,
  `gambar` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4;

/*Data for the table `book` */

insert  into `book`(`id`,`judul`,`penulis`,`penerbit`,`tanggal_terbit`,`status`,`harga`,`gambar`) values 
(1,'Menggapai Pelangi','Siti Nurbaya','PT Matahari','12-05-2015','available',50000,NULL);

/*Table structure for table `borrow` */

DROP TABLE IF EXISTS `borrow`;

CREATE TABLE `borrow` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `id_user` int(11) DEFAULT NULL,
  `id_buku` int(11) DEFAULT NULL,
  `tanggal_pinjam` varchar(12) DEFAULT NULL,
  `tanggal_pengembalian` varchar(12) DEFAULT NULL,
  `status` varchar(10) DEFAULT NULL,
  `durasi` int(5) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4;

/*Data for the table `borrow` */

insert  into `borrow`(`id`,`id_user`,`id_buku`,`tanggal_pinjam`,`tanggal_pengembalian`,`status`,`durasi`) values 
(1,1,1,'30-05-2022','15-06-2022','returned',30);

/*Table structure for table `users` */

DROP TABLE IF EXISTS `users`;

CREATE TABLE `users` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `nama` varchar(50) DEFAULT NULL,
  `email` varchar(100) DEFAULT NULL,
  `dob` varchar(12) DEFAULT NULL,
  `phone` varchar(15) DEFAULT NULL,
  `password` varchar(30) DEFAULT NULL,
  `role` varchar(10) DEFAULT NULL,
  `status` varchar(10) DEFAULT NULL,
  `email_status` varchar(10) DEFAULT NULL,
  `api_hit` int(11) DEFAULT NULL,
  `saldo` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4;

/*Data for the table `users` */

insert  into `users`(`id`,`nama`,`email`,`dob`,`phone`,`password`,`role`,`status`,`email_status`,`api_hit`,`saldo`) values 
(1,'bambang','bambang@gmail.com','12-03-2000','0812341234','abcd','admin','aktif','verified',100,1000000),
(2,'siti','siti@gmail.com','05-05-2002','0832341234','abcd','librarian','aktif','verified',100,100000),
(3,'adi','adi@gmail.com','07-03-2005','0822341234','abcd','customer','aktif','verified',50,100000);

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;
