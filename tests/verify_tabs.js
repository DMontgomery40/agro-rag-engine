#!/usr/bin/env node

/**
 * Simple smoke test to verify tab components are syntactically valid
 * and properly structured.
 */

const fs = require('fs');
const path = require('path');

const tabsDir = path.join(__dirname, '../web/src/components/tabs');
const tabFiles = ['ChatTab.jsx', 'InfrastructureTab.jsx', 'RAGTab.jsx'];

let errors = [];
let warnings = [];
let success = true;

console.log('Verifying tab components...\n');

for (const file of tabFiles) {
    const filePath = path.join(tabsDir, file);
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');

    console.log(`Checking ${file}:`);

    // Check 1: File should start with export default function
    if (!content.match(/^export default function \w+\(\)/m)) {
        errors.push(`${file}: Missing or invalid function export`);
        success = false;
    } else {
        console.log('  ✓ Has valid function export');
    }

    // Check 2: File should have return statement
    if (!content.includes('return (')) {
        errors.push(`${file}: Missing return statement`);
        success = false;
    } else {
        console.log('  ✓ Has return statement');
    }

    // Check 3: File should have React fragment syntax (<>)
    if (!content.includes('<>')) {
        errors.push(`${file}: Missing React fragment opening`);
        success = false;
    } else {
        console.log('  ✓ Has React fragment opening');
    }

    // Check 4: File should close the fragment properly
    if (!content.includes('</>')) {
        errors.push(`${file}: Missing React fragment closing`);
        success = false;
    } else {
        console.log('  ✓ Has React fragment closing');
    }

    // Check 5: File should end with closing brace
    const lastLine = lines[lines.length - 1].trim();
    const secondToLastLine = lines[lines.length - 2].trim();
    if (lastLine !== '}' && secondToLastLine !== '}') {
        errors.push(`${file}: Missing closing brace`);
        success = false;
    } else {
        console.log('  ✓ Has closing brace');
    }

    // Check 6: No script tags should be present
    if (content.includes('<script')) {
        errors.push(`${file}: Contains script tags (should not be in component)`);
        success = false;
    } else {
        console.log('  ✓ No script tags found');
    }

    // Check 7: No sidepanel content in ChatTab
    if (file === 'ChatTab.jsx' && content.includes('sidepanel')) {
        errors.push(`${file}: Contains sidepanel content (should be in App.jsx)`);
        success = false;
    } else if (file === 'ChatTab.jsx') {
        console.log('  ✓ No sidepanel content');
    }

    // Check 8: No extraneous comments at the end
    const lastFewLines = lines.slice(-10).join('\n');
    if (lastFewLines.includes('Tab: Admin') || lastFewLines.includes('Tab: Profiles')) {
        errors.push(`${file}: Contains extraneous comment at end`);
        success = false;
    } else {
        console.log('  ✓ No extraneous comments at end');
    }

    // Check 9: Proper structure (return, fragment, closing)
    const structurePattern = /return\s*\(\s*<>/;
    if (!structurePattern.test(content)) {
        warnings.push(`${file}: May have unusual component structure`);
    } else {
        console.log('  ✓ Has proper component structure');
    }

    console.log(`  File has ${lines.length} lines\n`);
}

console.log('\n=== RESULTS ===');
if (errors.length > 0) {
    console.log('\nErrors found:');
    errors.forEach(err => console.log('  ❌ ' + err));
}

if (warnings.length > 0) {
    console.log('\nWarnings:');
    warnings.forEach(warn => console.log('  ⚠️  ' + warn));
}

if (success) {
    console.log('\n✅ All tab components passed verification!');
    process.exit(0);
} else {
    console.log('\n❌ Verification failed. Please fix the errors above.');
    process.exit(1);
}
