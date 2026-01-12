# API Specification

Base URL: `/api`

## Authentication (`/api/auth`)

- `POST /register`: Register a new user/tenant.
- `POST /login`: Authenticate a user and return a JWT.
- `GET /me`: Get current user details (requires auth).

## Clients (`/api/clients`)

- `GET /`: List all clients for the authenticated tenant.
- `POST /`: Create a new client.
- `GET /:id`: Get details of a specific client.
- `PUT /:id`: Update client details.
- `DELETE /:id`: Delete a client.

## Bookings (`/api/bookings`)

- `GET /`: List all bookings.
- `POST /`: Create a new booking.
- `PUT /:id`: Update a booking (e.g., status).
- `DELETE /:id`: Cancel/Delete a booking.

## Payments (`/api/payments`)

- `POST /create-payment-intent`: Create a Stripe payment intent.
- `POST /webhook`: Stripe webhook handler.
- `GET /subscription`: Get subscription status.

## Chat (`/api/chat`)

- `POST /message`: Send a message to the AI chatbot.
- `GET /history`: Get chat history (if persisted).

## Voice (`/api/voice`)

- `POST /incoming`: Handle incoming calls (Twilio webhook).
- `GET /token`: Get Twilio capability token for frontend client.

## Minutes (`/api/minutes`)

- `GET /`: List meeting minutes.
- `POST /`: Save new meeting minutes.
