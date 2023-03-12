const subdomain = 'internalnote' //your Zendesk subdomain
const auth = 'dGhvbWFzQHZlcnNjaG9yZW4uY29tL3Rva2VuOmR3QUZXZGlNcmxVdDJoVzFBQ0xYRDZiY1VvRjVUemRjc2NKandGMGs='
const headers_body = {
  'content-type': 'application/json;charset=UTF-8',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Allow-Methods': 'GET,HEAD,POST,OPTIONS',
  'Access-Control-Max-Age': '86400',
}
      
export default {
  async fetch(request, env) {
    try {
      if (request.method == 'OPTIONS') {
        return handleOptionsRequest(request)
      } else {
        const { pathname } = new URL(request.url);

        if (pathname.startsWith("/add")) {
          //Get the incoming enquiry
          var enquiry = JSON.stringify(await request.json());

          const url = 'https://'+subdomain+'.zendesk.com/api/v2/guide/external_content/records';

          var init = {
            body: enquiry,
            method: 'POST',
            headers: {
              'content-type': 'application/json;charset=UTF-8',
              'Authorization': 'Basic ' + auth,
            },
          };
          console.log(init)
          const response = await fetch(url, init);
          const results = await response.json();
          console.log(results)
          //return an array of suggested articles
          return new Response(JSON.stringify(results), {headers: headers_body});
        }
        
        if (pathname.startsWith("/get")) {
          var federated_items = {"records":[]}
          const url = 'https://'+subdomain+'.zendesk.com/api/v2/guide/external_content/records';
          var results = await getRecords(url,federated_items);
          console.log(results)

          //return an array of suggested articles
          return new Response(JSON.stringify(results), {headers: headers_body});
        }
        
        return new Response(OK, {status: 200,headers: headers_body});
      }
    } catch(e) {
      return new Response(err.stack, {status: 500,headers: headers_body});
    }
  }
}

async function getRecords(url,federated_items){
  console.log(['input',federated_items])
  var init = {
    method: 'GET',
    headers: {
      'content-type': 'application/json;charset=UTF-8',
      'Authorization': 'Basic ' + auth,
    },
  };
  const response = await fetch(url, init);
  const results = await response.json();
  console.log(results)
  //append results.records to federated_items.records
 
  
  federated_items.records.push(results.records);
  console.log(['output',federated_items]);
  if (results.meta.has_more == true){
    await getRecords('https://'+subdomain+'.zendesk.com/api/v2/guide/external_content/records?page[size]=10&page[after]='+results.meta.after_cursor,federated_items);
  } else {
    return federated_items;
  }
}

function handleOptionsRequest(request) {
  let headers = request.headers;
  if (
    headers.get("Origin") !== null &&
    headers.get("Access-Control-Request-Method") !== null &&
    headers.get("Access-Control-Request-Headers") !== null
  ){
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, HEAD, POST, OPTIONS",
        "Access-Control-Max-Age": "86400",
        "Access-Control-Allow-Headers": request.headers.get("Access-Control-Request-Headers"),
      }
    })
  }
  else {
    return new Response(null, {
      headers: {
        Allow: "GET, HEAD, POST, OPTIONS",
      },
    })
  }
}