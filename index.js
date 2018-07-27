const fileStream = require('fs');

let data = parseCsv('resources/data.csv');
let target = {
	u: 0.28295,
	v: 0.4689
};
//colors = {r: 40, g: 10, b: 80, w: 0, a: 35};
//let mix = mixColor(colors);
//iterateRandomColors(1000000);
successiveApproximateColors(10000);

function parseCsv(path) {
	let dataFile = fileStream.readFileSync(path, 'utf-8');

	let dataRows = dataFile.split('\n');
	let gamma = {};

	try {
		dataRows.forEach((row) => {
			let values = row.split(';');
			let color = values[0];
			if (color) {
				gamma[color] = {};
				if (values[1]) gamma[color].Lv = Number(values[1].trim().replace(',', '.'));
				gamma[color].data = [];
				for (let j = 2; j < values.length; j++) {
					gamma[color].data[j - 2] = Number(values[j].trim().replace(',', '.'))
				}
			}
		});
	}
	catch (e) {
		console.log(e);
		throw new EvalError('Can\'t parse csv')
	}
	return gamma;
}

function getGamma(color, value) {

	if (value < 0 || value > 255) throw new RangeError('The value must be between 0 and 255');

	let r = {}, g = {}, b = {}, w = {}, a = {};
	r.a = 0.0074;
	r.b = -0.146;
	g.a = 0.0101;
	g.b = -0.0069;
	b.a = 0.0082;
	b.b = -0.2287;
	w.a = 0.0113;
	w.b = 0.0213;
	a.a = 0.0095;
	a.b = -0.2001;

	let Lv;
	switch (color) {
		case 'r':
		case 'R':
			if (value > 25) Lv = value * r.a + r.b;
			else Lv = 0.000002 * Math.pow(value, 3) + 0.00002 * Math.pow(value, 2) - 0.0002 * value - 0.0000000000000009;
			break;
		case 'g':
		case 'G':
			Lv = value * g.a + g.b;
			break;
		case 'b':
		case 'B':
			if (value > 30) Lv = value * b.a + b.b;
			//else Lv = 0.000002 * Math.pow(value, 3) - 0.00002 * Math.pow(value, 2) - 0.0001 * value + 0.0002;
			else Lv = -6E-08 * Math.pow(value, 4) + 6E-06 * Math.pow(value, 3) - 9E-05 * Math.pow(value, 2) + 0.0003 * value + 4E-05;
			break;
		case 'w':
		case 'W':
			Lv = value * w.a + w.b;
			break;
		case 'a':
		case 'A':
			if (value > 25) Lv = value * a.a + a.b;
			else Lv = 0.000006 * Math.pow(value, 3) - 0.0001 * Math.pow(value, 2) + 0.0006 * value - 0.00008;
			break;

		default:
			throw new Error('Not valid colors');
	}
	return Lv
}

function getSumLv(colors) {
	let sum = 0;
	sum += getGamma('r', colors.r);
	sum += getGamma('g', colors.g);
	sum += getGamma('b', colors.b);
	sum += getGamma('w', colors.w);
	sum += getGamma('a', colors.a);

	return sum
}

function getXYZ(coordinate, colorMix) {
	let value = 0;

	if (coordinate === 'X' || coordinate === 'x') {
		colorMix.forEach((el, i) => {
			value += data.CIEx.data[i] * el
		})
	}
	else if (coordinate === 'Y' || coordinate === 'y') {
		colorMix.forEach((el, i) => {
			value += data.CIEy.data[i] * el
		})
	}
	else if (coordinate === 'Z' || coordinate === 'z') {
		colorMix.forEach((el, i) => {
			value += data.CIEz.data[i] * el
		})
	}
	else throw new Error('Not a valid coordinate');

	return value
}

function getxyz(coordinate, colorMix) {
	let value = 0;
	if (coordinate === 'X' || coordinate === 'x') {
		let X = getXYZ('X', colorMix);
		value = X / (X + getXYZ('Y', colorMix) + getXYZ('Z', colorMix))
	}
	else if (coordinate === 'Y' || coordinate === 'y') {
		let Y = getXYZ('Y', colorMix);
		value = Y / (Y + getXYZ('X', colorMix) + getXYZ('Z', colorMix))
	}
	else if (coordinate === 'Z' || coordinate === 'z') {
		let Z = getXYZ('Z', colorMix);
		value = Z / (Z + getXYZ('X', colorMix) + getXYZ('Y', colorMix))
	}

	else throw new Error('Not a valid coordinate');

	return value
}

function getU(colorMix) {
	let x = getxyz('x', colorMix);
	return 4 * x / (x + 15 * getxyz('y', colorMix) + 3 * getxyz('z', colorMix))
}

function getV(colorMix) {
	let y = getxyz('y', colorMix);
	return 9 * y / (getxyz('x', colorMix) + 15 * y + 3 * getxyz('z', colorMix))
}

// TODO Change parameter list to object
function mixColor(colors) {
	let mix = [];
	/* With ternary operator to eliminate the null point errors
	let LvR = (r) ? getGamma('r', r) / getGamma('r', 255) : 0;
	let LvG = (g) ? getGamma('g', g) / getGamma('g', 255) : 0;
	let LvB = (b) ? getGamma('b', b) / getGamma('b', 255) : 0;
	let LvW = (w) ? getGamma('w', w) / getGamma('w', 255) : 0;
	let LvA = (a) ? getGamma('a', a) / getGamma('a', 255) : 0;
	*/
	/*let LvR = getGamma('r', r) / getGamma('r', 255);
	let LvG = getGamma('g', g) / getGamma('g', 255);
	let LvB = getGamma('b', b) / getGamma('b', 255);
	let LvW = getGamma('w', w) / getGamma('w', 255);
	let LvA = getGamma('a', a) / getGamma('a', 255);
*/
	let LvR = getGamma('r', colors.r) / getGamma('r', 255);
	let LvG = getGamma('g', colors.g) / getGamma('g', 255);
	let LvB = getGamma('b', colors.b) / getGamma('b', 255);
	let LvW = getGamma('w', colors.w) / getGamma('w', 255);
	let LvA = getGamma('a', colors.a) / getGamma('a', 255);

	for (let i = 0; i < data.r.data.length; i++) {
		mix[i] = data.r.data[i] * LvR
			+ data.g.data[i] * LvG
			+ data.b.data[i] * LvB
			+ data.w.data[i] * LvW
			+ data.a.data[i] * LvA;
	}
	return mix
}

function generateRandomColors() {
	return {
		r: Math.floor(Math.random() * 255),
		g: Math.floor(Math.random() * 255),
		b: Math.floor(Math.random() * 255),
		w: Math.floor(Math.random() * 255),
		a: Math.floor(Math.random() * 255),
	}
}

function generateRandomColorsInRange(colors, range) {
	let c = {
		r: colors.r + Math.floor(Math.random() * range) * (Math.random() < 0.5 ? -1 : 1),
		g: colors.g + Math.floor(Math.random() * range) * (Math.random() < 0.5 ? -1 : 1),
		b: colors.b + Math.floor(Math.random() * range) * (Math.random() < 0.5 ? -1 : 1),
		w: colors.w + Math.floor(Math.random() * range) * (Math.random() < 0.5 ? -1 : 1),
		a: colors.a + Math.floor(Math.random() * range) * (Math.random() < 0.5 ? -1 : 1),
	};

	return {
		r: (0 < c.r === c.r < 255) ? c.r : (c.r < 0) ? 0 : 255,
		g: (0 < c.g === c.g < 255) ? c.g : (c.g < 0) ? 0 : 255,
		b: (0 < c.b === c.b < 255) ? c.b : (c.b < 0) ? 0 : 255,
		w: (0 < c.w === c.w < 255) ? c.w : (c.w < 0) ? 0 : 255,
		a: (0 < c.a === c.a < 255) ? c.a : (c.a < 0) ? 0 : 255,
	}
}

//TODO Add option for pass iterator
function iterateRandomColors(iterations) {
	console.log('###### TARGET #####');
	console.log(target);
	console.log('###### TARGET #####');
	iterations = iterations || 100000;
	let min = {};

	let colors, u, v, d;
	let a = 0, b = 0;

	for (let i = 0; i < iterations; i++) {
		if (i % 10000 === 0) console.log(`${i} iterations`);
		colors = generateRandomColors();
		//Initialize the min
		if (i === 0) {
			u = getU(mixColor(colors));
			v = getV(mixColor(colors));
			min.d = Math.pow(target.u - u, 2) + Math.pow(target.v - v, 2);
			min.colors = colors;
			min.u = u;
			min.v = v;
		}
		else {
			u = getU(mixColor(colors));
			v = getV(mixColor(colors));
			d = Math.pow(target.u - u, 2) + Math.pow(target.v - v, 2);
			if (min.d > d) {
				min.colors = colors;
				min.u = u;
				min.v = v;
				min.d = d;
				a++;
			}
			else if (min.d === Math.pow(target.u - u, 2) + Math.pow(target.v - v, 2)) {
				let minLv = getSumLv(min.colors);
				let Lv = getSumLv(colors);
				if (Lv > minLv && Lv < 8) {
					min.colors = colors;
					min.u = u;
					min.v = v;
					min.d = d;
					b++;
				}
			}
		}
	}
	console.log(min);
	console.log(`There is ${a} better and ${b} equivalent `);

	return min
}

//TODO Check if the conditions are good
function successiveApproximateColors(iterations) {
	iterations = iterations || 100000;
	let min = iterateRandomColors(iterations);
	let a = 0, b = 0;
	let colors, u, v, d;

	for (let j = 6; j > 0; j--) {
		for (let i = 0; i < iterations; i++) {
			if (i % 10000 === 0) console.log(`${i} iterations \n Where the d=${min.d}`);
			colors = generateRandomColorsInRange(min.colors, Math.pow(2, j));
			//Initialize the min
			u = getU(mixColor(colors));
			v = getV(mixColor(colors));
			d = Math.pow(target.u - u, 2) + Math.pow(target.v - v, 2);
			if (min.d > d) {
				min.colors = colors;
				min.u = u;
				min.v = v;
				min.d = d;
				a++;
			}
			else if (min.d === d) {
				let minLv = getSumLv(min.colors);
				let Lv = getSumLv(colors);
				if (Lv > minLv && Lv < 8) {
					min.colors = colors;
					min.u = u;
					min.v = v;
					min.d = d;
					b++
				}
			}
		}
	}
	console.log(min);
	console.log(`There is ${a} better and ${b} equivalent `);
	return min
}

/*
100k
{ d: 0.008875013185476878,
  colors: { r: 197, g: 74, b: 5, w: 76, a: 205 },
  u: 0.3463038657685725,
  v: 0.5386230297509694 }

  1M
  { d: 0.009113169483063191,
  colors: { r: 131, g: 229, b: 19, w: 18, a: 97 },
  u: 0.23335707631309408,
  v: 0.5504702850506722 }
 */