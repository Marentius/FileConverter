#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Starter FileConverter test suite...\n');

const testResults = {
  unit: { passed: 0, failed: 0, time: 0 },
  integration: { passed: 0, failed: 0, time: 0 },
  e2e: { passed: 0, failed: 0, time: 0 }
};

function runTest(type, command) {
  console.log(`📋 Kjører ${type} tester...`);
  const startTime = Date.now();
  
  try {
    const output = execSync(command, { encoding: 'utf8', stdio: 'pipe' });
    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;
    
    // Parse test results
    const passedMatch = output.match(/(\d+) passing/);
    const failedMatch = output.match(/(\d+) failing/);
    
    testResults[type] = {
      passed: passedMatch ? parseInt(passedMatch[1]) : 0,
      failed: failedMatch ? parseInt(failedMatch[1]) : 0,
      time: duration
    };
    
    console.log(`✅ ${type} tester fullført (${duration.toFixed(1)}s)`);
    console.log(`   ✅ ${testResults[type].passed} passed, ❌ ${testResults[type].failed} failed\n`);
    
    return true;
  } catch (error) {
    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;
    
    testResults[type] = {
      passed: 0,
      failed: 1,
      time: duration
    };
    
    console.log(`❌ ${type} tester feilet (${duration.toFixed(1)}s)`);
    console.log(`   Feilmelding: ${error.message}\n`);
    
    return false;
  }
}

// Kjør tester
const unitSuccess = runTest('unit', 'npm run test:unit');
const integrationSuccess = runTest('integration', 'npm run test:integration');
const e2eSuccess = runTest('e2e', 'npm run test:e2e');

// Generer rapport
const totalPassed = testResults.unit.passed + testResults.integration.passed + testResults.e2e.passed;
const totalFailed = testResults.unit.failed + testResults.integration.failed + testResults.e2e.failed;
const totalTime = testResults.unit.time + testResults.integration.time + testResults.e2e.time;

console.log('📊 TEST SAMMENDRAG');
console.log('==================');
console.log(`Unit-tester:      ✅ ${testResults.unit.passed} passed, ❌ ${testResults.unit.failed} failed (${testResults.unit.time.toFixed(1)}s)`);
console.log(`Integrasjonstester: ✅ ${testResults.integration.passed} passed, ❌ ${testResults.integration.failed} failed (${testResults.integration.time.toFixed(1)}s)`);
console.log(`E2E-tester:       ✅ ${testResults.e2e.passed} passed, ❌ ${testResults.e2e.failed} failed (${testResults.e2e.time.toFixed(1)}s)`);
console.log(`Total:            ✅ ${totalPassed} passed, ❌ ${totalFailed} failed (${totalTime.toFixed(1)}s)`);

// Sjekk om alle tester passerte
const allTestsPassed = unitSuccess && integrationSuccess && e2eSuccess && totalFailed === 0;

if (allTestsPassed) {
  console.log('\n🎉 Alle tester passerte! FileConverter er klar for produksjon.');
  process.exit(0);
} else {
  console.log('\n❌ Noen tester feilet. Vennligst fiks feilene før du fortsetter.');
  process.exit(1);
}
