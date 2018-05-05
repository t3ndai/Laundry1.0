//Imports
const config = require('./config')
const mailjet = require('node-mailjet').connect(config.mailjet_client || 'c8b05b409eeb40b3d697f6e209fdd1c8', config.mailjet_secret || 'd050e921dfa823f8f869f49b24e7003b')

//Actions

function htmlReceipt (receipt) {
  
  return `<article>
	
	<h2> Hi ${receipt.customer.name} </h2>
	
	<h1> Thanks for your order, here are the details </h1>
	
	
      <table>
  
        <colgroup span='4'>
      
            <col span='3'>
            <col span='1'>
        </colgroup>
  
        <tr>
          <td> &nbsp; </td>
          <th> ${receipt.date} </th>
    
        <tr>
  
        <tr rowspan='5'>
          
          <tr> <td> Dzonga Shop </td></tr>
          <tr> <td> ptdzonga@gmail.com </td></tr>
          <tr> <td> 813 335 9871 </td></tr>
  
        </tr>
  
        <tr rowspan='3'>
  
          <tr> 
            <td> &nbsp; </td> 
            <td> ${receipt.customer.name} </td>
          </tr>
          <tr> 
            <td> &nbsp; </td>
            <td> ${receipt.customer.email} </td>
          </tr>
          <tr> 
            <td> &nbsp; </td>
            <td> ${receipt.customer.phone} </td>
          </tr>
  
        </tr>
  
        <tr colspan='4'>
  
          <th> Details </th>
  
        </tr>
  
        <tr>
          
          <td> ${receipt.details.item_1.detail } </td>
          <td> ${receipt.details.item_1.price } </td>
  
        </tr>
        
        <tr>
          
          <td> ${receipt.details.item_2.detail } </td>
          <td> ${receipt.details.item_2.price } </td>
  
        </tr>
        
        <tr>
          
          <td>  ${receipt.details.item_3.detail } </td>
          <td> ${receipt.details.item_3.price } </td>
  
        </tr>
        
        <tr>
      
          <th rowspan='2'> Total </th>
          <th rowspan='2'>  ${ receipt.total }   </th>
  
        </tr>
  
        <tr>
          <tr> <td> special notes </td></tr>
          <tr>
            <td rowspan='2'> ${receipt.notes} </td>
          </tr>
        
        </tr>
        
      </table>
	
	<h2> Enjoy, see you soon </h2>
	
</article>`
  
}

const sendReceipt = (htmlReceipt) => {

  try {

    let sendMail = mailjet.post('send')
    let mailResponse = sendMail.request(emailData(htmlReceipt))

    return 'ok'

  } catch (err) {
    console.log(err)

  }
}
	
let emailData = (receipt) => {
 return {
	
                'FromEmail': 'dzonga@dollartranscript.xyz',
                'FromName': 'Dzonga Prince',
                'Subject': 'Your Receipt',
                'Html-part': receipt,
                'Recipients': [{'Email': 'ptdzonga@gmail.com'}]
	}
}
	
module.exports = {

	htmlReceipt : htmlReceipt,
	emailData : emailData,
  sendReceipt : sendReceipt, 

}

