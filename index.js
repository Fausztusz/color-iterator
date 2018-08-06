const fileStream = require('fs');
const options = require('./resources/options');

//TODO Add option to get brighter results
let data = parseDataCsv(`resources/${options.sourceName}`);
runBatch(`resources/${options.targetName}`);

function parseDataCsv(path) {
	//TODO Remove unsafe dynamic name casting
	let values, color, gamma = {};
	try {
		let dataFile = fileStream.readFileSync(path, 'utf-8');

		let dataRows = dataFile.split('\n');


		dataRows.forEach((row) => {
			values = row.split(';');
			color = values[0];
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

function parseTargetCsv(path) {
	let values, targets = [];
	try {
		let dataFile = fileStream.readFileSync(path, 'utf-8');

		let dataRows = dataFile.split('\n');

		dataRows.forEach((row, i) => {
			if (i > 0 && row) {
				values = row.split(';');
				if (!values[0]) return;
				//i-1 because we throw away the 0. row witch is the header
				targets[i - 1] = {};
				targets[i - 1].name = values[0];
				targets[i - 1].u = Number(values[1].trim().replace(',', '.'));
				targets[i - 1].v = Number(values[2].trim().replace(',', '.'));
			}
		});
	}
	catch (e) {
		console.log(e);
		throw new EvalError(`Can't parse csv`)
	}
	return targets;
}

function runBatch(path, iterations) {
	iterations = iterations || 10000;

	let targets = parseTargetCsv(path);
	let results = [];
	let time = Date.now();

	targets.forEach((target, i) => {
		results[i] = {};
		results[i] = successiveApproximateColors(iterations, target);
		results[i].name = target.name;
		results[i].targetU = target.u;
		results[i].targetV = target.v;
	});
	console.log(`${targets.length} record was calculated in a total of ${(Date.now() - time) / 1000} seconds`);
	printToFile(options.resultName, results)
}

function printToFile(name, data) {
	let csv = "", keys;

//Dynamic header generate
	//keys = Object.keys(data[0]);
	keys = ['name', 'u', 'v', 'targetU', 'targetV', 'd', 'R', 'G', 'B', 'W', 'A'];
	keys.forEach((key) => {
		csv += `${key};`
	});
	data.forEach((row) => {
		csv += '\n';
		csv +=
			`${row.name};${row.u};${row.v};${row.targetU};${row.targetV};${row.d};\
			${row.colors.r};${row.colors.g};${row.colors.b};${row.colors.w};${row.colors.a}`;
	});

	fileStream.writeFile('results.csv', csv, (err) => {
		if (err) throw err;
		console.log(`The file has been saved to ${options.resultName}!`);
	});
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

function successiveApproximateColors(iterations, target) {

	console.log('###### TARGET #####');
	console.log(target);
	console.log('###### TARGET #####');

	iterations = iterations || 10000;
	let colors, u, v, d, iterationCount = 0;
	let a = 0, b = 0;
	let time = Date.now();
	let randomResult = iterateRandomColors(10 * iterations, target);
	let min = randomResult[0];
	iterationCount += randomResult[1];

	for (let j = 6; j > 0; j--) {
		for (let i = 0; i < iterations; i++) {
			if (iterationCount % 10000 === 0) console.log(`${iterationCount} iterations: Where the d=${min.d}`);
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
			iterationCount++
		}
	}
	min.Lv = getSumLv(min.colors);
	console.log(min);
	console.log(`There was ${a} better and ${b} equivalent`);
	console.log(`Calculation took ${(Date.now() - time) / 1000} second(s) \n\n`);
	return min
}

function iterateRandomColors(iterations, target) {
	iterations = iterations || 10000;
	let minArr = [];
	let diffArr = [];

	let colors, u, v, d;
	let improvement = 0, b = 0;

	/*
	let min = {};
	for (let i = 0; i < iterations; i++) {
		if (i % 10000 === 0 && i !== 0) console.log(`${i} iterations`);
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
				improvement++;
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
	}*/
	for (let i = 0; i < iterations; i++) {
		if (i % 10000 === 0 && i !== 0) console.log(`${i} iterations`);
		colors = generateRandomColors();
		if (i < 100) {
			u = getU(mixColor(colors));
			v = getV(mixColor(colors));
			minArr[i] = {};
			minArr[i].d = Math.pow(target.u - u, 2) + Math.pow(target.v - v, 2);
			minArr[i].colors = colors;
			minArr[i].u = u;
			minArr[i].v = v;
		}
		else {
			u = getU(mixColor(colors));
			v = getV(mixColor(colors));
			d = Math.pow(target.u - u, 2) + Math.pow(target.v - v, 2);
			try {
				minArr.forEach((minimum, iter) => {
					if (minArr[iter].d > d) {
						minArr[iter].colors = colors;
						minArr[iter].u = u;
						minArr[iter].v = v;
						minArr[iter].d = d;
						improvement++;
						throw new TypeError('Success')
					}
				})
			}
				//Break out from forEach loop
			catch (e) {
			}
		}
	}

	minArr.forEach((el, i) => {
		diffArr[i] = Math.abs(options.targetIntensity - el.Lv)
	});
	let indexOfMinValue = diffArr.reduce((iMax, x, i, arr) => x > arr[iMax] ? i : iMax, 0);

	console.log(`Generate starting point \nThere was ${improvement} better and ${b} equivalent `);
	return [minArr[indexOfMinValue], iterations]
}
