# cloudflare-arkose-worker
Arkose provides an API to check for bots. It makes sense to validate the requests on the edge, before the requests hit the origin. 

This Cloudflare worker validates a request against the Arkose API. 
