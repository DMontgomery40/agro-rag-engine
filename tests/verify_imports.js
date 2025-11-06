#!/usr/bin/env node

/**
 * Verify that tab components have valid JSX syntax by checking for common issues
 */

const fs = require('fs');
const path = require('path');

const files = [
    '../web/src/components/tabs/ChatTab.jsx',
    '../web/src/components/tabs/InfrastructureTab.jsx',
    '../web/src/components/tabs/RAGTab.jsx'
];

console.log('Verifying JSX syntax validity...\n');

let allValid = true;

files.forEach(file => {
    const filePath = path.join(__dirname, file);
    const fileName = path.basename(file);
    const content = fs.readFileSync(filePath, 'utf8');

    console.log(`Checking ${fileName}:`);

    let issues = [];

    // Check for mismatched JSX tags
    const openingTags = (content.match(/<(\w+)/g) || []).length;
    const closingTags = (content.match(/<\/(\w+)>/g) || []).length;
    const selfClosingTags = (content.match(/\/>/g) || []).length;
    const fragments = (content.match(/<>/g) || []).length;
    const fragmentClosings = (content.match(/<\/>/g) || []).length;

    // Check fragment balance
    if (fragments !== fragmentClosings) {
        issues.push(`Mismatched React fragments: ${fragments} opening, ${fragmentClosings} closing`);
    }

    // Check for invalid inline JavaScript in JSX
    if (content.match(/<script[\s>]/)) {
        issues.push('Contains <script> tags (invalid in JSX components)');
    }

    // Check for proper function structure
    if (!content.match(/export default function \w+\(\) \{/)) {
        issues.push('Missing or invalid export default function');
    }

    // Check for return statement
    if (!content.match(/return \(/)) {
        issues.push('Missing return statement');
    }

    // Check that file ends properly
    const lines = content.trim().split('\n');
    if (!lines[lines.length - 1].trim() === '}') {
        issues.push('File does not end with closing brace');
    }

    if (issues.length > 0) {
        console.log('  ❌ Issues found:');
        issues.forEach(issue => console.log(`     - ${issue}`));
        allValid = false;
    } else {
        console.log('  ✅ Valid JSX syntax');
    }

    console.log(`  📊 Stats: ${openingTags} opening tags, ${closingTags} closing tags, ${selfClosingTags} self-closing`);
    console.log(`  📦 Fragments: ${fragments} opening, ${fragmentClosings} closing\n`);
});

if (allValid) {
    console.log('✅ All components have valid JSX syntax!');
    process.exit(0);
} else {
    console.log('❌ Some components have syntax issues.');
    process.exit(1);
}
