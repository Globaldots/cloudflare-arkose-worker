# cloudflare-arkose-worker
Arkose provides an API to check for bots. It makes sense to validate the requests on the edge, before the requests hit the origin. 

This Cloudflare worker validates a request against the Arkose API. 

## Setting up
Edit the in-code configuration section

		// ***** configuration **********	
		const private_key = 'XXXXXXXXXXXXXXXXXXXXXXX'
		
		// you could set up a workers KV and read the private key from there
		// const private_key = await MY_CREDENTIALS.get("arkose")

		// debug mode will return the arkose response
		let debug = false

		// options are: passthrough | redirect | respond 
		// passthrough: add a validation header to the origin request, let the origin decide
		// redirect:  send a 301 redirection to a failed validation page
		// respond:   internal rewriting to a failed validation page
		let behaviour = 'respond'  
		
		// for passthrough, the header to pass information to the origin
		let behaviour_passthrough_header = 'X-Arkose-Test'   

		// for respond, the url to rewrite to
		// let behaviour_respond_url = 'http://www.acme.com/'		
		let behaviour_respond_url = null 

		// for redirect, the url to redirect to
		let behaviour_redirect_url = 'http://www.acme.com/error_page' 

		// What to do if the call to Arkose is in error. 
		//             If true, fail the request. 
		//             If false, do not fail but send indication in the headers
		let behaviour_arkose_error_fail = true
		
		let form_methods = [ 'POST' ] 
		//******** End of Configuration ***********
