//returns us a fnc
const express = require('express');
const morgan = require('morgan');
const mongoose = require('mongoose');
const Blog = require('./models/blog')

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


/* Mongoose and mongo routes
app.get('/add-blog', (req, res) => {
const blog = new Blog({
	title: 'new blog 3',
	snippet: 'about my new blog',
	body: 'more about my new blog'
});

blog.save()
	.then((result) => {
		res.send(result)
	})
	.catch((err) => {
		console.log(err)
	});
});


app.get('/all-blogs', (req, res) => {
	Blog.find()
		.then((result) => {
			res.send(result);
		})
		.catch((err) => {
			console.log(err);
		})
})

app.get('/single-blog', (req, res) => {
	Blog.findById('68449137354829bb8291c317')
		.then((result) => {
			res.send(result);
		})
		.catch((err) => {
			console.log(err);
		});
}) */


//listens for request
app.get('/', (req, res) => {
	// res.render('index', {
	// 	title: 'Ilies',
	// 	message: 'Alo',
	// 	description: 'Ouey Zizou'
	// 	});

	// const blogs = [
	// 	{titel: 'Alo1', snippet: 'Ouey Zizou1'},
	// 	{titel: 'Alo2', snippet: 'Ouey Zizou2'},
	// 	{titel: 'Alo2', snippet: 'Ouey Zizou3 '},
	// ];
	// res.render('index', {
	// 	titel: 'The legend of Zizou',
	// 	message: 'Zizou is the best',
	// 	description: 'alo ',
	// 	blogs: blogs,
	// });

	res.redirect('/blogs');

	// res.send('<p>Ouey  Zizou</p>');
	// res.sendFile('./files/index.html', {root: __dirname});
});

app.get('/about', (req, res) => {
	res.render('about', {
		title: 'Was diese'
	});
	// res.sendFile('./files/about.html', {root: __dirname});
	// res.send('<p>About Zizou</p>');
});

app.get('/blogs', (req, res) => {
	Blog.find().sort({createdAt: -1})
		.then((result) => {
			res.render('index', {
				title: 'All Blogs',
				blogs: result
			})
		})
		.catch((err) => {
			console.log(err);
		})
})

app.post('/blogs', (req, res) => {
	console.log(req.body);
	const blog = new Blog(req.body);

	blog.save()
		.then((result) => {
			res.redirect('/blogs');
		})
		.catch((err) => {
			console.log(err);
		})
});

app.get('/blogs/create', (req, res) => {
	res.render('create', {
		title: 'Bob der Baumeister'
	});
});

app.get('/blogs/:id', (req, res) => {
	const id = req.params.id;
	Blog.findById(id)
		.then(result => {
			res.render('details', { blog: result, title: 'Blog Details '})
		})
		.catch(err => {
			console.log(err);
		});
});

app.delete('/blogs/:id', (req, res) => {
	const id = req.params.id;
	Blog.findByIdAndDelete(id)
		.then(result => {
			res.json({ redirect: '/blogs '});
		})
		.catch(err => {
			console.log(err);
		});
});

// app.get('/blogs/create', (req, res) => {
// 	res.render('create', {
// 		title: 'Bob der Baumeister'
// 	});
// });

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
		title: '404 Not found'
	});
	// res.status(404).sendFile('./files/404.html', {root: __dirname});
});
