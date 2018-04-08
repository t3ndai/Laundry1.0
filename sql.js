const sqlite = require('better-sqlite3')
const db = sqlite('shops.db')
db.pragma(`foreign_keys = ON`)

//create tables



const createShopsTable = 
  `CREATE TABLE IF NOT EXISTS shops(
     shop_id INTEGER PRIMARY KEY UNIQUE NOT NULL,
     name TEXT,
     phone TEXT,
     email TEXT,  
     address TEXT, 
     date_created DEFAULT CURRENT_TIMESTAMP NOT NULL
  );`
  
const createCustomersTable = 
  `CREATE TABLE IF NOT EXISTS customers(
     customer_id INTEGER PRIMARY KEY NOT NULL,
     shop_id INTEGER NOT NULL,
     name TEXT,
     phone TEXT,
     email TEXT,
     address TEXT,
     date_created DEFAULT CURRENT_TIMESTAMP NOT NULL,
     FOREIGN KEY(shop_id) REFERENCES shops ON DELETE CASCADE
  );`
  
  const prepareDB = () => {
    db.pragma(`foreign_keys = ON`)
    console.log(db.pragma(`foreign_keys`, true))
    db.prepare(createShopsTable).run()
    db.prepare(createCustomersTable).run()
    
    
  }

//Operations 
  
const saveShop = (shop_id, name, phone, email, address) => {
  
  const query = `INSERT INTO shops(shop_id, name, phone, email, address) VALUES (@shop_id, @name, @phone, @email, @address)`
    
  let dbResponse = db.prepare(query).run({ shop_id : shop_id, name : name, phone : phone, email : email, address : address })
  
  if (dbResponse.changes === 1) {
    return 'ok'
  }else {
   throw new Error(`couldn't save shop`)
  }
  
}
  
  
const saveCustomer = () => {
  
  const query = `INSERT INTO customers(customer_id, shop_id, name, phone, email, address) VALUES ()`
    
}
  
  

const checkShopExists = (email) => {
  
  const query = `SELECT shop_id 
                 FROM shops 
                 WHERE email = @email
  `
  
  let dbResponse = db.prepare(query).get({email: email})
                 
  if (dbResponse === undefined) {
    //console.log(dbResponse)
    return ''
  } else {
    return dbResponse
  }
                 

}
    




const saveReceipt = `INSERT INTO receipts (receipt) VALUES ($1) 
					RETURNING *;`

const createReceiptsTable =
    `CREATE TABLE IF NOT EXISTS receipts (
    receipt jsonb
    );`
	
	
const getReceipts = `SELECT * 
					FROM receipts 
					WHERE receipt::jsonb ->> 'shop_id' = $1;`
	
//calculate total revenues to date, belonging to shop 

const dayRevenues = ``

module.exports = {
  prepareDB : prepareDB,
  checkShopExists : checkShopExists,
  saveShop : saveShop,
	saveReceipt : saveReceipt, 
	createReceiptsTable : createReceiptsTable,
	getReceipts : getReceipts
	
}