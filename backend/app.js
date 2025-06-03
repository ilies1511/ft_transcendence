//returns us a fnc
const express = require('express');

//here, we are invoking that fnc to create an instance of express app --> gets stored in 'app'
const app = express();

//register view engine
app.set('view engine', 'ejs');

app.listen(3000);

//listens for request
app.get('/', (req, res) => {
	// res.render('index', {
	// 	title: 'Ilies',
	// 	message: 'Alo',
	// 	description: 'Ouey Zizou'
	// 	});
	res.render('index');
	// res.send('<p>Ouey Zizou</p>');
	// res.sendFile('./files/index.html', {root: __dirname});
});

app.get('/about', (req, res) => {
	res.render('about');
	// res.sendFile('./files/about.html', {root: __dirname});
	// res.send('<p>About Zizou</p>');
});

app.get('/blogs/create', (req, res) => {
	res.render('create');
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
	res.status(404).render('404');
	// res.status(404).sendFile('./files/404.html', {root: __dirname});
});
