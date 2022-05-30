const mysql = require('mysql');
const pool = mysql.createPool({
    host:'localhost',
    user:'root',
    password:'',
    database:'soa_proyek',
})

const getPool = () =>{
    try{
        return new Promise(function(resolve ,reject){
            pool.getConnection(function(err,conn){
                if(err){
                    reject(err)
                }else{
                    resolve(conn)
                }
            })
        })

    }catch(err){
        console.log(err)
    }
}

const executeQuery = async(query) =>{
    let conn = await getPool()
    try{
        return new Promise( (resolve,reject)=>{
            conn.query(query ,(err,result)=>{
                err ? reject(err):resolve(result)
            })
        })
    }catch(err){
        console.log(err)
    }
}

module.exports = {
    'query' : executeQuery,
    'conn': getPool,
}