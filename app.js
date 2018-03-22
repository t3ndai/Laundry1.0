const app = require('express')()
const bodyParser = require('body-parser')
const cors = require('cors')
const config = require('./config')
const { Pool } = require('pg')
const { check, validationResult } = require('express-validator/check')
const { matchedData, sanitize } = require('express-validator/filter')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const crypto = require('crypto')
const redis = require('redis')
let redisClient
const { promisify } = require('util')
const AWS = require('aws-sdk')
const mailjet = require('node-mailjet').connect(config.mailjet_client || 'c8b05b409eeb40b3d697f6e209fdd1c8', config.mailjet_secret || 'd050e921dfa823f8f869f49b24e7003b')
const clientSessions = require('client-sessions')
const sql = require('./sql')
const receiptEmail = require('./receipt')


// require('dotenv').load()

AWS.config.loadFromPath('./awsconfig.json')

const connectToServices = (async() => {
  try {
    redisClient = redis.createClient()
    redisClient.on('connect', () => console.log('redis connected'))
    redisClient.on('error', (err) => { console.log(err) })
  } catch (err) {
    console.log(err)
  }
})()

const charset = 'UTF-8'

app.use(bodyParser.json())
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:8080'],
  credentials: true
}))
app.use(clientSessions({
  cookieName: 'authenticated',
  secret: '6aac4e2a1ab67ff',
  duration: 24 * 360 * 1000
}))

function Shop (name, address, email, phone, password) {
  this.name = name
  this.address = address
  this.email = email
  this.phone = phone
    // this.password = password
}

function Customer (name, shop_id, phone, email, address) {
  this.name = name
  this.shop_id = shop_id
  this.phone = phone
  this.email = email
  this.address = address
}

function Receipt (shop_id, customer_id, amount, receipt_date, description) {
  this.shop_id = shop_id
  this.customer_id = customer_id
  this.amount = amount
  this.receipt_date = receipt_date
  this.description = description
}

(async () => {
  try {
    await promisify(redisClient.on).bind(redisClient)
  } catch (err) {
    console.log(err)
  }
})()

const UUID = 'CREATE EXTENSION IF NOT EXISTS "uuid-ossp";'

const createShopsTable =
    'CREATE TABLE IF NOT EXISTS shops (' +
    ' shop_id   UUID PRIMARY KEY DEFAULT uuid_generate_v1mc(),' +
    ' name TEXT NOT NULL,' +
    ' address TEXT NOT NULL,' +
    ' email TEXT NOT NULL,' +
    ' phone VARCHAR(12) NOT NULL' +
    ' );'

const saveShop =
    'INSERT INTO shops(shop_id, name, address, email, phone ) VALUES (DEFAULT, $1,$2,$3,$4) ' +
    ' RETURNING shop_id; '

const checkShopExists =
    'SELECT email , shop_id FROM shops ' + 'WHERE email = $1 ;'

const createCustomersTable =
    'CREATE TABLE IF NOT EXISTS customers (' +
    ' customer_id UUID PRIMARY KEY DEFAULT uuid_generate_v1mc(), ' +
    ' name VARCHAR(50) NOT NULL, ' +
    ' shop_id UUID REFERENCES shops, ' +
    ' phone VARCHAR(12) NOT NULL, ' +
    ' email VARCHAR(50) NOT NULL, ' +
    ' address VARCHAR(50) NOT NULL ' +
    ' );'

const saveCustomer =
    'INSERT INTO customers(customer_id, name, shop_id, phone, email, address ) VALUES (DEFAULT, $1, $2, $3, $4, $5) ' +
    ' RETURNING customer_id; '



const saveReceipt =
    'INSERT INTO receipts(shop_id, customer_id, amount, receipt_date, description ) VALUES ($1, $2, $3, $4, $5) ' +
    ' RETURNING receipt_id; '

const getCustomers =
   'SELECT * ' +
   'FROM customers ' +
   'WHERE shop_id = $1;'

const pool = new Pool({
  user: 'Dzonga',
  host: 'localhost',
  database: 'laundry',
  password: '',
  port: 5432
})

const createApplication = (async function () {
  try {
    await pool.query(createShopsTable)
    await pool.query(UUID)
    await pool.query(createCustomersTable)
    await pool.query(sql.createReceiptsTable)
  } catch (err) {
    console.log(err)
  }
})()


function requireAuth(req, res, next) {
	
	if ( req.authenticated.shop_id != null) {
		next()
	}
	else if ( req.authenticated.shop_id == null ) {
		res.status(403)
			.json({'error': 'session expired'})
			.end()
		
	}
	
}

app.all('/customers', requireAuth)
app.all('/receipts', requireAuth)


app
    .route('/shops')

    .all(
  [
    check('shop.name', 'Invalid name')
                .exists()
                .isLength({ min: 1 }),
    check('shop.address', 'Invalid address')
                .exists()
                .isLength({ min: 5 }),
    check('shop.email', 'Invalid email').isEmail(),
    check('shop.phone', 'Invalid phone #')
                .trim()
                .isLength({ min: 10, max: 12 })
                // .isNumeric()
                // .trim(),
  ],

        (req, res, next) => {
          next()
        }
    )

    .post(function (req, res, next) {
      const errors = validationResult(req)

      if (!errors.isEmpty()) {
        console.log(errors.mapped())
        res.status(422).json({ errors: errors.mapped() })
        res.end()
      } else {
        const shop = new Shop(
                req.body.shop.name,
                req.body.shop.address,
                req.body.shop.email,
                req.body.shop.phone
            )

            /* async function passwordHash() {

                const new_hash = await bcrypt.hash(shop.password, 10)
                return new_hash

            } */

        const save = (async function () {
          try {
            let newShop = await pool.query(saveShop, [
              shop.name,
              shop.address,
              shop.email,
              shop.phone
            ])
            shop_id = newShop.rows[0].shop_id
            res.json({ shop_id: shop_id })
            res.end()
          } catch (err) {
            console.log(err)

            res.json({ error: err })
          }
        })()
      }
    })

app.post(
    '/login',
  [
    check('email', 'Invalid email')
          .exists()
          .isEmail()
         // check("password", "Invalid").exists()
  ],
    (req, res, next) => {
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(422).json({ errors: errors.mapped() })
      } else {
        const login = (async function () {
          let email = req.body.email

          try {
            const token = await generateAuthToken()
            console.log(token)

            const set = promisify(redisClient.set).bind(redisClient)

            const storeToken = (async () => {
              try {
                const storeToken = await set(
                                token,
                                email,
                                'EX',
                                3600
                            )
              } catch (err) {
                console.log('error:', err)
              }
            })()

            // NEXT: Send token to email

            const sendToken = (async () => {
              let emailData = {
                'FromEmail': 'dzonga@dollartranscript.xyz',
                'FromName': 'Dzonga Prince',
                'Subject': 'Your Token',
                'Text-part': token,
                'Recipients': [{'Email': email}]

              }

              try {
                let sendMail = mailjet.post('send')
                let response = await sendMail.request(emailData)
                res.status(200).json({'message': 'OK'})
              } catch (err) {
                console.log(err)
              }
            })()
          } catch (err) {
            console.log(err)
            res.json({ error: err })
          }
        })()
      }
    }
)

app.post('/auth', [
  check('token', 'Invalid token')
        // .exists()
        .isLength({min: 5})

], (req, res, next) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    res.json({'errors': errors})
    console.log('errors:', errors)
  } else {
    let token = req.body.token
    let email = ''

    const exists = promisify(redisClient.exists).bind(redisClient)
    const getValue = promisify(redisClient.get).bind(redisClient)

    /* const checkToken = (async () => {
      try {
        if (await exists(token) == 0) {
          res.json({'error': 'token expired'})
        } else {
          return email = await getValue(token)
          console.log(email)
          // res.json({'message': 'logged In', 'email': email })
        }
      } catch (err) {
        console.log('error:', err)
      }
    })() */

    // email = await getValue(token)

    const returnShop = (async () => {
      try {
        email = await getValue(token)

        let potentialShop = await pool.query(checkShopExists, [email])
        let shop = potentialShop.rows[0]
        if (shop) {
          req.authenticated.shop_id = shop.shop_id
          console.log(req.authenticated.shop_id)
          res.status(201).json({'shop': shop })
        } else if (potentialShop.rows.length === 0) {
          res.status(201).json({'message': 'new shop'})
        }
      } catch (err) {
        console.log(err)
        res.status(501).json({ 'error': 'we could not find the shop'})
      }
    })()
  }
})

app
    .route('/customers')

    .all(
  [
    check('name', 'Invalid name')
                .exists()
                .isLength({ min: 1 }),
    check('phone', 'Invalid phone #')
                .exists()
                .isLength({ min: 5, max: 12 }),
    check('email', 'Invalid email').isEmail(),
    check('shop_id', 'Invalid shop_id')
                .exists()
                .isLength({ min: 10 }),
    check('address', 'Invalid address')
                .exists()
                .isLength({ min: 5 })
  ],

        (req, res, next) => {
          next()
        }
    )

    .post((req, res, next) => {
      console.log(req.authenticated.shop_id)

      const errors = validationResult(req)

      if (!errors.isEmpty()) {
        console.log(req.body)
        res.status(422).json({ errors: errors.mapped() })
      } else {
        const customer = new Customer(
                req.body.name,
                req.body.shop_id,
                req.body.phone,
                req.body.email,
                req.body.address
            )

        const save = (async function () {
          try {
            newCustomer = await pool.query(saveCustomer, [
              customer.name,
              customer.shop_id,
              customer.phone,
              customer.email,
              customer.address
            ])
            customer_id = newCustomer.rows[0].customer_id
            res.status(201).json({ customer_id: customer_id })
            res.end()
          } catch (err) {
            console.log(err)
            res.status(502).json({ error: err })
            res.end()
          }
        })()
      }
    })

    .get((req, res, next) => {
      let shop_id = req.authenticated.shop_id

      const query = (async() => {
        try {
          let dbResponse = await pool.query(getCustomers, [shop_id])

          let shops = dbResponse.rows

          res.status(200).json(shops)
        } catch (err) {
          console.log(err)
          res.status(502).json({'errors': err })
        }
      })()
    })

app
    .route('/receipts')

    .all(

        (req, res, next) => {
          next()
        }
    )

    .post((req, res, next) => {

      let receipt = req.body
      receipt.shop_id = req.authenticated.shop_id
	  receipt._id = Date.now()
		
	  const save = (async () => {
	  		
		  try {
			  
			  let dbResponse = await pool.query(sql.saveReceipt, [receipt])
			  
			  let receipts = dbResponse.rows
			  
			  const sendReceipt = (async() => {
			  	
				  try {
					  
					  let sendMail = mailjet.post('send')
					  let mailResponse = sendMail.request(receiptEmail.emailData)
					  
					  res.status(201).json({'message' : 'invoice sent'})
	
				  	
				  } catch (err) {
				  	console.log(err)
					res.status(501).json({'error': 'we could not send email'})
				  }
			  })()
			  
			  //res.status(201).json(receipts)
			  
		  }catch (err) {
		  		
			console.log(err)
			  res.status(501).json({'error' : 'we could not fulfull your request'})
		  }
		
	  })()
      
      

    })
	
	.get((req, res, next) => {
		
		let shop_id = req.authenticated.shop_id
		
		const allReceipts = ( async () => {
			
			try {
			
				let dbResponse = await pool.query(sql.getReceipts, [shop_id])
			
				let receipts = dbResponse.rows
			
				res.status(201).json(receipts)
				
			} catch (err) {
				console.log(err)
				res.status(501).json({'error' : 'could not get receipts'})
			}
			
		})()
	})

async function generateAuthToken () {
  return await crypto
        .randomBytes(Math.ceil(5 / 2))
        .toString('hex')
        .slice(0, 5)
}

// Authorization Headers validation (JWT) on /customers -- not sure if I still need to do this ?
// NEXT: Update  --/ Delete Customer -- indicates after receipts
// NEXT: Email a receipt
// NEXt: Send a email notification

app.listen(3000, function () {
  console.log('listening on port : 3000!')
})
