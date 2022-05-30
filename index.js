const express = require("express");
const app = express();
const multer = require('multer');
const db = require('./database');
const axios = require("axios");
const joi = require('joi').extend(require('@joi/date'));
const jwt = require("jsonwebtoken");
const fs = require('fs');
app.use(express.urlencoded({extended:true}));
const upload = multer({ dest: "uploads/" });

//register
app.post("/api/register",async function(req,res){

})

//login
app.post("/api/login",async function(req,res){

})

//confirm email
app.post("/api/email-confirm",async function(req,res){

})

//cari buku berdasarkan judul
app.get("/api/book/title/:judul",async function(req,res){

})

//cari buku berdasarkan penulis
app.get("/api/book/author/:penulis",async function(req,res){

})

//cari buku berdasarkan penerbit
app.get("/api/book/publisher/:penerbit",async function(req,res){
    
})

//cari buku berdasarkan tanggal terbit
app.get("/api/book/publish-date/:tanggal",async function(req,res){
    
})

//PENGUNJUNG
//meminjam buku
app.post("/api/borrow",async function(req,res){
    
})

//perpanjangan peminjaman buku
app.post("/api/borrow/extend",async function(req,res){

})

//pengembalian buku
app.post("/api/borrow/return",async function(req,res){
    
})

//PENJAGA
//tambah buku
app.post("/api/book/add",async function(req,res){

})

//ubah buku
app.put("/api/book/edit",async function(req,res){

})

//hapus buku
app.delete("/api/book/delete",async function(req,res){

})

//confirm peminjaman buku
app.post("/api/borrow/confirm",async function(req,res){

})

//lihat daftar peminjaman buku
app.get("/api/borrow",async function(req,res){

})

//denda pengunjung yang telat mengembalikan buku
app.post("/api/borrow/charge",async function(req,res){

})

//ADMIN
//mengubah role pengunjung menjadi penjaga
app.put("/api/user/role",async function(req,res){

})

//ban kepada user
app.post("/api/user/ban",async function(req,res){
    
})