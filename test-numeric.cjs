// Quick Node.js test to verify numeric package works
// Run: node test-numeric.js

const numeric = require('numeric');

console.log('numeric loaded:', !!numeric);
console.log('numeric.uncmin exists:', typeof numeric.uncmin);

if (typeof numeric.uncmin === 'function') {
  console.log('\nTesting numeric.uncmin with simple quadratic...');
  
  // Minimize f(x,y) = (x-1)^2 + (y-2)^2
  const func = (v) => {
    const x = v[0];
    const y = v[1];
    return Math.pow(x - 1, 2) + Math.pow(y - 2, 2);
  };
  
  const start = [0, 0];
  console.log('Starting point:', start);
  
  try {
    const result = numeric.uncmin(func, start);
    console.log('Result:', result);
    
    const solution = result.solution || result.x || result;
    console.log('\nOptimal point:', solution);
    console.log('Function value at optimum:', func(solution));
    console.log('\nExpected: x=1, y=2, f=0');
    console.log('✓ Test passed!');
  } catch (err) {
    console.error('✗ Test failed:', err.message);
  }
} else {
  console.error('✗ numeric.uncmin not found!');
}
