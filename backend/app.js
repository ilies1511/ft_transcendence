//returns us a fnc
const express = require('express');

//here, we are invoking that fnc to create an instance of express app --> gets stored in 'app'
const app = express();

app.listen(3000);

//listens for request
app.get('/', (req, res) => {
	// res.send('<p>Ouey Zizou</p>');
	res.sendFile('./files/index.html', {root: __dirname});
});

app.get('/about', (req, res) => {
	res.sendFile('./files/about.html', {root: __dirname});
	// res.send('<p>About Zizou</p>');
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
	res.status(404).sendFile('./files/404.html', {root: __dirname});
});
