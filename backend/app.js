//returns us a fnc
const express = require('express');

//here, we are invoking that fnc to create an instance of express app --> gets stored in 'app'
const app = express();

//register view engine
app.set('view engine', 'ejs');

app.listen(3000);

app.use((req, res, next) => {
	console.log('new request made');
	console.log('host: ', req.hostname);
	console.log('path: ', req.path);
	console.log('method: ', req.method);
	next();
});

app.use((req, res, next) => {
	console.log('In the next middleware');
	next();
});

//listens for request
app.get('/', (req, res) => {
	// res.render('index', {
	// 	title: 'Ilies',
	// 	message: 'Alo',
	// 	description: 'Ouey Zizou'
	// 	});
	const blogs = [
		{titel: 'Alo1', snippet: 'Ouey Zizou1'},
		{titel: 'Alo2', snippet: 'Ouey Zizou2'},
		{titel: 'Alo2', snippet: 'Ouey Zizou3 '},
	];
	res.render('index', {
		titel: 'The legend of Zizou',
		message: 'Zizou is the best',
		description: 'alo ',
		blogs: blogs,
	});
	// res.send('<p>Ouey Zizou</p>');
	// res.sendFile('./files/index.html', {root: __dirname});
});

app.get('/about', (req, res) => {
	res.render('about', {
		titel: 'Was diese'
	});
	// res.sendFile('./files/about.html', {root: __dirname});
	// res.send('<p>About Zizou</p>');
});

app.get('/blogs/create', (req, res) => {
	res.render('create', {
		titel: 'Bob der Baumeister'
	});
});

//redirect
app.get('/about-us', (req, res) => {
	res.redirect('/about');
});

/*
	Gefaehrlich, da not scopped out to specific URL, hence will be triggered
	everytime if Code reaches that point
*/
app.use((req, res) => {
	res.status(404).render('404', {
		titel: '404 Not found'
	});
	// res.status(404).sendFile('./files/404.html', {root: __dirname});
});
