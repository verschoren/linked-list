const subdomain = 'yourdomain' //your Zendesk subdomain
const auth = '123457890qwerty=' //Base 64 encoded admin@domain.com/token:{Zendesk API token}
const source_id = '01GT1VEVYWJ10HMZKMR5YRXQHB';

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
                var path_part = pathname.split('/')
 
                //We return all records in the federated search index
                if (pathname.startsWith("/get")) {
                    var results = await getRecords('',[]);
                    return new Response(JSON.stringify(results), {headers: headers_body});
                }

                //We add a new record to the federated search index
                if (pathname.startsWith("/add")) {
                    var enquiry = JSON.stringify(await request.json());
                    var results = await addRecord(enquiry);                    
                    return new Response(JSON.stringify(results), {headers: headers_body});
                }
                
                //We delete a record from the federated search index
                if (pathname.startsWith("/delete")) {
                    var result = await deleteRecord(path_part[2]);
                    return new Response('deleted ' + result, {headers: headers_body});
                }
                
                return new Response('Path not found', {status: 404,headers: headers_body});
            }
        } catch(e) {
            return new Response(err.stack, {status: 500,headers: headers_body});
        }
    }
}
async function deleteRecord(id){
    const url = 'https://'+subdomain+'.zendesk.com/api/v2/guide/external_content/records/'+id;

    var init = {
        method: 'DELETE',
        headers: {
            'content-type': 'application/json;charset=UTF-8',
            'Authorization': 'Basic ' + auth,
        },
    };
    const result = await fetch(url, init);
    return result;
}

async function addRecord(enquiry){
    const url = 'https://'+subdomain+'.zendesk.com/api/v2/guide/external_content/records';

    enquire.source_id = source_id;
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
    return id;
}

async function getRecords(url,federated_items){
    url = url != ''? url : 'https://'+subdomain+'.zendesk.com/api/v2/guide/external_content/records?page[size]=10';

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
        //filter federated_items to remove all records where source.id is not 01GT1VEVYWJ10HMZKMR5YRXQHB
        federated_items = federated_items.filter(function(item){
            return item.source.id == source_id;
        });

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

//Helper function to merge the paginated results into one array
const merge = (first, second) => {
    for(let i=0; i<second.length; i++) {
        first.push(second[i]);
    }
    return first;
}