const saveReceipt = `INSERT INTO receipts (receipt) VALUES ($1) 
					RETURNING *;`

const createReceiptsTable =
    `CREATE TABLE IF NOT EXISTS receipts (
    receipt jsonb
    );`
	
	
const getReceipts = `SELECT * 
					FROM receipts 
					WHERE receipt::jsonb ->> 'shop_id' = $1;`

module.exports = {
	saveReceipt : saveReceipt, 
	createReceiptsTable : createReceiptsTable,
	getReceipts : getReceipts
	
}