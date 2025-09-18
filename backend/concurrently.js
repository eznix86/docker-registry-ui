import { concurrently } from "concurrently";

concurrently(
  [
    { command: "air -c .air.toml", name: "SERVER", prefixColor: "blue" },
    { command: "bun run dev", name: "VITE", prefixColor: "green" },
  ],
  {
    prefix: "name",
    killOthersOn: ["failure", "success"],
    restartTries: 1,
  }
);
