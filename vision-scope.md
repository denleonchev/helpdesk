# AI-based ticket management platform

## Problem

Support have to answer to tens of emails daily. They have to classify, resolve and respond to them. Support have to use canned responses to spare time

## Solution

Build ticket management system that leverages AI to automatically classify, respond and route tickets. It should result in personalized automatic responses and routing only complex issues to support

## User Roles

- **Admin** — created at deployment (seeded); can create and manage support agents
- **Support Agent** — created by admin; handles escalated tickets

## Ticket Model

**Statuses**

- `open` — ticket received, not yet resolved
- `resolved` — a response has been sent / issue addressed
- `closed` — no further action required, ticket archived

**Categories**

- `general_question` — general enquiries
- `technical_question` — product or technical support issues
- `refund_request` — billing and refund related requests

## Features

- Receive support email and create tickets
- Auto-generate human-friendly responses using a knowledge base
- Ticket list with filtering and sorting
- Ticket detail view
- AI-powered ticket classification
- AI summaries
- AI-suggested replies
- User management (admin only)
- Dashboard to view and manage all tickets
