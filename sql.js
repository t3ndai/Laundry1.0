const sqlite = require('better-sqlite3')
const db = sqlite('shops.db')

//create tables

const createShopsTable = 
  `CREATE TABLE IF NOT EXISTS shops(
     shop_id INTEGER PRIMARY KEY NOT NULL,
     name TEXT,
     phone TEXT,
     email TEXT,  
     address TEXT, 
     date_created DEFAULT CURRENT_TIMESTAMP NOT NULL
  );`
  
const createCustomersTable = 
  `CREATE TABLE IF NOT EXISTS customers(
     customer_id INTEGER PRIMARY KEY NOT NULL,
     shop_id INTEGER REFERENCES shops NOT NULL ON DELETE CASCADE,
     name TEXT,
     phone TEXT,
     email TEXT,
     address TEXT
     date_created DEFAULT CURRENT_TIMESTAMP NOT NULL
  );`
  
  const prepareDB = () => {
    db.prepare(createShopsTable).run()
    db.prepare(createCustomersTable).run()
    
  }

//Operations 
  
const saveShop = 
  `INSERT INTO shops(shop_id, name, phone, email, address) VALUES ();`
  
const saveCustomer =
  `INSERT INTO customers(customer_id, shop_id, name, phone, email, address) VALUES ();`
  





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
	saveReceipt : saveReceipt, 
	createReceiptsTable : createReceiptsTable,
	getReceipts : getReceipts
	
}