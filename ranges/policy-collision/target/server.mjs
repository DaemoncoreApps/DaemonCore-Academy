import http from 'node:http'

const objects = {
  'analytics-daily': { object: 'analytics-daily', project: 'analytics', classification: 'synthetic' },
  'finance-q4': { object: 'finance-q4', project: 'finance', classification: 'synthetic' },
}

http.createServer((request, response) => {
  response.setHeader('content-type', 'application/json')
  if (request.url === '/health') {
    response.end(JSON.stringify({ status: 'healthy' }))
    return
  }
  if (request.url === '/effective-policy') {
    response.end(JSON.stringify({ principal: 'analytics-role', action: 'object:Get', resource: 'project/*', organizationDeny: ['object:Delete'] }))
    return
  }
  if (!request.url.startsWith('/objects/')) {
    response.writeHead(404)
    response.end(JSON.stringify({ error: 'not found' }))
    return
  }
  if (request.headers.authorization !== 'Bearer analytics-role') {
    response.writeHead(401)
    response.end(JSON.stringify({ error: 'synthetic role token required' }))
    return
  }
  const object = objects[request.url.slice('/objects/'.length)]
  if (!object) {
    response.writeHead(404)
    response.end(JSON.stringify({ error: 'synthetic object not found' }))
    return
  }
  response.end(JSON.stringify({ ...object, authorized: true }))
}).listen(8082, '0.0.0.0')
