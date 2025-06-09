//returns us a fnc
const express = require('express');
const morgan = require('morgan');
const mongoose = require('mongoose');
const blogRoutes = require('./routes/blogRoutes');

//here, we are invoking that fnc to create an instance of express app --> gets stored in 'app'
const app = express();

// const dbURI = 'mongodb+srv://<credentials>@nodejs.wepkrky.mongodb.net/?appName=mongosh+2.5.2';
// const dbURI = 'mongodb://iziane:1234@localhost:3000/nodejs';


// const dbURI = 'mongodb+srv://iziane:1234@nodejs.wepkrky.mongodb.net/?appName=mongosh+2.5.2';
const dbURI = 'mongodb+srv://iziane:1234@nodejs.wepkrky.mongodb.net/node_DB';
// const dbURI = 'mongodb+srv://nodejs.wepkrky.mongodb.net/';

mongoose.connect(dbURI)
	.then((result) => {
		console.log('Connected to DB')
		app.listen(3000);
	})
	.catch((err) => console.log(err));

//register view engine
app.set('view engine', 'ejs');

// app.listen(3000);

/* Manual Middleware
	// app.use((req, res, next) => {
	// 	console.log('new request made');
	// 	console.log('host: ', req.hostname);
	// 	console.log('path: ', req.path);
	// 	console.log('method: ', req.method);
	// 	next();
	// });
*/

// app.use((req, res, next) => {
// 	console.log('In the next middleware');
// 	next();
// });

/*
	MiddleWare & static files (.css files, images etc..)
 */
app.use(express.static('public'));
app.use(express.urlencoded({extended: true}));
app.use(morgan('dev'));

//listens for request
app.get('/', (req, res) => {
	res.redirect('/blogs');
});

app.get('/about', (req, res) => {
	res.render('about', {
		title: 'Was diese'
	});
});

//redirect
app.get('/about-us', (req, res) => {
	res.redirect('/about');
});

/* Blog Routes */
// app.use(blogRoutes);
app.use('/blogs', blogRoutes);

/*
	Gefaehrlich, da not scopped out to specific URL, hence will be triggered
	everytime if Code reaches that point
*/
app.use((req, res) => {
	res.status(404).render('404', {
		title: '404 Not found'
	});
});
