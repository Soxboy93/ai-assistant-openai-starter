# AI Assistant (OpenAI API) - Starter

A minimal starter repository for building an AI assistant backed by the OpenAI API. This scaffold includes a tiny Node + Express server, example assistant logic, an OpenAPI spec, and a Dockerfile to run locally.

Quickstart
1. Copy `.env.example` to `.env` and set `OPENAI_API_KEY`.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run:
   ```bash
   npm start
   ```
4. POST JSON to `POST /api/assistant`:
   ```json
   {
     "messages": [
       { "role": "user", "content": "Explain recursion like I'm 5." }
     ]
   }
   ```

Files included
- src/index.js — Express server + API route
- src/assistant.js — Assistant helper using OpenAI client
- openapi.yaml — Minimal API spec for the assistant endpoint
- Dockerfile — Containerize the app
- .env.example — Environment variables example
- README.md, LICENSE, CONTRIBUTING.md

Security & costs
- Keep the API key secret (do not commit `.env`).
- Use rate limits and auth for production.
- Monitor token usage and set model/config appropriately to control costs.

License: MIT
