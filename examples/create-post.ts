/**
 * Run: MODIVA_API_KEY=mk_... npx tsx examples/create-post.ts
 */
import { Modiva } from "../src/index.js";

const modiva = new Modiva();

const connections = await modiva.connections.list();
if (connections.length === 0) {
  console.log("No connected accounts. Connect one in the dashboard first.");
  process.exit(0);
}

const post = await modiva.social.posts.create({
  connectionId: connections[0].id,
  text: "Posted with @modiva/node 🚀",
});

console.log("Created post:", post.id, post.status);
