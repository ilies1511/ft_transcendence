const fs = require('fs');

const src = './files/blog1.txt';
const dest = './files/blog2.txt';

const readStream = fs.createReadStream(src, {encoding: 'utf8'});
const writeStream = fs.createWriteStream(dest);
const writeStream2 = fs.createWriteStream('./files/blog3.txt');

readStream.on('data', (chunk) => {
	console.log('--- NEW CHUNK ---');
	// console.log(chunk.toString()); // if readme without second paramter of fnc 'fs.createReadStream()'
	console.log(chunk);
	writeStream.write('\nNEW CHUNK\n');
	writeStream.write(chunk);
});

//Piping
readStream.pipe(writeStream2);
/*
	is doing the same as above:
		1. Opening up readStream, reading data
		2. Everytime we get a chunk its piping that in the writeStream
*/
