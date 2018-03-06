const saveReceipt = `INSERT INTO receipts (receipt) VALUES ($1) 
					RETURNING *;`

const createReceiptsTable =
    `CREATE TABLE IF NOT EXISTS receipts (
    receipt jsonb
    );`

module.exports = {
	saveReceipt : saveReceipt, 
	createReceiptsTable : createReceiptsTable
	
}