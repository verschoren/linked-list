const subdomain = 'yourdomain' //your Zendesk subdomain
const auth = '123457890qwerty=' //Base 64 encoded admin@domain.com/token:{Zendesk API token}

const headers_body = {
    'content-type': 'application/json;charset=UTF-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': '*',
    'Access-Control-Allow-Methods': 'GET,HEAD,POST,OPTIONS',
    'Access-Control-Max-Age': '86400',
}

//Helper function to merge the paginated results into one array
const merge = (first, second) => {
    for(let i=0; i<second.length; i++) {
        first.push(second[i]);
    }
    return first;
}
      
export default {
    async fetch(request, env) {
        try {
            if (request.method == 'OPTIONS') {
                return handleOptionsRequest(request)
            } else {
                const { pathname } = new URL(request.url);
                var path_part = pathname.split('/')
 
                //We return all records in the federated search index
                if (pathname.startsWith("/get")) {
                    var federated_items =[] //We will store all the paginated records in this array
                    const url = 'https://'+subdomain+'.zendesk.com/api/v2/guide/external_content/records';
                    var results = await getRecords(url,federated_items);
                    return new Response(JSON.stringify(results), {headers: headers_body});
                }

                //We add a new record to the federated search index
                if (pathname.startsWith("/add")) {
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
                    const response = await fetch(url, init);
                    const results = await response.json();
                    return new Response(JSON.stringify(results), {headers: headers_body});
                }
                
                //We delete a record from the federated search index
                if (pathname.startsWith("/delete")) {
                    const url = 'https://'+subdomain+'.zendesk.com/api/v2/guide/external_content/records/'+path_part[2];

                    var init = {
                        method: 'DELETE',
                        headers: {
                            'content-type': 'application/json;charset=UTF-8',
                            'Authorization': 'Basic ' + auth,
                        },
                    };
                    const response = await fetch(url, init);
                    return new Response('deleted', {headers: headers_body});
                }
                
                return new Response('Path not found', {status: 404,headers: headers_body});
            }
        } catch(e) {
            return new Response(err.stack, {status: 500,headers: headers_body});
        }
    }
}

//Function that gets all the records from the federated search index and handles pagination
async function getRecords(url,federated_items){
    var init = {
        method: 'GET',
        headers: {
            'content-type': 'application/json;charset=UTF-8',
            'Authorization': 'Basic ' + auth,
        },
    };

    const response = await fetch(url, init);
    const results = await response.json();


    merge(federated_items,results.records);

    //Check if the results are paginated and if so, call the function again
    if (results.meta.has_more == true){
        return await getRecords('https://'+subdomain+'.zendesk.com/api/v2/guide/external_content/records?page[size]=10&page[after]='+results.meta.after_cursor,federated_items);
    } else {
        return federated_items;
    }
}

//This fixes CORS error issues.
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