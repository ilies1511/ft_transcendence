const people = ['izi', 'zizou', 'sehween', 'gwineeth'];
const ages = [1, 19, 20, 30, 45];

console.log(people);

// module.exports = 'hello';
module.exports = people; //single
module.exports = {
	people, ages
}
