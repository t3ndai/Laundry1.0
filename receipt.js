const receipt = `<article>
	
	<h2> hi Name </h2>
	
	<h1> Thanks for your order, here are the details </h1>
	
	
	<table>
		
		
			<tr>
				<th colspan="2"> Order Number #101010 </th>
			</tr>
		
			<tr>
				<td> Item #1 </td>
				<td> $10 </td>
			</tr>
				
			<tr>
			
				<td> Item #2 </td>
				<td> $20 </td>
			
			</tr>
		
			<tr>
			
				<td> Item #3 </td>
				<td> $30 </td>
			
			</tr>
			
			<tr>
				
				<th colspan="2"> Total </th> 
				<th> $50 </th>
				
			</tr>
		
		
	</table>
	
	<h2> Enjoy, see you soon </h2>
	
</article>`
	
let emailData = {
	
                'FromEmail': 'dzonga@dollartranscript.xyz',
                'FromName': 'Dzonga Prince',
                'Subject': 'Your Receipt',
                'Html-part': receipt,
                'Recipients': [{'Email': 'ptdzonga@gmail.com'}]
	}
	
module.exports = {

	receipt : receipt,
	emailData : emailData  

}

