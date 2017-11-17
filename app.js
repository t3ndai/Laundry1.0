const express = require("express");
const app = express();
const bodyParser = require("body-parser");
const { Pool } = require("pg");
const { check, validationResult } = require("express-validator/check");
const { matchedData } = require("express-validator/filter");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");

require("dotenv").load();

app.use(bodyParser.json());

function Shop(name, address, email, phone, password) {
    this.name = name;
    this.address = address;
    this.email = email;
    this.phone = phone;
    //this.password = password
}

function Customer(name, shop_id, phone, email, address) {
    this.name = name;
    this.shop_id = shop_id;
    this.phone = phone;
    this.email = email;
    this.address = address;
}

function Receipt(shop_id, customer_id, amount, receipt_date, description) {
    this.shop_id = shop_id;
    this.customer_id = customer_id;
    this.amount = amount;
    this.receipt_date = receipt_date;
    this.description = description;
}

const UUID = 'CREATE EXTENSION IF NOT EXISTS "uuid-ossp";';

const createShopsTable =
    "CREATE TABLE IF NOT EXISTS shops (" +
    " shop_id   UUID PRIMARY KEY DEFAULT uuid_generate_v1mc()," +
    " name TEXT NOT NULL," +
    " address TEXT NOT NULL," +
    " email TEXT NOT NULL," +
    " phone VARCHAR(12) NOT NULL" +
    " );";

const saveShop =
    "INSERT INTO shops(shop_id, name, address, email, phone, password) VALUES (DEFAULT, $1,$2,$3,$4,$5) " +
    " RETURNING shop_id; ";

const checkShopExists =
    "SELECT email , shop_id FROM shops " + "WHERE email = $1 ;";

const createCustomersTable =
    "CREATE TABLE IF NOT EXISTS customers (" +
    " customer_id UUID PRIMARY KEY DEFAULT uuid_generate_v1mc(), " +
    " name VARCHAR(50) NOT NULL, " +
    " shop_id UUID REFERENCES shops, " +
    " phone VARCHAR(12) NOT NULL, " +
    " email VARCHAR(50) NOT NULL, " +
    " address VARCHAR(50) NOT NULL " +
    " );";

const saveCustomer =
    "INSERT INTO customers(customer_id, name, shop_id, phone, email, address ) VALUES (DEFAULT, $1, $2, $3, $4, $5) " +
    " RETURNING customer_id; ";

const createReceiptsTable =
    "CREATE TABLE IF NOT EXISTS receipts (" +
    " receipt_id serial PRIMARY KEY, " +
    " shop_id UUID REFERENCES shops, " +
    " customer_id UUID REFERENCES customers, " +
    " amount money NOT NULL," +
    " receipt_date timestamp NOT NULL, " +
    " description TEXT " +
    " );";

const saveReceipt =
    "INSERT INTO receipts(shop_id, customer_id, amount, receipt_date, description ) VALUES ($1, $2, $3, $4, $5) " +
    " RETURNING receipt_id; ";

const pool = new Pool({
    user: "Dzonga",
    host: "localhost",
    database: "laundry",
    password: "",
    port: 5432
});

const createApplication = (async function() {
    try {
        await pool.query(createShopsTable);
        await pool.query(UUID);
        await pool.query(createCustomersTable);
        await pool.query(createReceiptsTable);
    } catch (err) {
        console.log(err);
    }
})();

app
    .route("/shops")

    .all(
        [
            check("name", "Invalid name")
                .exists()
                .isLength({ min: 1 }),
            check("address", "Invalid address")
                .exists()
                .isLength({ min: 5 }),
            check("email", "Invalid email").isEmail(),
            check("phone", "Invalid phone #")
                .isLength({ min: 10, max: 12 })
                .isNumeric()
            /*check('password', 'Invalid').exists()*/
        ],

        function(req, res, next) {
            next();
        }
    )

    .post(function(req, res, next) {
        const errors = validationResult(req);

        if (!errors.isEmpty()) {
            res.status(422).json({ errors: errors.mapped() });
            res.end();
        } else {
            const shop = new Shop(
                req.body.name,
                req.body.address,
                req.body.email,
                req.body.phone
            );

            /*async function passwordHash() {

                const new_hash = await bcrypt.hash(shop.password, 10)
                return new_hash

            }*/

            const save = (async function() {
                try {
                    let newShop = await pool.query(saveShop, [
                        shop.name,
                        shop.address,
                        shop.email,
                        shop.phone
                    ]);
                    shop_id = newShop.rows[0].shop_id;
                    const token = await jwt.sign(
                        {
                            data: shop.email + shop_id
                        },
                        "fresh",
                        { expiresIn: "24h" }
                    );
                    res.json({ shop_id: shop_id, token: token });
                    res.end();
                } catch (err) {
                    console.log(err);
                    res.json({ error: err });
                }
            })();
        }
    });

app.post(
    "/login",
    [
        check("email", "Invalid email")
            .exists()
            .isEmail()
        //check("password", "Invalid").exists()
    ],
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(422).json({ errors: errors.mapped() });
        } else {
            const login = (async function() {
                let email = req.body.email;
                //let password = req.body.password;

                try {
                    let shop = await pool.query(checkShopExists, [email]);
                    if (shop.rows.length == 0) {
                        res.json({ error: "user not found" });
                        res.end()
                    }
                    //hash = shop.rows[0].password;
                    shop_id = shop.rows[0].shop_id;

                    res.json({'shop_id': shop_id})

                    /*

                    async function checkPassword() {
                        try {
                            const result = await bcrypt.compare(password, hash);
                            const token = await jwt.sign(
                                {
                                    data: email + shop_id
                                },
                                "fresh",
                                { expiresIn: "24h" }
                            );
                            res.json({ id: shop_id, token: token });
                            return result;
                        } catch (err) {
                            console.log(err);
                            res.json({ error: err });
                        }
                    }

                    await checkPassword(); */

                    console.log(await generateAuthToken())

                } catch (err) {
                    console.log(err);
                    res.json({ error: err });
                }
            })();
        }
    }
);

app
    .route("/customers")

    .all(
        [
            check("name", "Invalid name")
                .exists()
                .isLength({ min: 1 }),
            check("phone", "Invalid phone #")
                .exists()
                .isNumeric()
                .isLength({ min: 5, max: 12 }),
            check("email", "Invalid email").isEmail(),
            check("shop_id", "Invalid shop_id")
                .exists()
                .isLength({ min: 10 }),
            check("address", "Invalid address")
                .exists()
                .isLength({ min: 5 })
        ],

        (req, res, next) => {
            next();
        }
    )

    .post((req, res, next) => {
        const errors = validationResult(req);

        if (!errors.isEmpty()) {
            res.status(422).json({ errors: errors.mapped() });
        } else {
            const customer = new Customer(
                req.body.name,
                req.body.shop_id,
                req.body.phone,
                req.body.email,
                req.body.address
            );

            const save = (async function() {
                try {
                    newCustomer = await pool.query(saveCustomer, [
                        customer.name,
                        customer.shop_id,
                        customer.phone,
                        customer.email,
                        customer.address
                    ]);
                    customer_id = newCustomer.rows[0].customer_id;
                    res.json({ customer_id: customer_id });
                    res.end();
                } catch (err) {
                    console.log(err);
                    res.json({ error: err });
                    res.end();
                }
            })();
        }
    });

app
    .route("/receipts")

    .all(
        [
            check("shop_id", "Invalid shop_id")
                .exists()
                .isUUID(),
            check("customer_id", "Invalid customer_id")
                .exists()
                .isUUID(),
            check("amount", "Invalid amount")
                .exists()
                .isFloat(),
            check("receipt_date", "Invalid date")
                .exists()
                .toDate(),
            check("description", "Invalid description").exists()
        ],
        (req, res, next) => {
            next();
        }
    )

    .post((req, res, next) => {
        const errors = validationResult(req);

        if (!errors.isEmpty()) {
            res.status(422).json({ errors: errors.mapped() });
        } else {
            const receipt = new Receipt(
                req.body.shop_id,
                req.body.customer_id,
                req.body.amount,
                req.body.receipt_date,
                req.body.description
            );

            const save = (async function() {
                try {
                    new_receipt = await pool.query(saveReceipt, [
                        receipt.shop_id,
                        receipt.customer_id,
                        receipt.amount,
                        receipt.receipt_date,
                        receipt.description
                    ]);
                    receipt_id = new_receipt.rows[0].receipt_id;
                    res.json({ receipt_id: receipt_id });
                    res.end();
                } catch (err) {
                    console.log(err);
                    res.json({ error: err });
                    res.end();
                }
            })();
        }
    });


async function generateAuthToken() {

    return await crypto.randomBytes(Math.ceil(5/2)) 
        .toString('hex')
        .slice(0,5)

}


//Authorization Headers validation (JWT) on /customers
//NEXT: Update  --/ Delete Customer -- indicates after receipts
//NEXT: Email a receipt
//NEXt: Send a text notification

app.listen(3000, function() {
    console.log("listening on port : 3000!");
});
