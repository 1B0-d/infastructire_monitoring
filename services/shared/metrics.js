import client from "prom-client";

client.collectDefaultMetrics();

const httpRequestsTotal = new client.Counter({
  name: "sre_http_requests_total",
  help: "Total number of HTTP requests",
  labelNames: ["service", "method", "route", "status_code"]
});

const httpRequestDuration = new client.Histogram({
  name: "sre_http_request_duration_seconds",
  help: "HTTP request duration in seconds",
  labelNames: ["service", "method", "route", "status_code"],
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5]
});

const httpErrorsTotal = new client.Counter({
  name: "sre_http_errors_total",
  help: "Total number of HTTP error responses",
  labelNames: ["service", "method", "route", "status_code"]
});

const serviceHealth = new client.Gauge({
  name: "sre_service_health",
  help: "Service health status, 1 means healthy and 0 means unhealthy",
  labelNames: ["service"]
});

const serviceUptime = new client.Gauge({
  name: "sre_service_uptime_seconds",
  help: "Service uptime in seconds",
  labelNames: ["service"],
  collect() {
    for (const service of registeredServices) {
      this.set({ service }, process.uptime());
    }
  }
});

const registeredServices = new Set();

const routeLabel = (req) => {
  const base = req.baseUrl || "";
  const route = req.route?.path || req.path || req.originalUrl || "unknown";
  return `${base}${route}` || "unknown";
};

export const metricsMiddleware = (serviceName) => {
  registeredServices.add(serviceName);
  serviceHealth.set({ service: serviceName }, 1);

  return (req, res, next) => {
    if (req.path === "/metrics") {
      return next();
    }

    const start = process.hrtime.bigint();
    res.on("finish", () => {
      const duration = Number(process.hrtime.bigint() - start) / 1e9;
      const labels = {
        service: serviceName,
        method: req.method,
        route: routeLabel(req),
        status_code: String(res.statusCode)
      };

      httpRequestsTotal.inc(labels);
      httpRequestDuration.observe(labels, duration);

      if (res.statusCode >= 400) {
        httpErrorsTotal.inc(labels);
      }
    });

    next();
  };
};

export const metricsHandler = async (_req, res) => {
  res.set("Content-Type", client.register.contentType);
  res.end(await client.register.metrics());
};

export const markServiceHealth = (serviceName, healthy) => {
  registeredServices.add(serviceName);
  serviceHealth.set({ service: serviceName }, healthy ? 1 : 0);
};
