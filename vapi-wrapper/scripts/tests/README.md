# Vapi API Testing Scripts

This directory contains scripts for testing Vapi API integration.

## vapi-api-test.js

Tests various Vapi API operations related to phone numbers and assistants.

### Features:

- Lists all phone numbers
- Creates a new phone number
- Gets details of a specific phone number
- Deletes a phone number
- Lists all assistants
- Creates a new assistant
- Gets details of a specific assistant
- Deletes an assistant

### Usage:

1. Set your Vapi API token:
   ```bash
   export VAPI_TOKEN=your_token_here
   ```

2. Run the script:
   ```bash
   node scripts/tests/vapi-api-test.js
   ```

3. View the results in the console and in the generated log file in `scripts/tests/logs/`.

### Notes:

- This script will create actual resources on your Vapi account.
- At the end of the test, you'll be prompted before deletion operations occur.
- All API responses are logged to files in the `logs` directory for troubleshooting.

## vapi-app-integration-test.js

Tests the application's API endpoints that interact with Vapi.

### Features:

- Gets all user assistants from the app's API
- Creates a new assistant through the app's API
- Gets details of a specific assistant from the app's API

### Usage:

1. Make sure the application is running locally:
   ```bash
   npm run dev
   ```

2. Set your session token (required for authenticated endpoints):
   ```bash
   export SESSION_TOKEN=your_session_cookie_value
   ```

3. Run the script:
   ```bash
   node scripts/tests/vapi-app-integration-test.js
   ```

4. View the results in the console and in the generated log file in `scripts/tests/logs/`.

### Notes:

- You can get your session token from browser cookies after logging in (look for `next-auth.session-token`).
- This script tests application-level endpoints rather than direct Vapi API access.
- If no session token is provided, some tests will be skipped.

## Troubleshooting

If you're experiencing issues with phone numbers not showing for assistants, this test script can help diagnose the problems by:

1. Verifying your Vapi API token is working correctly
2. Testing phone number creation and retrieval
3. Testing assistant creation and assignment
4. Verifying the deletion processes work correctly

Log files contain detailed information about all API calls made during testing. 