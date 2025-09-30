# **MulmoChat Gemini**

MulmoChat is a prototype of ultimate NLUI application (NL \= Natural Language).

At this monent, it allows the user to

* generate images using Google's nano banana

## **Getting Started**

Install dependencies:

yarn install

Create .env file with following API keys:

GEMINI\_API\_KEY=...  
GOOGLE\_MAP\_API\_KEY=... (optional)  
EXA\_API\_KEY=... (optional)

\# For future implementation of Google Cloud Speech-to-Text  
\# GOOGLE\_APPLICATION\_CREDENTIALS=./path/to/your/credentials.json

Start a development server:

yarn dev

When you open the browser, allow it to access the microphone.

Click the "Start Voice Chat", and start talking to the AI, which has a capability to generate images.

## **About Reinstall**
rm -rf node_modules yarn.lock
yarn install
yarn dev
