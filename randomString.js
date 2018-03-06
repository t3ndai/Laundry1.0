const crypto = require('crypto')

async function generateAuthToken () {
  return await crypto
        .randomBytes(Math.ceil(15 / 2))
        .toString('hex')
        .slice(0, 15)
}

(async() => {
  console.log(await generateAuthToken())
})()
