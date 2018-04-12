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
  
  
const createReceiptsTable = 
  `CREATE TABLE IF NOT EXISTS receipts(
      receipt_id INTEGER PRIMARY KEY NOT NULL,
      shop_id INTEGER NOT NULL,
      total REAL NOT NULL,
      details JSON NOT NULL,
      date_created DEFAULT CURRENT_TIMESTAMP NOT NULL,
      FOREIGN KEY(shop_id) REFERENCES shops ON DELETE CASCADE
  );`
    
const createCustomerReceiptsTable = 
  `CREATE TABLE IF NOT EXISTS customer_receipts(
      customer_id REFERENCES customers,
      receipt_id REFERENCES receipts,
      PRIMARY KEY (customer_id, receipt_id)
  );`   
  
  

const prepareDB = () => {
    db.pragma(`foreign_keys = ON`)
    console.log(db.pragma(`foreign_keys`, true))
    db.prepare(createShopsTable).run()
    db.prepare(createCustomersTable).run()
    db.prepare(createReceiptsTable).run()
    db.prepare(createCustomerReceiptsTable).run()
    
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
  
  
const saveCustomer = (customer_id, shop_id, name, phone, email, address ) => {
  
  const query = `INSERT INTO 
    customers(customer_id, shop_id, name, phone, email, address) 
    VALUES (@customer_id, @shop_id, @name, @phone, @email, @address)`
  
  let dbResponse = db.prepare(query)
                     .run({customer_id : customer_id, shop_id : shop_id, name : name, phone : phone, email : email, address : address })
 
  if ( dbResponse.changes === 1 ) {
    return 'ok'
  } else {
    throw new Error(`couldn't save customer`)
  }
}

const saveReceipt = (receipt_id, shop_id, total, details, customer_id) => {
  
  const query = `INSERT INTO
        receipts(receipt_id, shop_id, total, details)
        VALUES(@receipt_id, @shop_id, @total, @details)`
  
  const bridge_query = `INSERT INTO customer_receipts(customer_id, receipt_id)
                       VALUES(@customer_id, @receipt_id)`
  
  
  
  

    
  let dbResponse = db.transaction([query, bridge_query])
                       .run({
                         receipt_id : receipt_id, 
                         shop_id : shop_id,
                         total : total,
                         details : details,
                         customer_id : customer_id
                       })
                       
    console.log(dbResponse.changes)

    if (dbResponse.changes === 2) {
      return 'ok'
    }else {
      throw new Error(`couldn't save receipt'`)
    }
      
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
    console.log(dbResponse)
    return dbResponse
  }
                 

}

const getCustomers = (shop_id) => {
  
  const query = `SELECT customer_id, name, email, phone, address
                 FROM customers
                 WHERE shop_id = @shop_id`
  
  let dbResponse = db.prepare(query).all({shop_id : shop_id })
  
  return (dbResponse === []) ? [] : dbResponse
  
}

	
const getReceipts = (shop_id) => {
 
   const query = `SELECT receipt_id, total, date_created, details
                  FROM receipts
                  WHERE shop_id = @shop_id`
  
  let dbResponse = db.prepare(query).all({ shop_id : shop_id }) 
  
  return (dbResponse === []) ? [] : dbResponse
	
  
}
 
//calculate total revenues to date, belonging to shop 

const dayRevenues = ``

module.exports = {
  prepareDB : prepareDB,
  checkShopExists : checkShopExists,
  saveShop : saveShop,
  saveCustomer : saveCustomer,
  getCustomers : getCustomers,
	saveReceipt : saveReceipt, 
	getReceipts : getReceipts
	
}