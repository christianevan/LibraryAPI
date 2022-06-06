const express = require("express");
const app = express();
const multer = require('multer');
const db = require('./database');
const axios = require("axios");
const joi = require('joi').extend(require('@joi/date'));
const jwt = require("jsonwebtoken");
const fs = require('fs');
app.use(express.urlencoded({extended:true}));

const storage=multer.diskStorage({
    destination:function(req,file,callback){
        callback(null,'./uploads');
    },
    filename:async function(req,file,callback){
        const extension = file.originalname.split('.')[file.originalname.split('.').length-1];
        let size =  await db.query(`select count(*) as size from book`);
        size = size[0].size+""
        size = parseInt(size) + 1;
        let kode = "T" + (size+"").padStart(3, "0");
        const filename = kode;
        callback(null,(filename+'.'+extension));
    }
});

function checkFileType(file,cb){
    const filetypes= /jpeg|jpg|png/;
    const extname=filetypes.test(file.originalname.split('.')[file.originalname.split('.').length-1]);
    const mimetype=filetypes.test(file.mimetype);
    if(mimetype && extname){
        return cb(null,true);
    }else{
        cb(error = 'Error : file harus bertipe jgp,jpeg,png!');
    }
}

const upload=multer({
    storage:storage,
    fileFilter: function(req,file,cb){
        checkFileType(file,cb);
    }
});

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
app.post("/api/book/add", upload.single("gambar"), async function(req,res){
    const schema = 
        joi.object({
            judul : joi.string().required(),
            penulis : joi.string().required(),
            penerbit : joi.string().required(),
            tanggal_terbit : joi.date().format('DD/MM/YYYY').required(),
            harga : joi.number().required(),
            user_id : joi.string().required()
        })

        // NB : hati-hati untuk penggunaan min() max() , kalau di depannya ada string() , dianggap length nya , kalau ada number() dianggap valuenya 

    try {
        await schema.validateAsync(req.body);
    } catch (error) {
        return res.status(403).send(error.toString());
    }

    let user = await db.query(`select * from users where id = '${req.body.user_id}'`)
    user = user[0];
    if(!user){
        return res.status(404).send({"message" : "User belum terdaftar!"});
    }else if(user.role != "librarian"){
        return res.status(400).send({"message" : "User bukan librarian!"});
    }else{
        let tempkode = './uploads/'+req.file.filename;

        let query = `insert into book (judul , penulis, penerbit, tanggal_terbit, status, harga, gambar) values('${req.body.judul}','${req.body.penulis}', '${req.body.penerbit}', '${req.body.tanggal_terbit}', '${"available"}', '${req.body.harga}', '${tempkode}') `

        let hasil = await db.query(query);

        let book = {
            judul: req.body.judul,
            penulis: req.body.penulis,
            penerbit: req.body.penerbit,
            tanggal_terbit: req.body.tanggal_terbit,
            status: "available",
            harga: req.body.harga,
            gambar: tempkode
        }

        return res.status(200).send(book)
    }
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

app.listen(3000, () => { console.log("server running on port 3000") });