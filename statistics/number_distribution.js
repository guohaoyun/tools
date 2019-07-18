function count(numbers, interval) {
  const result = {};
  for (const number of numbers) {
    const start = parseInt(number / interval) * interval;
    const end = start + interval;
    const key = `${start}-${end}`;
    if (result[key]) {
      result[key]++;
    } else {
      result[key] = 1;
    }
  }
  console.log(result);
}

const numbers = [];
for (let i = 0; i < 20; i++) {
  numbers.push(parseInt(Math.random() * 1000));
}

console.log(numbers);
count(numbers, 100);