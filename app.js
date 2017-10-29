const express = require('express')
const app = express()
const bodyParser = require('body-parser')
const { Pool } = require('pg')
const { check , validationResult } = require('express-validator/check')
const { matchedData } = require('express-validator/filter')
const bcrypt = require('bcrypt')
require('dotenv').load()



/*
function Car(make, model, year) {
  this.make = make;
  this.model = model;
  this.year = year;
}

CREATE TABLE weather (
    city            varchar(80),
    temp_lo         int,           -- low temperature
    temp_hi         int,           -- high temperature
    prcp            real,          -- precipitation
    date            date
);

*/


app.use(bodyParser.json())

function Laundromat(name, address, email, phone, password ) {

	this.name = name
	this.address = address
	this.email = email
	this.phone = phone
	this.password = password
}


function Customer(name, laundromat_id, phone, email, address ) {

	this.name = name 
	this.laundromat_id = laundromat_id
	this.phone = phone 
	this.email = email 
	this.address = address

}


const createLaundryQuery = "CREATE TABLE IF NOT EXISTS laundromats (" +
				  " id   UUID PRIMARY KEY DEFAULT uuid_generate_v1mc()," +
				  " name TEXT NOT NULL," +
				  " address TEXT NOT NULL," +
				  " email TEXT NOT NULL," + 
				  " phone VARCHAR(12) NOT NULL," +
				  " password TEXT NOT NULL" +
				  " );"


const saveLaundromat = "INSERT INTO laundromats(name, address, email, phone, password) VALUES ($1,$2,$3,$4,$5)"


const pool = new Pool({
  user: 'Dzonga',
  host: 'localhost',
  database: 'laundry',
  password: '',
  port: 5432,

})



const createLaundromat = (async function() {
	await pool.query(createLaundryQuery);
	await pool.end();
})()


app.route('/laundromats')

	
	
	.all([

		
		check('name', 'Invalid name').exists().isLength({min: 1}),
		check('address', 'Invalid address').exists().isLength({min: 5}) ,
		check('email', 'Invalid email').isEmail(),
		check('phone', 'Invalid phone #').isLength({min: 10, max: 12}).isNumeric(),
		check('password', 'Invalid').exists() ], 

		function(req,res, next){

			next()


	}) 

	


	.post( function (req, res, next){

		
		const errors = validationResult(req)

		if (!errors.isEmpty()) {

			res.status(422).json({errors : errors.mapped() })
			res.end()

		}else {

			const laundromat = new Laundromat(req.body.name, req.body.address, req.body.email, req.body.phone, req.body.password )
			res.json(laundromat)
			res.end()

		}

		
		

	})


app.listen(3000, function() {
	
	console.log('listening on port : 3000!')
})

