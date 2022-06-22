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

app.get("/",function(req,res){
    return res.status(200).send("Hello")
})
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
        "6ffa4af1cc0c91966ef2efaef0be93c4",
        "c502c62995657917cd7d1e09af73ba0c",
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

    var token = jwt.sign({email:email},"inisecretproyeksoa",{expiresIn:'3h'})
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
        userdata = jwt.verify(token, "inisecretproyeksoa");
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
        userdata = jwt.verify(token, "inisecretproyeksoa");
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
        var userdata = jwt.verify(token, "inisecretproyeksoa");
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
            "judul":books[i].judul,
            "penulis":books[i].penulis,
            "penerbit":books[i].penerbit,
            "tanggal_terbit":books[i].tanggal_terbit,
            "status":status,
            "harga":books[i].harga,
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
        var userdata = jwt.verify(token, "inisecretproyeksoa");
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
            "judul":books[i].judul,
            "penulis":books[i].penulis,
            "penerbit":books[i].penerbit,
            "tanggal_terbit":books[i].tanggal_terbit,
            "status":status,
            "harga":books[i].harga,
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
        var userdata = jwt.verify(token, "inisecretproyeksoa");
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
            "judul":books[i].judul,
            "penulis":books[i].penulis,
            "penerbit":books[i].penerbit,
            "tanggal_terbit":books[i].tanggal_terbit,
            "status":status,
            "harga":books[i].harga,
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
        var userdata = jwt.verify(token, "inisecretproyeksoa");
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
            "judul":books[i].judul,
            "penulis":books[i].penulis,
            "penerbit":books[i].penerbit,
            "tanggal_terbit":books[i].tanggal_terbit,
            "status":status,
            "harga":books[i].harga,
        }
        temp.push(a)
    }
    return res.status(200).send(temp);
})


// format tanggal
function formatDate(date){
    let today = new Date(date);
    let dd = String(today.getDate()).padStart(2, '0');
    let mm = String(today.getMonth() + 1).padStart(2, '0'); 
    let yyyy = today.getFullYear();
    today =yyyy + '/' + mm + '/' + dd;
    return today;
}

function calculateDifferenceDate(date2,date1){
    var Difference_In_Time = date2.getTime() - date1.getTime();
    var Difference_In_Days = Difference_In_Time / (1000 * 3600 * 24);
    return Difference_In_Days;
}
//PENGUNJUNG
//meminjam buku
app.post("/api/borrow/:book_id",async function(req,res){
    var token = req.header('x-auth-token');
    if(!req.header('x-auth-token')){
        return res.status(404).send("Unauthorized");
    }
    let userdata={}
    try{
        userdata = jwt.verify(token, "inisecretproyeksoa");
    }catch(err){
        return res.status(400).send("Token Expired or Invalid")
    }
    let book_id = req.params.book_id;

    let user=await db.executeQueryWithParam(`select * from users where email=?`,[userdata.email]);
    if(user[0].role!="customer"){
        return res.status(400).json({
            status:400,
            body:`Anda tidak memiliki hak akses`
        })
    }
    let id_user=user[0].id;
    let book=await db.executeQueryWithParam(`select * from book where id=?`,[book_id]);
    if(book.length==0){
        return res.status(404).json({
            status:404,
            msg:"Buku tidak ditemukan"
        })
    }
    if(book[0].status!="available"){
        return res.status(400).json({
            status:400,
            msg:"Buku tidak tersedia"
        })
    }

    if(user[0].saldo<book[0].harga){
        return res.status(400).json({
            status:400,
            msg:"Saldo anda tidak cukup"
        })
    }
    var lama_pinjam = req.body.lama_peminjaman;
    lama_pinjam=parseInt(lama_pinjam);
    let today = formatDate(new Date());
    let return_date= new Date()
    return_date.setDate(return_date.getDate()+lama_pinjam);
    return_date= formatDate(new Date(return_date));
    await db.executeQueryWithParam(`update book set status='borrowed' where id=?`,[book_id]);
    await db.executeQueryWithParam(`update users set saldo=saldo-? where id=?`,[book[0].harga,id_user]);
    let insert=await db.executeQueryWithParam(`insert into borrow values(?,?,?,?,?,?,?)`,['',id_user,book_id,today,return_date,'borrowed',30]);

    return res.status(200).json({
        status:200,
        body:{
            ID_Borrow:insert.insertId,
            ID_Buku:book_id,
            Judul_Buku:book[0].judul,
            Tanggal_Pinjam:today,
            Tanggal_Pengembalian:return_date,
        }
    })
})

//perpanjangan peminjaman buku
app.post("/api/borrow/extend/:id_borrow",async function(req,res){
    var token = req.header('x-auth-token');
    if(!req.header('x-auth-token')){
        return res.status(404).send("Unauthorized");
    }
    let userdata={}
    try{
        userdata = jwt.verify(token, "inisecretproyeksoa");
    }catch(err){
        return res.status(400).send("Token Expired or Invalid")
    }
    let user=await db.executeQueryWithParam(`select * from users where email=?`,[userdata.email]);
    if(user[0].role!="customer"){
        return res.status(400).json({
            status:400,
            body:`Anda tidak memiliki hak akses`
        })
    }
    let id_user=user[0].id;
    let id_borrow=req.params.id_borrow;
    let lama_extend=req.body.lama_extend;
    let borrow=await db.executeQueryWithParam(`select id_user,id_buku,tanggal_pengembalian,status from borrow where id=?`,[id_borrow]);
    if(borrow.length==0){
        return res.status(404).json({
            status:404,
            msg:"Borrow id tidak ditemukan"
        })
    }
    if(borrow[0].status!="borrowed"){
        return res.status(400).json({
            status:400,
            msg:"Peminjaman ini sudah dikembalikan"
        })
    }
    if(borrow[0].id_user!=id_user){
        return res.status(400).json({
            status:400,
            msg:"Bukan user tersebut yang meminjam"
        })
    }
    let date = new Date(borrow[0].tanggal_pengembalian);
    date=date.setDate(date.getDate()+parseInt(lama_extend));
    date= formatDate(new Date(date));

    let book=await db.executeQueryWithParam(`select * from book where id=?`,[borrow[0].id_buku]);
    let harga_extend=parseInt(book[0].harga)*0.01*parseInt(lama_extend)
    await db.executeQueryWithParam(`update users set saldo=saldo-? where id=?`,[harga_extend,id_user]);
    await db.executeQueryWithParam(`update borrow set tanggal_pengembalian=?,durasi=durasi+? where id=?`,[date,lama_extend,id_borrow]);


    return res.status(200).json({
        status:200,
        body:{
            Judul_Buku:book[0].judul,
            Tanggal_Pengembalian_Lama:borrow[0].tanggal_pengembalian,
            Tanggal_Pengembalian_Baru:date,
        }
    })

})

//pengembalian buku
app.post("/api/borrow/return/:id_borrow",async function(req,res){
    var token = req.header('x-auth-token');
    if(!req.header('x-auth-token')){
        return res.status(404).send("Unauthorized");
    }
    let userdata={}
    try{
        userdata = jwt.verify(token, "inisecretproyeksoa");
    }catch(err){
        return res.status(400).send("Token Expired or Invalid")
    }
    let user=await db.executeQueryWithParam(`select * from users where email=?`,[userdata.email]);
    
    if(user[0].role!="customer"){
        return res.status(400).json({
            status:400,
            body:`Anda tidak memiliki hak akses`
        })
    }
    let id_user=user[0].id;
    let id_borrow=req.params.id_borrow;
    let borrow=await db.executeQueryWithParam(`select id_user,id_buku,tanggal_pengembalian,status from borrow where id=?`,[id_borrow]);
    if(borrow.length==0){
        return res.status(404).json({
            status:404,
            msg:"Borrow id tidak ditemukan"
        })
    }
    if(borrow[0].status!="borrowed"){
        return res.status(400).json({
            status:400,
            msg:"Peminjaman ini sudah dikembalikan"
        })
    }
    if(borrow[0].id_user!=id_user){
        return res.status(400).json({
            status:400,
            msg:"Bukan user tersebut yang meminjam"
        })
    }
    let today = new Date();
    let tanggal_pengembalian = new Date(borrow[0].tanggal_pengembalian);
    let compareDate=today<tanggal_pengembalian;
    let diffDate=calculateDifferenceDate(tanggal_pengembalian,today);
    let book=await db.executeQueryWithParam(`select * from book where id=?`,[borrow[0].id_buku]);
    if(!compareDate){
        let denda=book[0].harga*0.1*Math.abs(diffDate);
        await db.executeQueryWithParam(`update users set saldo=saldo-? where id=?`,[denda,id_user]);
    }
    await db.executeQueryWithParam(`update borrow set status=? where id=?`,['returned',id_borrow]);
    await db.executeQueryWithParam(`update book set status='available' where id=?`,[book[0].id]);
    user=await db.executeQueryWithParam(`select * from users where id=?`,[borrow[0].id_user]);

    return res.status(200).json({
        status:200,
        body:{
            Judul_Buku:book[0].judul,
            Tanggal_Pengembalian:borrow[0].tanggal_pengembalian,
            Kena_Denda:!compareDate?"Iya":"Tidak",
            Saldo:user[0].saldo
        }
    })
})

//PENJAGA
//tambah buku
app.post("/api/book/add", upload.single("gambar"), async function(req,res){
    var token = req.header('x-auth-token');
    if(!req.header('x-auth-token')){
        fs.unlinkSync(`${"./uploads/"+req.file.filename}`);
        return res.status(404).send("Unauthorized");
    }
    try{
        var userdata = jwt.verify(token, "inisecretproyeksoa");
    }catch(err){
        fs.unlinkSync(`${"./uploads/"+req.file.filename}`);
        return res.status(400).send("Token Expired or Invalid")
    }
    const schema = 
        joi.object({
            judul : joi.string().required(),
            penulis : joi.string().required(),
            penerbit : joi.string().required(),
            tanggal_terbit : joi.date().format('DD-MM-YYYY').required(),
            harga : joi.number().required()
        })

        // NB : hati-hati untuk penggunaan min() max() , kalau di depannya ada string() , dianggap length nya , kalau ada number() dianggap valuenya 

    try {
        await schema.validateAsync(req.body);
    } catch (error) {
        fs.unlinkSync(`${"./uploads/"+req.file.filename}`);
        return res.status(403).send(error.toString());
    }

    let user = await db.query(`select * from users where email = '${userdata.email}'`)
    user = user[0];
    if(!user){
        fs.unlinkSync(`${"./uploads/"+req.file.filename}`);
        return res.status(404).send({"message" : "User belum terdaftar!"});
    }else if(user.role != "librarian"){
        fs.unlinkSync(`${"./uploads/"+req.file.filename}`);
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

//ubah buku
app.put("/api/book/edit", upload.single("gambar"), async function(req,res){
    let cekgambar = req.file+"";
    if(cekgambar == "undefined"){
        var token = req.header('x-auth-token');
        if(!req.header('x-auth-token')){
            return res.status(404).send("Unauthorized");
        }
        try{
            var userdata = jwt.verify(token,"inisecretproyeksoa");
        }catch(err){
            return res.status(400).send("Token Expired or Invalid")
        }
    
        const {judul,penulis,penerbit,tanggal_terbit,harga,book_id} = req.body;
        if(tanggal_terbit){
            var ListofDays = [31,28,31,30,31,30,31,31,30,31,30,31];
            let cektanggal = tanggal_terbit.toString();
            cektanggal = cektanggal.split("-");
            if(cektanggal.length == 3){
                var dd = parseInt(cektanggal[0]);
                var mm  = parseInt(cektanggal[1]);
                var yy = parseInt(cektanggal[2]);
                if(isNaN(dd) || isNaN(mm) || isNaN(yy)){
                    return res.status(400).send({"message" : "Format tanggal harus dd-mm-yyyy"});
                }else{
                    let ctr = 0;
                    if(parseInt(mm) > 0 && parseInt(mm) < 13){
                        if(parseInt(dd) > 0 && parseInt(dd) < ListofDays[mm-1]){
                            if(parseInt(yy) > 1000 && parseInt(yy) < 2023){
                                
                            }else{
                                ctr++;
                            }
                        }else{
                            ctr++;
                        }
                    }else{
                        ctr++;
                    }
                    if(ctr>0){
                        return res.status(400).send({"message" : "Format tanggal harus dd-mm-yyyy"});
                    }
                }
            }else{
                return res.status(400).send({"message" : "Format tanggal harus dd-mm-yyyy"});
            }
        }
        if(!book_id){
            return res.status(400).send({"message" : "Field book_id harus diisi!"});
        }
        let buku = await db.query(`select * from book where id = '${book_id}'`)
        buku = buku[0];
        if(!buku || !book_id){
            return res.status(404).send({"message" : "Buku belum terdaftar atau id tidak valid!"});
        }else{
            let user = await db.query(`select * from users where email = '${userdata.email}'`)
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
                exc += ` where id = '${book_id}' `;
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
    }else{
        if(!req.header('x-auth-token')){
            fs.unlinkSync(`${"./uploads/"+req.file.filename}`);
            return res.status(404).send("Unauthorized");
        }try{
            var userdata = jwt.verify(token, "inisecretproyeksoa");
        }catch(err){
            fs.unlinkSync(`${"./uploads/"+req.file.filename}`);
            return res.status(400).send("Token Expired or Invalid")
        }

        const {judul,penulis,penerbit,tanggal_terbit,harga,book_id} = req.body;
        if(tanggal_terbit){
            var ListofDays = [31,28,31,30,31,30,31,31,30,31,30,31];
            let cektanggal = tanggal_terbit.toString();
            cektanggal = cektanggal.split("-");
            if(cektanggal.length == 3){
                var dd = parseInt(cektanggal[0]);
                var mm  = parseInt(cektanggal[1]);
                var yy = parseInt(cektanggal[2]);
                if(isNaN(dd) || isNaN(mm) || isNaN(yy)){
                    fs.unlinkSync(`${"./uploads/"+req.file.filename}`);
                    return res.status(400).send({"message" : "Format tanggal harus dd-mm-yyyy"});
                }else{
                    let ctr = 0;
                    if(parseInt(mm) > 0 && parseInt(mm) < 13){
                        if(parseInt(dd) > 0 && parseInt(dd) < ListofDays[mm-1]){
                            if(parseInt(yy) > 1000 && parseInt(yy) < 2023){
                                
                            }else{
                                ctr++;
                            }
                        }else{
                            ctr++;
                        }
                    }else{
                        ctr++;
                    }
                    if(ctr>0){
                        fs.unlinkSync(`${"./uploads/"+req.file.filename}`);
                        return res.status(400).send({"message" : "Format tanggal harus dd-mm-yyyy"});
                    }
                }
            }else{
                fs.unlinkSync(`${"./uploads/"+req.file.filename}`);
                return res.status(400).send({"message" : "Format tanggal harus dd-mm-yyyy"});
            }
        }
        if(!book_id){
            fs.unlinkSync(`${"./uploads/"+req.file.filename}`);
            return res.status(400).send({"message" : "Field book_id harus diisi!"});
        }else{
            let buku = await db.query(`select * from book where id = '${book_id}'`)
            buku = buku[0];
            if(!buku || !book_id){
                fs.unlinkSync(`${"./uploads/"+req.file.filename}`);
                return res.status(404).send({"message" : "Buku belum terdaftar atau id tidak valid!"});
            }else{
                let user = await db.query(`select * from users where email = '${userdata.email}'`)
                user = user[0];
                if(!user){
                    fs.unlinkSync(`${"./uploads/"+req.file.filename}`);
                    return res.status(404).send({"message" : "User belum terdaftar!"});
                }else if(user.role != "librarian"){
                    fs.unlinkSync(`${"./uploads/"+req.file.filename}`);
                    return res.status(400).send({"message" : "User bukan librarian!"});
                }else{
                    let oldname = buku.gambar;
                    fs.unlinkSync(`${oldname}`);
                    let newname = "./uploads/"+req.file.filename;
                    fs.renameSync(`${newname}`,`${oldname}`)
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
                    exc += ` where id = '${book_id}' `;
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
        }
    }
})

//hapus buku
app.delete("/api/book/delete/:book_id",async function(req,res){
    var token = req.header('x-auth-token');
    if(!req.header('x-auth-token')){
        return res.status(404).send("Unauthorized");
    }
    try{
        var userdata = jwt.verify(token, "inisecretproyeksoa");
    }catch(err){
        return res.status(400).send("Token Expired or Invalid")
    }
    const {book_id} = req.params;
    let cekborrow = await db.query(`select * from borrow where id_buku = '${book_id}'`)
    cekborrow.forEach(cb => {
        if(cb.status == "borrowed" || cb.status == "overdue"){
            return res.status(400).send({"message" : "buku tidak bisa dihapus karena belum dikembalikan"});
        }
    });
    let user = await db.query(`select * from users where email = '${userdata.email}'`)
    user = user[0];
    if(user.role != "librarian"){
        return res.status(400).send({"message" : "User bukan librarian!"});
    }else{
        let cekbook = await db.query(`select * from book where id_buku = '${book_id}'`)
        cekbook = cekbook[0];
        if(!cekbook){
            return res.status(400).send({"message" : "Buku tidak ditemukan!"});
        }
        let oldname = cekbook.gambar;
        fs.unlinkSync(`${oldname}`);
        let del = `delete from book where id = '${book_id}'`
        let hasil = await db.query(del);

        return res.status(200).send({"message" : "Buku berhasil di hapus!"})
    }
})

//confirm peminjaman buku
app.post("/api/borrow/confirm/:borrow_id",async function(req,res){
    var token = req.header('x-auth-token');
    if(!req.header('x-auth-token')){
        return res.status(404).send("Unauthorized");
    }
    try{
        var userdata = jwt.verify(token,"inisecretproyeksoa");
    }catch(err){
        return res.status(400).send("Token Expired or Invalid")
    }
    const {borrow_id} = req.params;
    const {confirmation} = req.body;
    let tempcon = confirmation + "";
    tempcon = tempcon.toUpperCase();
    if(!confirmation){
        return res.status(404).send({"message" : "Field confirmation harus diisi!"});
    }
    if(tempcon != "ACCEPT" && tempcon != "DECLINE"){
        return res.status(404).send({"message" : "Confirmation hanya diisi dengan accept / decline!"});
    }
    let user = await db.query(`select * from users where email = '${userdata.email}'`)
    user = user[0];
    if(!user){
        return res.status(404).send({"message" : "User belum terdaftar!"});
    }else if(user.role != "librarian"){
        return res.status(400).send({"message" : "User bukan librarian!"});
    }else{
        let borrow = await db.query(`select * from borrow where id = '${borrow_id}'`)
        borrow = borrow[0];
        if(borrow.status == "borrowed"){
            return res.status(400).send({"message" : "user sedang dalam masa peminjaman"});
        }else if(borrow.status == "returned"){
            return res.status(400).send({"message" : "user sudah mengembalikan pinjaman buku"});
        }else if(borrow.status == "overdue"){
            return res.status(400).send({"message" : "user sudah melewati batas waktu peminjaman buku"});
        }else if(borrow.status == "declined"){
            return res.status(400).send({"message" : "peminjaman user dalam status ditolak"});
        }else{
            if(tempcon == "ACCEPT"){
                let query = `update borrow set status = ${"borrowed"} where id = ${borrow_id}`;
                let hasil = await db.query(query);
                return res.status(200).send({"message" : "Konfirmasi peminjaman berhasil dilakukan, status peminjaman : borrowed"});
            }else{
                let query = `update borrow set status = ${"declined"} where id = ${borrow_id}`;
                let hasil = await db.query(query);
                return res.status(200).send({"message" : "Konfirmasi peminjaman berhasil dilakukan, status peminjaman : declined"});
            }
        }
    }
})

//lihat daftar peminjaman buku
app.get("/api/borrow",async function(req,res){
    var token = req.header('x-auth-token');
    if(!req.header('x-auth-token')){
        return res.status(404).send("Unauthorized");
    }
    try{
        var userdata = jwt.verify(token,"inisecretproyeksoa");
    }catch(err){
        return res.status(400).send("Token Expired or Invalid")
    }
    let peminjaman = await db.query(`select * from borrow where true`);
    return res.status(200).send({
        daftar_peminjaman : peminjaman
    });
})

//denda pengunjung yang telat mengembalikan buku
app.post("/api/borrow/charge/:borrow_id",async function(req,res){
    var token = req.header('x-auth-token');
    if(!req.header('x-auth-token')){
        return res.status(404).send("Unauthorized");
    }
    try{
        var userdata = jwt.verify(token, "inisecretproyeksoa");
    }catch(err){
        return res.status(400).send("Token Expired or Invalid")
    }
    let ceklogin = await db.query(`select * from users where email = '${userdata.email}'`);
    ceklogin = ceklogin[0];
    if(ceklogin.role != "librarian"){
        return res.status(400).send({"message" : "User bukan librarian!"});
    }
    const {borrow_id} = req.params;
    let borrow = await db.query(`select * from borrow where id = '${borrow_id}'`)
    borrow = borrow[0];
    if(!borrow){
        return res.status(400).send({"message" : "Peminjaman tidak ditemukan!"});
    }
    if(borrow.status == "borrowed"){
        return res.status(400).send({"message" : "user sedang dalam masa peminjaman"});
    }else if(borrow.status == "returned"){
        return res.status(400).send({"message" : "user sudah mengembalikan pinjaman buku"});
    }else if(borrow.status == "declined"){
        return res.status(400).send({"message" : "peminjaman user dalam status ditolak"});
    }else if(borrow.status == "pending"){
        return res.status(400).send({"message" : "peminjaman user dalam status pending"});
    }
    else
    {
        let cekuser = await db.query(`select * from users where id = '${borrow.id_user}'`)
        cekuser = cekuser[0];
        if(!cekuser){
            return res.status(404).send({"message" : "user tidak ditemukan!"});
        }
        let cekbuku = await db.query(`select * from book where id = '${borrow.id_buku}'`)
        cekbuku = cekbuku[0];
        if(!cekbuku){
            return res.status(404).send({"message" : "buku tidak ditemukan!"});
        }
        let saldoawal = cekuser.saldo;
        saldoawal = parseInt(saldoawal);

        let denda = cekbuku.harga;
        denda = parseInt(denda);
        denda = (1 / 100) * denda;

        let waktu = borrow.durasi;
        waktu = parseInt(waktu);
        
        var today = new Date();
        var dd = String(today.getDate()).padStart(2, '0');
        var mm = String(today.getMonth() + 1).padStart(2, '0'); 
        var yyyy = today.getFullYear();
    
        today = mm + '-' + dd + '-' + yyyy; //tanggal sekarang

        let splitstring = borrow.tanggal_pinjam.split("-");
        splitstring = splitstring.reverse();
        splitstring = splitstring.join("-");

        var date = new Date(splitstring+"");
        date.setDate(date.getDate() + waktu);

        let hari = date.getDate()+"";
        let bulan = (date.getMonth()+1)+"";

        if(date.getDate()<10){
            hari = "0" + hari;
        }
        if((date.getMonth()+1)<10){
            bulan = "0" + bulan;
        }
        date = bulan + '-' + hari + '-' + date.getFullYear(); //tanggal peminjaman

        var date1 = new Date(today);
        var date2 = new Date(date);

        var Difference_In_Time = date2.getTime() - date1.getTime();

        var Difference_In_Days = Difference_In_Time / (1000 * 3600 * 24);

        denda = denda * parseInt(Difference_In_Days);

        let total = saldoawal - denda;

        let updatesaldouser = `update users set saldo = ${total} where id = ${cekuser.id}`;
        let hasil = await db.query(updatesaldouser);

        return res.status(200).send({
            saldo_awal : saldoawal,
            keterlambatan : Difference_In_Days,
            denda : denda,
            saldo_akhir : total
        })
    }
})

//ADMIN
//mengubah role pengunjung menjadi penjaga
app.put("/api/user/role/:id_user",async function(req,res){
    var token = req.header('x-auth-token');
    if(!req.header('x-auth-token')){
        return res.status(404).send("Unauthorized");
    }
    let userdata={}
    try{
        userdata = jwt.verify(token,"inisecretproyeksoa");
    }catch(err){
        return res.status(400).send("Token Expired or Invalid")
    }
    let userLogin=await db.executeQueryWithParam(`select * from users where email=?`,[userdata.email]);
    
    if(userLogin[0].role!="admin"){
        return res.status(400).json({
            status:400,
            body:`Anda tidak memiliki hak akses`
        })
    }
    let id_user=req.params.id_user
    let user=await db.executeQueryWithParam(`select * from users where id=?`,[id_user]);
    if(user.length==0){
        return res.status(404).json({
            status:404,
            msg:"User tidak ditemukan"
        })
    }
    if(user[0].role=="librarian"){
        return res.status(400).json({
            status:400,
            msg:"Role user tersebut sudah librarian"
        })
    }

    await db.executeQueryWithParam(`update users set role='librarian' where id=?`,[id_user]);
    
    return res.status(200).json({
        status:200,
        body:`Berhasil mengubah role user ${user[0].nama} menjadi librarian`
    })
})

//ban kepada user
app.post("/api/user/ban/:id_user",async function(req,res){
    var token = req.header('x-auth-token');
    if(!req.header('x-auth-token')){
        return res.status(404).send("Unauthorized");
    }
    let userdata={}
    try{
        userdata = jwt.verify(token, "inisecretproyeksoa");
    }catch(err){
        return res.status(400).send("Token Expired or Invalid")
    }
    let userLogin=await db.executeQueryWithParam(`select * from users where email=?`,[userdata.email]);
    if(userLogin[0].role!="admin"){
        return res.status(400).json({
            status:400,
            body:`Anda tidak memiliki hak akses`
        })
    }

    let id_user=req.params.id_user
    let user=await db.executeQueryWithParam(`select * from users where id=?`,[id_user]);
    if(user.length==0){
        return res.status(404).json({
            status:404,
            msg:"User tidak ditemukan"
        })
    }
    
    if(user[0].role=="admin"){
        return res.status(400).json({
            status:400,
            body:`Anda tidak bisa melakukan ban terhadap admin`
        })
    }

    await db.executeQueryWithParam(`update users set status='banned' where id=?`,[id_user]);
    
    return res.status(200).json({
        status:200,
        body:`Berhasil membanned user ${user[0].nama}`
    })
})

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}.`);
});