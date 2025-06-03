const http = require('http');
const fs = require('fs');
const _ = require('lodash');

const server = http.createServer((request, response) => {

	// console.log(request.url, request.method);
	// console.log(request);

	const num = _.random(0, 20);
	console.log(num);

	response.setHeader('Content-Type', 'text/html');

	let path = './files/';

	switch(request.url)
	{
		case '/':
			path += 'index.html';
			response.statusCode = 200;
			break ;
		case '/about':
			path += 'about.html';
			response.statusCode = 200;
			break;
		case '/alo':
			path += 'about.html';
			response.statusCode = 200;
			break;
		case '/about-us':
			response.statusCode = 307;
			response.setHeader('Location', '/about')
			response.end();
			break;
		default:
			path += '404.html';
			response.statusCode = 404;
			break ;
	}

	// Sending HTML Page
	fs.readFile(path, (err, data) => {
		if (err) {
			console.log(err);
			response.end();
		}
		else {
			// response.write(data);
			response.end(data);
		}
	});

	// // response.write('Ouey Zizou');
	// response.write('<head> <link rel="styleseet" href="#"> </head>');
	// response.write('<p>Ouey Zizou</p>');
	// response.write('<p>Ouey Zizou Goaaaal</p>');
	// response.end();
});

server.listen(3000, '0.0.0.0', () => {
	console.log('listening for requests on port 3000');
});
