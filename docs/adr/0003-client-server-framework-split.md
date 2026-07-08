# 0003 — Client/server framework split

The framework exports two separate entry points: `@aspen-os/framework/server` (7 core units: db, auth, logs, pubsub, rpc, storage, kvStore) and `@aspen-os/framework/client` (3 units: auth, logs stub, rpc stub).

The server framework manages database connections, PubSub, storage, and KV store — all of which require Node.js APIs. The client framework provides only the browser-compatible pieces: the better-auth React client, and stubs for logs and rpc that throw on server-side lifecycle methods. The default export (`@aspen-os/framework`) re-exports the server framework.

This split allows the Recruiter app to import framework types and auth client code in browser bundles without pulling in pg, pg-boss, or AWS SDK dependencies.
