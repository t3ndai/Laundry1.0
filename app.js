const app = require('express')()
const bodyParser = require('body-parser')
const cors = require('cors')
const config = require('./config')
const { Pool } = require('pg')
const { check, validationResult } = require('express-validator/check')
const { matchedData, sanitize } = require('express-validator/filter')
const crypto = require('crypto')
const redis = require('redis')
let redisClient
const { promisify } = require('util')
const mailjet = require('node-mailjet').connect(config.mailjet_client || 'c8b05b409eeb40b3d697f6e209fdd1c8', config.mailjet_secret || 'd050e921dfa823f8f869f49b24e7003b')
const clientSessions = require('client-sessions')
const sql = require('./sql')
const receiptEmail = require('./receipt')

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
  origin: ['http://localhost:3000', 'http://127.0.0.1:8080', 'http://localhost:8080'],
  credentials: true
}))

/*app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', 'http://127.0.0.1:8080')
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept')
  res.header('Access-Control-Allow-Credentials', true)
  res.header('Access-Control-Allow-Methods', 'OPTIONS, POST, GET, PATCH')
  next()
})*/

app.use(clientSessions({
  cookieName: 'authenticated',
  secret: '6aac4e2a1ab67ff',
  duration: 24 * 3600 * 1000
}))

//Models

function Shop (name, address, phone) {
  return {
    'name' : name,
    'phone' : phone, 
    'address' : address,
  }
}

function Customer (name, phone, email, address) {
  return {
    'name' : name,
    'phone' : phone,
    'email' : email,
    'address' : address,
  }
}

function Receipt (shop_id, customer_id, amount, receipt_date, description) {
  return {
    'shop_id' : shop_id,
    'customer_id' : customer_id,
    'amount' : amount,
    'receipt_date' : receipt_date,
    'description' : description,
  } 
}

(async () => {
  try {
    await promisify(redisClient.on).bind(redisClient)
  } catch (err) {
    console.log(err)
  }
})()


const pool = new Pool({
  user: 'Dzonga',
  host: 'localhost',
  database: 'laundry',
  password: '',
  port: 5432
})

const createApplication = (async function () {
  try {

    sql.prepareDB()
  } catch (err) {
    console.log(err)
  }
})()


function requireAuth(req, res, next) {
	
	if ( req.authenticated.shop_id != null) {
		next()
	}
	else if ( req.authenticated.shop_id == null ) {
		res.status(401)
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
    check('name', 'Invalid name')
                .exists()
                .isLength({ min: 1 }),
    check('address', 'Invalid address')
                .exists()
                .isLength({ min: 5 }),
    //check('shop.email', 'Invalid email').isEmail(),
    check('phone', 'Invalid phone #')
                .trim()
                .isLength({ min: 10, max: 12 })
               
  ],

        (req, res, next) => {
          next()
        }
    )

    .post(function (req, res, next) {
      const errors = validationResult(req)

      if (!errors.isEmpty()) {
        console.log(errors.mapped())
        res.status(400).json({ errors: errors.mapped() })
        res.end()
      } else {
        const shop = new Shop(
                req.body.name,
                req.body.address,
                //req.body.shop.email,
                req.body.phone
            )
            
        console.log(shop)
        const email = req.authenticated.email 
        let shop_id = Date.now()
        console.log(shop_id)

        const save = (async function () {
          try {
            
            const saveShop = sql.saveShop(shop_id, shop.name, shop.phone, email, shop.address)
            
            if (saveShop === 'ok') {
              req.authenticated.shop_id = shop_id
              res.status(201).json({'message': 'ok'})
            }

          } catch (err) {
            console.log(err)

            res.status(501).json({ error: err })
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
      console.log(req.body)
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.mapped() })
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
                req.authenticated.email = email
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
    res.status(400).json({'errors': errors})
    console.log('errors:', errors)
  } else {
    let token = req.body.token
    let email = ''
    
    console.log(req.authenticated.email, 'email cookie')

    const exists = promisify(redisClient.exists).bind(redisClient)
    const getValue = promisify(redisClient.get).bind(redisClient)

    const checkToken = (async () => {
      try {
        if (await exists(token) == 0) {
          res.status(400).json({'error': 'token expired'})
        } else {
          //return email = await getValue(token)
          await returnShop(token)
          console.log(email)
          // res.json({'message': 'logged In', 'email': email })
        }
      } catch (err) {
        console.log('error:', err)
      }
    })() 

    // email = await getValue(token)

    const returnShop = (async (token) => {
      try {
        email = await getValue(token)
        
        let shop = sql.checkShopExists(email)
        
        if (shop === '') {
          res.status(201).json({'message' : 'new shop'})
        }else {
          req.authenticated.shop_id = shop.shop_id
          res.status(201).json({'shop_id' : 'shop_id'})
        }
          
          
      } catch (err) {
        console.log(err)
        res.status(501).json({ 'error': 'we could not find the shop'})
      }
    })
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
                .isLength({ min: 10, max: 12 }),
    check('email', 'Invalid email').isEmail(),
    /*check('shop_id', 'Invalid shop_id')
                .exists()
                .isLength({ min: 10 }),
    check('address', 'Invalid address')
                .exists()
                .isLength({ min: 5 })*/
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
        res.status(400).json({ errors: errors.mapped() })
      } else {
        const customer = new Customer(
                req.body.name,
                req.body.phone,
                req.body.email,
                req.body.address
            )

        const save = (async function () {
          try {
                    
            let customer_id = Date.now()
            let shop_id = req.authenticated.shop_id
            
            
            let saveCustomer = sql.saveCustomer(customer_id, shop_id, customer.name, customer.phone, customer.email, customer.address)
              
              if (saveCustomer === 'ok') {
                res.status(201).json({'message' : 'ok' })
              }
  
          } catch (err) {
            console.log(err)
            res.status(501).json({ error: err })
            res.end()
          }
        })()
      }
    })

    .get((req, res, next) => {
      
      let shop_id = req.authenticated.shop_id
      
      console.log(shop_id)

      const query = (async() => {
        try {
        
          let shops = sql.getCustomers(shop_id)

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
      let shop_id = req.authenticated.shop_id
	    let receipt_id = Date.now()
      let customer_id = receipt.customer.customer_id
      let total = receipt.total
		

    
	  const save = (async () => {
	  		
		  try {
			  
        let savedReceipt = sql.saveReceipt(receipt_id, shop_id, total, JSON.stringify(receipt), customer_id)
      
        if (savedReceipt === 'ok') {
          res.status(201).json({'message': 'ok'})
        } 

			  const sendReceipt = (async() => {
			  	
				  try {
					  
					  let sendMail = mailjet.post('send')
					  let mailResponse = sendMail.request(receiptEmail.emailData)
					  
					  res.status(201).json({'message' : 'invoice sent'})
	
				  	
				  } catch (err) {
				  	console.log(err)
					  res.status(501).json({'error': 'we could not send email'})
				  }
			  })
			  
			  
		  }catch (err) {
		  		res.status(501).json({'error' : 'we could not fulfull your request'})
			    console.log(err)
			  
		  }
		
	  })()
      
      

    })
	
	.get((req, res, next) => {
		
		let shop_id = req.authenticated.shop_id
		
		const allReceipts = ( async () => {
			
			try {
        
        /*let query = {
          text : sql.getReceipts,
          values : [shop_id],
          //rowMode : 'array'
        }
			
				let dbResponse = await pool.query(query) //(sql.getReceipts, [shop_id], rowMode: 'array')
			
				let receipts = dbResponse.rows*/
          
        let receipts = sql.getReceipts(shop_id)
        
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

// Authorization Headers validation (JWT) on /customers -- not sure if I still need to do  ?
// NEXT: Update  --/ Delete Customer -- indicates after receipts
// NEXT: Email a receipt
// NEXt: Send a email notification

app.listen(3000, function () {
  console.log('listening on port : 3000!')
})
