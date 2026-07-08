# Cocktail Host Assistant

A mobile-first web app that helps a host make cocktails for guests. Give it a
flavor brief; it generates a structurally-grounded, balanced cocktail (grounded
in the 6 Cocktail Codex templates), computes an exact ABV, and helps you perfect
the drink in real time through a convergence loop.

**Not a wrapper:** the LLM generates, but app-owned constraints, curated data,
and in-code computation decide what ships.

## Structure

```
cocktail-host/
  backend/    Node + Express + SQLite — generation, validation, ABV, persistence
  frontend/   React + Vite — mobile-first UI  (added later)
```

## Backend setup

```bash
cd backend
npm install
cp .env.example .env      # then fill in your values
npm run db:init           # create the SQLite database from schema.sql
npm run db:seed           # load the curated ingredient palette
npm test                  # run the test suite
npm run dev               # start the server (watch mode)
```

## Tech

React · Node.js · Express · SQLite (better-sqlite3) · server-side LLM

See `docs/spec.md` for the full design.
