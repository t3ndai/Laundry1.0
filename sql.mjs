export const createShopsTable =
    'CREATE TABLE IF NOT EXISTS shops (' +
    ' shop_id   UUID PRIMARY KEY DEFAULT uuid_generate_v1mc(),' +
    ' name TEXT NOT NULL,' +
    ' address TEXT NOT NULL,' +
    ' email TEXT UNIQUE NOT NULL,' +
    ' phone VARCHAR(12) NOT NULL' +
    ' );'

export const saveShop =
    'INSERT INTO shops(shop_id, name, address, email, phone ) VALUES (DEFAULT, $1,$2,$3,$4) ' +
    ' RETURNING shop_id; '

export const checkShopExists =
    'SELECT email , shop_id FROM shops ' + 'WHERE email = $1 ;'

export const createCustomersTable =
    'CREATE TABLE IF NOT EXISTS customers (' +
    ' customer_id UUID PRIMARY KEY DEFAULT uuid_generate_v1mc(), ' +
    ' name VARCHAR(50) NOT NULL, ' +
    ' shop_id UUID REFERENCES shops, ' +
    ' phone VARCHAR(12) NOT NULL, ' +
    ' email VARCHAR(50) NOT NULL, ' +
    ' address VARCHAR(50) NOT NULL ' +
    ' );'

export const saveCustomer =
    'INSERT INTO customers(customer_id, name, shop_id, phone, email, address ) VALUES (DEFAULT, $1, $2, $3, $4, $5) ' +
    ' RETURNING customer_id; '

export const createReceiptsTable =
    'CREATE TABLE IF NOT EXISTS receipts (' +
    ' receipt_id serial PRIMARY KEY, ' +
    ' shop_id UUID REFERENCES shops, ' +
    ' customer_id UUID REFERENCES customers, ' +
    ' amount money NOT NULL,' +
    ' receipt_date timestamp NOT NULL, ' +
    ' description TEXT ' +
    ' );'

export const saveReceipt =
    'INSERT INTO receipts(shop_id, customer_id, amount, receipt_date, description ) VALUES ($1, $2, $3, $4, $5) ' +
    ' RETURNING receipt_id; '
