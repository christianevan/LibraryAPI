const express = require("express");
const app = express();
const multer = require('multer');
const db = require('./database');
const axios = require("axios");
const joi = require('joi').extend(require('@joi/date'));
const jwt = require("jsonwebtoken");
const fs = require('fs');
require('dotenv').config();
app.use(express.urlencoded({extended:true}));



const storage=multer.diskStorage({
    destination:function(req,file,callback){
        callback(null,'./uploads');
    },
    filename:async function(req,file,callback){
        const extension = file.originalname.split('.')[file.originalname.split('.').length-1];
        let filename = "";
        if(req.body.judul){
            filename = req.body.judul + "";
        }
        if(req.body.book_id && !req.body.judul){
            let buku = await db.query(`select * from book where id = '${book_id}'`)
            buku = buku[0].judul;
            if(buku){
                filename = filename+buku;
            }
        }
        let idbuku = await db.query(`select MAX(id) from book`)
        let k = JSON.stringify(idbuku[0]);
        k = k.split(":");
        k = k[1];
        k = k.substring(0, k.length-1);
        k = parseInt(k) + 1;
        filename = filename+k+"";
        callback(null,(filename+'.'+extension));
    }
});
const checkEmail = async (email) => { 
    const user = await db.query("select * from users where email = '"+email+"'");
    if (user.length !== 0) {
        throw new Error("Email is not unique");
    }
}

const checkNumber = async (phone) => { 
    const user = await db.query("select * from users where phone =  '"+phone+"'");
    if (user.length !== 0) {
        throw new Error("Phone Number is not unique");
    }
}

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
    var nama = req.body.nama;
    var email = req.body.email;
    var dob = req.body.dob;
    var phone = req.body.phone;
    var password = req.body.password;
    const schema = 
        joi.object({
            nama:joi.string().required(),
            email:joi.string().email().external(checkEmail).required(),
            dob:joi.date().format('DD-MM-YYYY').required(),
            phone:joi.string().external(checkNumber).min(10).max(14).pattern(/^[0-9]+$/).required(),
            password:joi.string().required()
        })
    try{
        await schema.validateAsync(req.body);
    }catch(err){   
        return res.status(400).send({"message":"Field tidak sesuai ketentuan"});    
    }

    const Mailjet = require('node-mailjet')
    
    const mailjet = Mailjet.apiConnect(
        process.env.MAILJET_APIKEY,
        process.env.MAILJET_SECRET,
        {
            config:{},
            options:{}
        }
    )

    const request = mailjet
    .post("send", {'version': 'v3.1'})
    .request({
      "Messages":[
        {
          "From": {
            "Email": "berambutgimbal@gmail.com",
            "Name": "Library API"
          },
          "To": [
            {
              "Email": ""+email+"",
              "Name": "'"+nama+"'"
            }
          ],
          "Subject": "Library API Account Confirmation",
          "TextPart": "Click link below to activate your account",
          "HTMLPart": "<h3><a href='http://localhost:3000/api/email-confirm/"+email+"/'>Click Here</a>!</h3><br />",
          "CustomID": "AppGettingStartedTest"
        }
      ]
    })
    request
      .then((result) => {
        console.log(result.body)
      })
      .catch((err) => {
        console.log(err.statusCode)
      })

    await db.query(`insert into users values('0','${nama}','${email}','${dob}','${phone}','${password}','customer','aktif','unverified','0','0')`)
    return res.status(201).send({"message":"Register berhasil, silahkan cek email untuk konfirmasi"})

})

//login
app.post("/api/login",async function(req,res){
    var email = req.body.email;
    var password = req.body.password;

    var user = await db.query(`select * from users where email = '${email}'`);
    if(user.length<1){
        return res.status(404).send({"message":"Email tidak terdaftar"})
    }
    if(user[0].password!=password){
        return res.status(400).send({"message":"Password salah"})
    }
    if(user[0].email_status!="verified"){
        return res.status(400).send({"message":"Email anda belum diverifikasi, silahkan cek email anda"})
    }

    var token = jwt.sign({email:email},process.env.APP_SECRET,{expiresIn:'3h'})
    return res.status(201).send({"message":`Login berhasil, Token :${token}`})

})

//confirm email
app.get("/api/email-confirm/:email",async function(req,res){
    var email = req.params.email;
    await db.query(`update users set email_status = 'verified' where email = '${email}'`)
    return res.status(201).send({"message":"Email berhasil diverifikasi"})
})

app.post("/api/topup",async function(req,res){
    var token = req.header('x-auth-token');
    if(!req.header('x-auth-token')){
        return res.status(404).send("Unauthorized");
    }
    var userdata
    try{
        userdata = jwt.verify(token, process.env.APP_SECRET);
    }catch(err){
        return res.status(400).send("Token Expired or Invalid")
    }
    var email = userdata.email;
    
    var lama = await db.query(`select * from users where email = '${email}'`)

    try{
        var topup= parseInt(req.body.jumlah);
        var saldo=parseInt(lama[0].saldo);

    }catch(error){
        console.log(error);
    }
    var total = parseInt(saldo+topup);

    await db.query(`update users set saldo = '${total}' where email = '${email}'`)
    return res.status(201).send({"message":`Top up berhasil, saldo sekarang menjadi ${total}`})
})

app.post("/api/recharge-apihit",async function(req,res){
    var token = req.header('x-auth-token');
    if(!req.header('x-auth-token')){
        return res.status(404).send("Unauthorized");
    }
    var userdata
    try{
        userdata = jwt.verify(token, process.env.APP_SECRET);
    }catch(err){
        return res.status(400).send("Token Expired or Invalid")
    }

    var lama = await db.query(`select * from users where email = '${userdata.email}'`)
    if(parseInt(lama[0].saldo)<10000){
        return res.status(400).send({"message":"Saldo tidak mencukupi"})
    }

    var saldo = parseInt(lama[0].saldo)-10000
    var apihit = parseInt(lama[0].api_hit)+10
    await db.query(`update users set saldo= ${saldo},api_hit=${apihit} where email = '${userdata.email}'`)

    return res.status(201).send({"message":`Recharge api hit berhasil, api hit sekarang = ${apihit}, saldo sekarang = ${saldo}`})
    
})

//cari buku berdasarkan judul
app.get("/api/book/title/:judul",async function(req,res){
    var token = req.header('x-auth-token');
    if(!req.header('x-auth-token')){
        return res.status(404).send("Unauthorized");
    }
    try{
        var userdata = jwt.verify(token, process.env.APP_SECRET);
    }catch(err){
        return res.status(400).send("Token Expired or Invalid")
    }
    var title = req.params.judul;
    var books = await db.query(`select * from book where judul like '%${title}%'`);
    var temp =[];
    for (let i = 0; i < books.length; i++) {
        var status = ""
        if(books[i].status=="available"){status="Tersedia"}
        else {status="Sedang Dipinjam"}
        const a = {
            "Judul":books[i].judul,
            "Penulis":books[i].penulis,
            "Penerbit":books[i].penerbit,
            "Tanggal Terbit":books[i].tanggal_terbit,
            "Status":status,
            "Harga":books[i].harga,
        }
        temp.push(a)
    }
    return res.status(200).send(temp);
})

//cari buku berdasarkan penulis
app.get("/api/book/author/:penulis",async function(req,res){
    var token = req.header('x-auth-token');
    if(!req.header('x-auth-token')){
        return res.status(404).send("Unauthorized");
    }
    try{
        var userdata = jwt.verify(token, process.env.APP_SECRET);
    }catch(err){
        return res.status(400).send("Token Expired or Invalid")
    }
    var author = req.params.penulis;
    var books = await db.query(`select * from book where penulis like '%${author}%'`);
    var temp =[];
    for (let i = 0; i < books.length; i++) {
        var status = ""
        if(books[i].status=="available"){status="Tersedia"}
        else {status="Sedang Dipinjam"}
        const a = {
            "Judul":books[i].judul,
            "Penulis":books[i].penulis,
            "Penerbit":books[i].penerbit,
            "Tanggal Terbit":books[i].tanggal_terbit,
            "Status":status,
            "Harga":books[i].harga,
        }
        temp.push(a)
    }
    return res.status(200).send(temp);
})

//cari buku berdasarkan penerbit
app.get("/api/book/publisher/:penerbit",async function(req,res){
    var token = req.header('x-auth-token');
    if(!req.header('x-auth-token')){
        return res.status(404).send("Unauthorized");
    }
    try{
        var userdata = jwt.verify(token, process.env.APP_SECRET);
    }catch(err){
        return res.status(400).send("Token Expired or Invalid")
    }
    var publisher = req.params.penerbit;
    var books = await db.query(`select * from book where penerbit like '%${publisher}%'`);
    var temp =[];
    for (let i = 0; i < books.length; i++) {
        var status = ""
        if(books[i].status=="available"){status="Tersedia"}
        else {status="Sedang Dipinjam"}
        const a = {
            "Judul":books[i].judul,
            "Penulis":books[i].penulis,
            "Penerbit":books[i].penerbit,
            "Tanggal Terbit":books[i].tanggal_terbit,
            "Status":status,
            "Harga":books[i].harga,
        }
        temp.push(a)
    }
    return res.status(200).send(temp);
})

//cari buku berdasarkan tanggal terbit
app.get("/api/book/publish-date/:tanggal",async function(req,res){
    var token = req.header('x-auth-token');
    if(!req.header('x-auth-token')){
        return res.status(404).send("Unauthorized");
    }
    try{
        var userdata = jwt.verify(token, process.env.APP_SECRET);
    }catch(err){
        return res.status(400).send("Token Expired or Invalid")
    }
    var tanggal = req.params.tanggal;
    if(tanggal.length!=6){
        return res.status(400).send({"message":"Format tanggal salah"})
    }
    try{
        parseInt(tanggal)
    }catch(error){
        return res.status(400).send({"message":"Format tanggal salah"})
    }
    if(parseInt(tanggal.substring(0,2))<1||parseInt(tanggal.substring(0,2))>31||parseInt(tanggal.substring(2,4)<1)||parseInt(tanggal.substring(2,4))>12||parseInt(tanggal.substring(4,6))<1||parseInt(tanggal.substring(4,6)>22)){
        return res.status(400).send({"message":"Format tanggal salah"})
    }
    var tgl = tanggal.substring(0,2)+"-"+tanggal.substring(2,4)+"-20"+tanggal.substring(4,6);
    var books = await db.query(`select * from book where tanggal_terbit = '${tgl}'`);
    var temp =[];
    for (let i = 0; i < books.length; i++) {
        var status = ""
        if(books[i].status=="available"){status="Tersedia"}
        else {status="Sedang Dipinjam"}
        const a = {
            "Judul":books[i].judul,
            "Penulis":books[i].penulis,
            "Penerbit":books[i].penerbit,
            "Tanggal Terbit":books[i].tanggal_terbit,
            "Status":status,
            "Harga":books[i].harga,
        }
        temp.push(a)
    }
    return res.status(200).send(temp);
})

//PENGUNJUNG
//meminjam buku
app.post("/api/borrow",async function(req,res){
    var token = req.header('x-auth-token');
    if(!req.header('x-auth-token')){
        return res.status(404).send("Unauthorized");
    }
    try{
        var userdata = jwt.verify(token, process.env.APP_SECRET);
    }catch(err){
        return res.status(400).send("Token Expired or Invalid")
    }
})

//perpanjangan peminjaman buku
app.post("/api/borrow/extend",async function(req,res){
    var token = req.header('x-auth-token');
    if(!req.header('x-auth-token')){
        return res.status(404).send("Unauthorized");
    }
    try{
        var userdata = jwt.verify(token, process.env.APP_SECRET);
    }catch(err){
        return res.status(400).send("Token Expired or Invalid")
    }
})

//pengembalian buku
app.post("/api/borrow/return",async function(req,res){
    var token = req.header('x-auth-token');
    if(!req.header('x-auth-token')){
        return res.status(404).send("Unauthorized");
    }
    try{
        var userdata = jwt.verify(token, process.env.APP_SECRET);
    }catch(err){
        return res.status(400).send("Token Expired or Invalid")
    }
})

//PENJAGA
//tambah buku
app.post("/api/book/add", upload.single("gambar"), async function(req,res){
    var token = req.header('x-auth-token');
    if(!req.header('x-auth-token')){
        return res.status(404).send("Unauthorized");
    }
    try{
        var userdata = jwt.verify(token, process.env.APP_SECRET);
    }catch(err){
        return res.status(400).send("Token Expired or Invalid")
    }
    const schema = 
        joi.object({
            judul : joi.string().required(),
            penulis : joi.string().required(),
            penerbit : joi.string().required(),
            tanggal_terbit : joi.date().format('DD-MM-YYYY').required(),
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

        let query = `insert into book (judul , penulis, penerbit, tanggal_terbit, status, harga, gambar) values('${req.body.judul}','${req.body.penulis}', '${req.body.penerbit}', '${req.body.tanggal_terbit}', '${"available"}', '${req.body.harga}', '${tempkode}')`

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

//ubah buku tanpa gambar
app.put("/api/book/edit", async function(req,res){
    var token = req.header('x-auth-token');
    if(!req.header('x-auth-token')){
        return res.status(404).send("Unauthorized");
    }
    try{
        var userdata = jwt.verify(token, process.env.APP_SECRET);
    }catch(err){
        return res.status(400).send("Token Expired or Invalid")
    }

    const schema = 
        joi.object({
            tanggal_terbit : joi.date().format('DD-MM-YYYY').required(),
        })
    
    const {judul,penulis,penerbit,tanggal_terbit,harga,book_id,user_id} = req.body;
    let buku = await db.query(`select * from book where id = '${book_id}'`)
    buku = buku[0];
    if(!buku || !id_buku){
        return res.status(404).send({"message" : "Buku belum terdaftar atau id tidak valid!"});
    }else{
        let user = await db.query(`select * from users where id = '${user_id}'`)
        user = user[0];
        if(!user){
            return res.status(404).send({"message" : "User belum terdaftar!"});
        }else if(user.role != "librarian"){
            return res.status(400).send({"message" : "User bukan librarian!"});
        }else{
            let js = buku.judul;
            let ps = buku.penulis;
            let pns = buku.penerbit;
            let tts = buku.tanggal_terbit;
            let hs = buku.harga;
            let exc = `update book set `;
            if(judul){
                exc += `judul = '${judul}', `;
                js = judul+"";
            }
            if(penulis){
                exc += `penulis = '${penulis}', `;
                ps = penulis+"";
            }
            if(penerbit){
                exc += `penerbit = '${penerbit}', `;
                pns = penerbit+"";
            }
            if(tanggal_terbit){
                exc += `tanggal_terbit = '${tanggal_terbit}', `;
                tts = tanggal_terbit+"";
            }
            if(harga){
                exc += `harga = '${harga}', `;
                hs = harga;
            }
            exc = exc.substring(0, exc.length-2);
            exc += ` where article_image = '${temparid}' `;
            let hasil = await db.query(exc);

            return res.status(200).send({
                judul: js,
                penulis: ps,
                penerbit: pns,
                tanggal_terbit: tts,
                harga: hs,
                edited_by: user.nama
            });
        }
    }
})

//ubah buku dengan gambar
app.put("/api/book/edit", upload.single("gambar"), async function(req,res){
    var token = req.header('x-auth-token');
    if(!req.header('x-auth-token')){
        fs.unlinkSync(`${"./uploads/"+req.file.filename}`);
        return res.status(404).send("Unauthorized");
    }
    try{
        var userdata = jwt.verify(token, process.env.APP_SECRET);
    }catch(err){
        return res.status(400).send("Token Expired or Invalid")
    }
    const {judul,penulis,penerbit,tanggal_terbit,status,harga,book_id,user_id} = req.body;
    let cekgambar = req.file+"";
    let buku = await db.query(`select * from book where id = '${book_id}'`)
    buku = buku[0];
    if(!buku || !id_buku){
        return res.status(404).send({"message" : "Buku belum terdaftar atau id tidak valid!"});
    }else{
        if(cekgambar!="undefined"){
            let user = await db.query(`select * from users where id = '${user_id}'`)
            user = user[0];
            if(!user){
                return res.status(404).send({"message" : "User belum terdaftar!"});
            }else if(user.role != "librarian"){
                return res.status(400).send({"message" : "User bukan librarian!"});
            }else{
                temparid = buku.gambar;

            }
        }
    }
})

//hapus buku
app.delete("/api/book/delete",async function(req,res){
    var token = req.header('x-auth-token');
    if(!req.header('x-auth-token')){
        return res.status(404).send("Unauthorized");
    }
    try{
        var userdata = jwt.verify(token, process.env.APP_SECRET);
    }catch(err){
        return res.status(400).send("Token Expired or Invalid")
    }
})

//confirm peminjaman buku
app.post("/api/borrow/confirm",async function(req,res){
    var token = req.header('x-auth-token');
    if(!req.header('x-auth-token')){
        return res.status(404).send("Unauthorized");
    }
    try{
        var userdata = jwt.verify(token, process.env.APP_SECRET);
    }catch(err){
        return res.status(400).send("Token Expired or Invalid")
    }
})

//lihat daftar peminjaman buku
app.get("/api/borrow",async function(req,res){
    var token = req.header('x-auth-token');
    if(!req.header('x-auth-token')){
        return res.status(404).send("Unauthorized");
    }
    try{
        var userdata = jwt.verify(token, process.env.APP_SECRET);
    }catch(err){
        return res.status(400).send("Token Expired or Invalid")
    }
    let peminjaman = await db.query(`select * from borrow where true`);
    return res.status(200).send({
        daftar_peminjaman : peminjaman
    });
})

//denda pengunjung yang telat mengembalikan buku
app.post("/api/borrow/charge",async function(req,res){
    var token = req.header('x-auth-token');
    if(!req.header('x-auth-token')){
        return res.status(404).send("Unauthorized");
    }
    try{
        var userdata = jwt.verify(token, keprocess.env.APP_SECRETy);
    }catch(err){
        return res.status(400).send("Token Expired or Invalid")
    }
})

//ADMIN
//mengubah role pengunjung menjadi penjaga
app.put("/api/user/role",async function(req,res){
    var token = req.header('x-auth-token');
    if(!req.header('x-auth-token')){
        return res.status(404).send("Unauthorized");
    }
    try{
        var userdata = jwt.verify(token, process.env.APP_SECRET);
    }catch(err){
        return res.status(400).send("Token Expired or Invalid")
    }
})

//ban kepada user
app.post("/api/user/ban",async function(req,res){
    var token = req.header('x-auth-token');
    if(!req.header('x-auth-token')){
        return res.status(404).send("Unauthorized");
    }
    try{
        var userdata = jwt.verify(token, process.env.APP_SECRET);
    }catch(err){
        return res.status(400).send("Token Expired or Invalid")
    }
})

app.listen(3000, () => { console.log("server running on port 3000") });