function randomId(length) {
  let randomNum = 0;
  while (randomNum < 0.1) {
    randomNum = Math.random();
  }
  return parseInt(randomNum * Math.pow(10, length))
}


exports.randomId = randomId;