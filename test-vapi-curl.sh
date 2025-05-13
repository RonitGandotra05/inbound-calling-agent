#!/bin/bash

# Load environment variables
if [ -f .env ]; then
  export $(grep -v '^#' .env | xargs)
fi

# Check if token exists
if [ -z "$VAPI_PRIVATE_KEY" ]; then
  echo "Error: VAPI_PRIVATE_KEY not found in environment variables"
  echo "Please run: export VAPI_PRIVATE_KEY=your_token_here"
  exit 1
fi

echo "1. Creating a phone number..."
PHONE_RESPONSE=$(curl -s -X POST https://api.vapi.ai/phone-number \
     -H "Authorization: Bearer $VAPI_PRIVATE_KEY" \
     -H "Content-Type: application/json" \
     -d '{"provider":"vapi"}')

echo "Phone number response:"
echo "$PHONE_RESPONSE" | jq .

# Extract the phone number ID
PHONE_ID=$(echo "$PHONE_RESPONSE" | jq -r '.id')
echo "Phone ID: $PHONE_ID"

if [ "$PHONE_ID" = "null" ] || [ -z "$PHONE_ID" ]; then
  echo "Failed to create phone number"
  exit 1
fi

echo -e "\n2. Creating an assistant with voice configuration..."
ASSISTANT_RESPONSE=$(curl -s -X POST https://api.vapi.ai/assistant \
     -H "Authorization: Bearer $VAPI_PRIVATE_KEY" \
     -H "Content-Type: application/json" \
     -d '{
       "name": "test-assistant",
       "model": {
         "provider": "cerebras",
         "model": "llama-3.3-70b",
         "messages": [
           {
             "role": "system",
             "content": "You are a helpful AI receptionist."
           }
         ]
       },
       "voice": {
         "provider": "11labs",
         "voiceId": "sarah",
         "cachingEnabled": true
       },
       "transcriber": {
         "provider": "11labs",
         "model": "scribe_v1",
         "language": "en"
       },
       "firstMessage": "Hello! How can I assist you today?"
     }')

echo "Assistant response:"
echo "$ASSISTANT_RESPONSE" | jq .

# If we get an error with 11labs, try default options
if [[ $(echo "$ASSISTANT_RESPONSE" | jq -r '.error // ""') == "Bad Request" ]]; then
  echo -e "\nRetrying with default configuration..."
  ASSISTANT_RESPONSE=$(curl -s -X POST https://api.vapi.ai/assistant \
       -H "Authorization: Bearer $VAPI_PRIVATE_KEY" \
       -H "Content-Type: application/json" \
       -d '{
         "name": "test-assistant",
         "model": {
           "provider": "cerebras",
           "model": "llama-3.3-70b",
           "messages": [
             {
               "role": "system",
               "content": "You are a helpful AI receptionist."
             }
           ]
         }
       }')
  
  echo "New assistant response:"
  echo "$ASSISTANT_RESPONSE" | jq .
fi

# Extract the assistant ID
ASSISTANT_ID=$(echo "$ASSISTANT_RESPONSE" | jq -r '.id')
echo "Assistant ID: $ASSISTANT_ID"

if [ "$ASSISTANT_ID" = "null" ] || [ -z "$ASSISTANT_ID" ]; then
  echo "Failed to create assistant"
  # Clean up the phone number
  echo -e "\nCleaning up phone number..."
  curl -s -X DELETE "https://api.vapi.ai/phone-number/$PHONE_ID" \
       -H "Authorization: Bearer $VAPI_PRIVATE_KEY"
  exit 1
fi

echo -e "\n3. Cleaning up resources..."
# Delete the assistant
echo "Deleting assistant..."
curl -s -X DELETE "https://api.vapi.ai/assistant/$ASSISTANT_ID" \
     -H "Authorization: Bearer $VAPI_PRIVATE_KEY"

# Delete the phone number
echo "Deleting phone number..."
curl -s -X DELETE "https://api.vapi.ai/phone-number/$PHONE_ID" \
     -H "Authorization: Bearer $VAPI_PRIVATE_KEY"

echo -e "\nTest completed successfully!" 