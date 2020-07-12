function test1() {
  this.top = 1;
  test2();
}

function test2() {
  console.log(this.top);
  
}

test1();

console.log(Math.pow(2,24));
