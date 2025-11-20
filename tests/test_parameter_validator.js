/**
 * Test suite for parameter-validator.js
 * Run with: node tests/test_parameter_validator.js
 */

// Load the validator (simulate browser environment)
global.window = {};
const fs = require('fs');
const path = require('path');

// Load the validator code
const validatorCode = fs.readFileSync(
  path.join(__dirname, '../gui/js/parameter-validator.js'),
  'utf8'
);
eval(validatorCode);

const ParameterValidator = global.window.ParameterValidator;

// Test counters
let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`✓ ${message}`);
    passed++;
  } else {
    console.error(`✗ ${message}`);
    failed++;
  }
}

console.log('Testing Parameter Validator...\n');

// Test 1: Parameter count
console.log('Test 1: Parameter Count');
const count = ParameterValidator.getParamCount();
assert(count === 100, `Should have 100 parameters (got ${count})`);
console.log('');

// Test 2: Integer validation
console.log('Test 2: Integer Validation');
const finalKDef = ParameterValidator.getParamDef('FINAL_K');
assert(finalKDef !== undefined, 'FINAL_K definition exists');
assert(finalKDef.type === 'int', 'FINAL_K is type int');

const result1 = ParameterValidator.validate('FINAL_K', '10', finalKDef);
assert(result1.valid === true, 'Valid integer (10) passes');
assert(result1.value === 10, 'Integer value is converted correctly');

const result2 = ParameterValidator.validate('FINAL_K', '200', finalKDef);
assert(result2.valid === false, 'Integer above max (200) fails');

const result3 = ParameterValidator.validate('FINAL_K', 'abc', finalKDef);
assert(result3.valid === false, 'Non-numeric string fails');
console.log('');

// Test 3: Float validation
console.log('Test 3: Float Validation');
const bm25Def = ParameterValidator.getParamDef('BM25_WEIGHT');
assert(bm25Def !== undefined, 'BM25_WEIGHT definition exists');

const result4 = ParameterValidator.validate('BM25_WEIGHT', '0.3', bm25Def);
assert(result4.valid === true, 'Valid float (0.3) passes');
assert(result4.value === 0.3, 'Float value is converted correctly');

const result5 = ParameterValidator.validate('BM25_WEIGHT', '1.5', bm25Def);
assert(result5.valid === false, 'Float above max (1.5) fails');
console.log('');

// Test 4: Boolean validation
console.log('Test 4: Boolean Validation');
const evalMultiDef = ParameterValidator.getParamDef('EVAL_MULTI');
assert(evalMultiDef !== undefined, 'EVAL_MULTI definition exists');

const result6 = ParameterValidator.validate('EVAL_MULTI', true, evalMultiDef);
assert(result6.valid === true, 'Boolean true passes');
assert(result6.value === 1, 'Boolean true converts to 1');

const result7 = ParameterValidator.validate('EVAL_MULTI', '0', evalMultiDef);
assert(result7.valid === true, 'String "0" passes');
assert(result7.value === 0, 'String "0" converts to 0');
console.log('');

// Test 5: Enum validation
console.log('Test 5: Enum Validation');
const embeddingTypeDef = ParameterValidator.getParamDef('EMBEDDING_TYPE');
assert(embeddingTypeDef !== undefined, 'EMBEDDING_TYPE definition exists');

const result8 = ParameterValidator.validate('EMBEDDING_TYPE', 'openai', embeddingTypeDef);
assert(result8.valid === true, 'Valid enum value (openai) passes');

const result9 = ParameterValidator.validate('EMBEDDING_TYPE', 'invalid', embeddingTypeDef);
assert(result9.valid === false, 'Invalid enum value fails');
console.log('');

// Test 6: String validation
console.log('Test 6: String Validation');
const collectionDef = ParameterValidator.getParamDef('COLLECTION_NAME');
assert(collectionDef !== undefined, 'COLLECTION_NAME definition exists');

const result10 = ParameterValidator.validate('COLLECTION_NAME', 'code_chunks', collectionDef);
assert(result10.valid === true, 'Valid string passes');
console.log('');

// Test 7: URL validation
console.log('Test 7: URL Validation');
const qdrantDef = ParameterValidator.getParamDef('QDRANT_URL');
assert(qdrantDef !== undefined, 'QDRANT_URL definition exists');

const result11 = ParameterValidator.validate('QDRANT_URL', 'http://127.0.0.1:6333', qdrantDef);
assert(result11.valid === true, 'Valid URL passes');

const result12 = ParameterValidator.validate('QDRANT_URL', 'not-a-url', qdrantDef);
assert(result12.valid === false, 'Invalid URL fails');
console.log('');

// Test 8: Category filtering
console.log('Test 8: Category Filtering');
const retrievalParams = ParameterValidator.getParamsByCategory('retrieval');
assert(Object.keys(retrievalParams).length === 15, `Retrieval category has 15 params (got ${Object.keys(retrievalParams).length})`);

const embeddingParams = ParameterValidator.getParamsByCategory('embedding');
assert(Object.keys(embeddingParams).length === 10, `Embedding category has 10 params (got ${Object.keys(embeddingParams).length})`);
console.log('');

// Test 9: All parameter names
console.log('Test 9: All Parameter Names');
const allNames = ParameterValidator.getAllParamNames();
assert(allNames.length === 100, `getAllParamNames returns 100 names (got ${allNames.length})`);
assert(allNames.includes('FINAL_K'), 'Parameter list includes FINAL_K');
assert(allNames.includes('GRAFANA_DASHBOARD_UID'), 'Parameter list includes GRAFANA_DASHBOARD_UID');
console.log('');

// Test 10: Type conversion
console.log('Test 10: Type Conversion');
const converted1 = ParameterValidator.convertType('42', 'int');
assert(converted1 === 42, 'String "42" converts to int 42');

const converted2 = ParameterValidator.convertType('3.14', 'float');
assert(converted2 === 3.14, 'String "3.14" converts to float 3.14');

const converted3 = ParameterValidator.convertType(true, 'boolean');
assert(converted3 === 1, 'Boolean true converts to 1');
console.log('');

// Summary
console.log('='.repeat(50));
console.log(`Tests passed: ${passed}`);
console.log(`Tests failed: ${failed}`);
console.log(`Total tests: ${passed + failed}`);
console.log('='.repeat(50));

if (failed === 0) {
  console.log('\n✓ All tests passed!');
  process.exit(0);
} else {
  console.error(`\n✗ ${failed} test(s) failed`);
  process.exit(1);
}
