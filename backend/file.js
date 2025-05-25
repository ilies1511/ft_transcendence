const fs = require('fs'); // fs = filesystem

//reading files
fs.readFile('alo.txt', (err, data) => {
	if (err) {
		console.log(err);
	}
	console.log(data.toString());
});

console.log('last line');

//writing files
fs.writeFile('alo.txt', 'Wesh bien ou quoi', () => {  //Third argument is callback function
	console.log('finished writing file');
});
// directories

const dirname = './assets';

if (!fs.existsSync(dirname)) {

	fs.mkdir(dirname, (err) => {
		if (err) {
			console.log(err);
		}
		console.log('dir created');
	});
}
else {
	fs.rmdir(dirname, (err) => {
		if (err) {
			console.log(err);
		}
		console.log(`dir ${dirname} deleted`);
	});
	console.log(`aloooooo, ${dirname} already exists, but not anymore`);
}

// deleting files

const filepath = './deleteme.txt';

if (fs.existsSync(filepath)) {
	fs.unlink(filepath, (err) => {
		if (err) {
			console.log(err);
		}
		console.log(`file ${filepath} removed`);
	});
}
