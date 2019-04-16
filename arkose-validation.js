addEventListener('fetch', event => {
	event.passThroughOnException()
	event.respondWith(validateArkose(event.request))
})

async function validateArkose(request) {
	try // global try
	{
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
		
		// check if we have to do anything at all
		console.log("request" + JSON.stringify(request))
		if (!form_methods.includes( request.method.toUpperCase() ) ) {
					response = await fetch(request);
					return response;
		}		

		// clone the request to retrieve the POST data without disturbing the original request
		newrequest = request.clone()
		session_token = await retrieveSessionToken('fc-token', newrequest)

		// Make the request mutable by re-constructing the Request. We want to possibly add a header.
		request = new Request(request)

		var response = null
		// Arkose was bypassed completely
		if (!session_token && !debug) {
			  switch(behaviour) {
				case 'passthrough': 
					request.headers.set(behaviour_passthrough_header, 'notoken');
					response = await fetch(request);
					return response;
					break;
				case 'respond': 
					if ( behaviour_respond_url ) {
						respond_request = new Request(behaviour_respond_url)
						console.log("respond_request - " + JSON.stringify(respond_request))
						response = await fetch(respond_request, {method: 'GET'});
						response = new Response(response)
						response.status = 403
						response.statusText = 'Failed Turing Test'
					} else {
						response=  new Response('Sorry, this page is not available.',
							{ status: 403, statusText: 'Failed Turing Test' })
					}
					return response;
					break;
				case 'redirect': 
					return Response.redirect(behaviour_redirect_url, 301)
					break;
				default:
					request.headers.set(behaviour_passthrough_header, 'notoken');
					response = await fetch(request);
					return response;
			  }
		}  // no session token

		try { 
			var arkose_response =  await fetch_from_arkose(request, private_key, session_token) 
		} 
		catch(err) {
			// what to do if the Arkose call fails completely
			if (debug) { // return a debugging JSON response
				const JSONresponseInit = {
				  headers: {'Content-Type': 'application/json'}
				}

					const debugResponse  = {
						request	: request, 
						session_token: session_token, 
						fc_response: arkose_response 
					}
				
				return new Response(JSON.stringify(debugResponse), JSONresponseInit)
			} 
			else if (behaviour_arkose_error_fail)  {  // if Arkose fails, everything fails
					return new Response(err.message,
							{ status: 503, statusText: 'Arkose Failure' })
			} 
			else { // arkose failed, neither debug nor full failure are required. 
					request.headers.set(behaviour_passthrough_header, 'arkose_error');
					response = await fetch(request);
					return response;
			}
		}

		var solved = false
		switch (arkose_response.solved) {
				case undefined: 
					solved = false 
					console.log("solved undefined" ) 
					break;
				case true: 
					solved = true
					console.log("solved true" ) 
					break;
				case 'true' : 
					solved = true 
					console.log("solved 'true'" ) 
					break;
				default:
					solved = false
					console.log("solved default" ) 
          
		}
		console.log("arkose_response - " +  JSON.stringify(arkose_response)) 
		console.log("solved - " +  solved) 
		if (solved == true || solved == 'true') {
			// finally, this is what happens when the Arkose puzzle is solved. 
			console.log("behaviour " +  behaviour) 
			request.headers.set(behaviour_passthrough_header, 'success');
			response = await fetch(request);
			return response;			
		}
		else { // failed Arkose test
			switch(behaviour) {
				case 'passthrough': 
					request.headers.set(behaviour_passthrough_header, 'failure not solved' );
					response = await fetch(request);
					return response;
					break;
				case 'respond': 
					if ( behaviour_respond_url ) {
						respond_request = new Request(behaviour_respond_url)
						console.log("respond_request - " + JSON.stringify(respond_request))
						response = await fetch(respond_request, {method: 'GET'});
						response = new Response(response)
						response.status = 403
						response.statusText = 'Failed Turing Test'
					} else {
						response=  new Response('Sorry, this page is not available.',
							{ status: 403, statusText: 'Failed Turing Test' })
					}
					return response;
					break;
				case 'redirect': 
					return Response.redirect(behaviour_redirect_url, 301)
					break;
				default:
					request.headers.set(behaviour_passthrough_header, 'failure not solved' );
					response = await fetch(request);
					return response;
			  }
		}  // not solved 
		
		// finally, this is what happens when the Arkose puzzle is solved. 
		request.headers.set(behaviour_passthrough_header, 'success');
		response = await fetch(request);
		return response;
	} 
	catch(err) // global try
	{
		return new Response(err.stack || err)
	}
}

async function retrieveSessionToken(tokenName, request) {
	switch(request.method) {
	  case 'POST':
			try {
				var postData = await request.formData();
				var session_token = `${postData.get(tokenName)}`
			} 
			catch (err) {
				var session_token = null
			}
		break;
	  case 'GET':
			try {
				var session_token = getParameterByName(tokenName, url)
			} 
			catch (err) {
				var session_token = null
			}
		break;
	  default:
		var session_token = null
	}
	return session_token

}

function getParameterByName(name, url) {
    if (!url) url = event.request.url;
    let params = new URLSearchParams(url);
    return params.get(name);
}


async function logToSiem(request, internalmessage) {
  var ray  = request.headers.get('cf-ray') || '';
  var id   = ray.slice(0, -4);
  var data = {
    'timestamp':  Date.now(),
    'url':        request.url,
    'referer':    request.referrer,
    'method':     request.method,
    'ray':        ray,
    'ip':         request.headers.get('cf-connecting-ip') || '',
    'host':       request.headers.get('host') || '',
    'ua':         request.headers.get('user-agent') || '',
    'cc':         request.headers.get('Cf-Ipcountry') || '',
    'colo':       request.cf.colo,
    'tlsVersion': request.cf.tlsVersion || '',
    'tlsCipher':  request.cf.tlsCipher || '',
    'msg':     internalmessage
  };
  
  const yourSIEM = 'https://yoursiem.yourdomain.com/xyz'
  await fetch(yourSIEM, {
    method: 'POST',
    body: JSON.stringify(data),
    headers: new Headers({
      'Content-Type': 'application/json',
    })
  })
}



async function fetch_from_arkose(request, private_key, session_token) {
	let arkose_api_base='https://verify.arkoselabs.com/fc/v/'
	
	var arkose_api_url = new URL(arkose_api_base)
	
	var params = {private_key:private_key, session_token:session_token} 
	arkose_api_url.search = new URLSearchParams(params)
	arkose_request = new Request(arkose_api_url)
	console.log( JSON.stringify("arkose_request " + arkose_request)) 
	console.log( JSON.stringify("arkose_api_url " + arkose_api_url)) 
	var arkose = await fetch(arkose_request, {method: 'GET'})
	var arkose_response =  await arkose.json()

	return arkose_response

}
