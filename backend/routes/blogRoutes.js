/*
	Davor war als Route: /blogs/create
	oder
		/blogs/:id

	jetzt:
		Nicht mehr noetig, da Prefix von app.use('/blogs', blogRoutes);
		kommt
 */
const express = require('express');
const router = express.Router();
const blogController = require('../controllers/blogController');

router.get('/', blogController.blog_index)
// router .get('/', (req, res) => {
// 	Blog.find().sort({createdAt: -1})
// 		.then((result) => {
// 			res.render('index', {
// 				title: 'All Blogs',
// 				blogs: result
// 			})
// 		})
// 		.catch((err) => {
// 			console.log(err);
// 		})
// })

router.post('/', blogController.blog_create_post);
// router.post('/', (req, res) => {
// 	console.log(req.body);
// 	const blog = new Blog(req.body);

// 	blog.save()
// 		.then((result) => {
// 			res.redirect('/blogs');
// 		})
// 		.catch((err) => {
// 			console.log(err);
// 		})
// });

router.get('/create', blogController.blog_create_get);
// router .get('/create', (req, res) => {
// 	res.render('create', {
// 		title: 'Bob der Baumeister'
// 	});
// });

router .get('/:id', blogController.blog_details)
// router .get('/:id', (req, res) => {
// 	const id = req.params.id;
// 	Blog.findById(id)
// 		.then(result => {
// 			res.render('details', { blog: result, title: 'Blog Details '})
// 		})
// 		.catch(err => {
// 			console.log(err);
// 		});
// });

router.delete('/:id', blogController.blog_delete);
// router.delete('/:id', (req, res) => {
// 	const id = req.params.id;
// 	Blog.findByIdAndDelete(id)
// 		.then(result => {
// 			res.json({ redirect: '/blogs '});
// 		})
// 		.catch(err => {
// 			console.log(err);
// 		});
// });

module.exports = router;
