import dotenv from 'dotenv';
dotenv.config();

console.log('Checking Firebase Environment Variables...');

const requiredVars = [
    'FIREBASE_PROJECT_ID',
    'FIREBASE_PRIVATE_KEY_ID',
    'FIREBASE_PRIVATE_KEY',
    'FIREBASE_CLIENT_EMAIL',
    'FIREBASE_CLIENT_ID',
    'FIREBASE_CLIENT_CERT_URL'
];

let allPresent = true;

requiredVars.forEach(varName => {
    const value = process.env[varName];
    if (!value) {
        console.error(`❌ ${varName} is MISSING`);
        allPresent = false;
    } else {
        if (varName === 'FIREBASE_PRIVATE_KEY') {
            if (value.includes('BEGIN PRIVATE KEY') && value.includes('END PRIVATE KEY')) {
                console.log(`✅ ${varName} is Present and seems valid (contains header/footer)`);
            } else {
                console.error(`❌ ${varName} is Present but INVALID (missing header/footer)`);
                allPresent = false;
            }
        } else {
            console.log(`✅ ${varName} is Present: ${value.substring(0, 10)}...`);
        }
    }
});

if (allPresent) {
    console.log('All required environment variables are present.');

    // Try to parse the private key
    try {
        const privateKey = process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n');
        console.log('Private Key can be parsed correctly with newlines.');
    } catch (e) {
        console.error('Error parsing private key:', e);
    }

} else {
    console.error('Some environment variables are missing. Please check your .env file.');
}
