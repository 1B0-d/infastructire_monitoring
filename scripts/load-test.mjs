import { performance } from "node:perf_hooks";

const defaults = {
  url: "http://localhost:4002/health",
  requests: 300,
  concurrency: 20,
  method: "GET",
  timeoutMs: 5000,
  body: ""
};

const parseArgs = (argv) => {
  const args = { ...defaults, headers: {} };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = argv[i + 1];

    if (arg === "--url" && next) {
      args.url = next;
      i += 1;
    } else if (arg === "--requests" && next) {
      args.requests = Number.parseInt(next, 10);
      i += 1;
    } else if (arg === "--concurrency" && next) {
      args.concurrency = Number.parseInt(next, 10);
      i += 1;
    } else if (arg === "--method" && next) {
      args.method = next.toUpperCase();
      i += 1;
    } else if (arg === "--timeout-ms" && next) {
      args.timeoutMs = Number.parseInt(next, 10);
      i += 1;
    } else if (arg === "--body" && next) {
      args.body = next;
      i += 1;
    } else if (arg === "--header" && next) {
      const separator = next.indexOf(":");
      if (separator > -1) {
        const name = next.slice(0, separator).trim();
        const value = next.slice(separator + 1).trim();
        args.headers[name] = value;
      }
      i += 1;
    }
  }

  if (!Number.isFinite(args.requests) || args.requests < 1) {
    throw new Error("--requests must be a positive number");
  }
  if (!Number.isFinite(args.concurrency) || args.concurrency < 1) {
    throw new Error("--concurrency must be a positive number");
  }
  if (!Number.isFinite(args.timeoutMs) || args.timeoutMs < 1) {
    throw new Error("--timeout-ms must be a positive number");
  }

  args.concurrency = Math.min(args.concurrency, args.requests);
  return args;
};

const percentile = (values, p) => {
  if (values.length === 0) {
    return 0;
  }

  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, Math.min(index, sorted.length - 1))];
};

const run = async () => {
  const args = parseArgs(process.argv.slice(2));
  const latencies = [];
  const statusCounts = new Map();
  let completed = 0;
  let failures = 0;
  let nextRequest = 0;

  const startedAt = performance.now();

  const worker = async () => {
    while (nextRequest < args.requests) {
      nextRequest += 1;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), args.timeoutMs);
      const requestStarted = performance.now();

      try {
        const response = await fetch(args.url, {
          method: args.method,
          headers: args.headers,
          body: args.method === "GET" ? undefined : args.body,
          signal: controller.signal
        });

        const latency = performance.now() - requestStarted;
        latencies.push(latency);
        statusCounts.set(response.status, (statusCounts.get(response.status) || 0) + 1);

        if (response.status >= 400) {
          failures += 1;
        }

        await response.arrayBuffer();
      } catch {
        failures += 1;
        statusCounts.set("network_error", (statusCounts.get("network_error") || 0) + 1);
      } finally {
        clearTimeout(timeout);
        completed += 1;
      }
    }
  };

  await Promise.all(Array.from({ length: args.concurrency }, () => worker()));

  const durationSeconds = (performance.now() - startedAt) / 1000;
  const success = completed - failures;
  const averageMs = latencies.reduce((sum, value) => sum + value, 0) / Math.max(latencies.length, 1);
  const rps = completed / Math.max(durationSeconds, 0.001);

  console.log("Load test summary");
  console.log(`Target: ${args.method} ${args.url}`);
  console.log(`Requests: ${completed}`);
  console.log(`Concurrency: ${args.concurrency}`);
  console.log(`Success: ${success}`);
  console.log(`Failures: ${failures}`);
  console.log(`Duration: ${durationSeconds.toFixed(2)}s`);
  console.log(`RPS: ${rps.toFixed(2)}`);
  console.log(`Average latency: ${averageMs.toFixed(2)}ms`);
  console.log(`p95 latency: ${percentile(latencies, 95).toFixed(2)}ms`);
  console.log(`p99 latency: ${percentile(latencies, 99).toFixed(2)}ms`);
  console.log("Status counts:");

  for (const [status, count] of [...statusCounts.entries()].sort()) {
    console.log(`  ${status}: ${count}`);
  }

  if (failures > 0) {
    process.exitCode = 1;
  }
};

run().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
