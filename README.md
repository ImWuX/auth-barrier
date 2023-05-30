# Auth Barrier
Auth Barrier is a simple authentication system meant for securing NGINX configurations. This method can be used to secure local applications with a reverse proxy. The main target audience of Auth Barrier are currently people who would like a simple system to secure public applications on their homelabs.

## Installation
1. Clone the github repository.
2. Copy the `.env.setup` file to `.env` and `web/.env.setup` to `web/.env` and configure them.
3. Run `npm run prod` in the root directory.
4. Finish deployment by setting up Auth Barrier as a daemon of some sort. Auth Barrier in production requires the environment variables present in `.env.prod`. These can be passed however you'd like.

`auth-barrier.service` contains an example of a systemd daemon for Auth barrier.