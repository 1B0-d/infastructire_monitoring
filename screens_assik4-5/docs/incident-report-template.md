# Incident Report Template

## Incident Summary

- Incident:
- Date and time:
- Affected service: `order-service` first, with possible impact on `product-service` and `chat-service`
- Severity:
- Status:

## Impact

Describe what users could and could not do.

Expected impact for this assignment:

- Users remain authenticated.
- Portfolio pages continue working.
- Product/order/chat functionality is unavailable while MongoDB-backed services cannot connect.
- `GET /api/my-orders` through user-service returns `503` when order-service is unavailable.

## Timeline

| Time | Event |
| --- | --- |
| HH:MM | Incorrect `MONGO_URL` configured. |
| HH:MM | order-service fails or becomes unhealthy. |
| HH:MM | Failure detected through health checks, Prometheus targets, Grafana dashboard, and logs. |
| HH:MM | Root cause identified. |
| HH:MM | Correct `MONGO_URL` restored. |
| HH:MM | Service restarted and verified. |

## Root Cause

The order-service database connection string was changed from:

```env
MONGO_URL=mongodb://mongodb:27017/shop
```

to:

```env
MONGO_URL=mongodb://wrong-mongodb:27017/shop
```

## Mitigation

Restore the correct MongoDB hostname and restart order-service:

```bash
docker compose up -d --build product-service order-service chat-service
```

## Resolution Confirmation

Confirm:

- `docker compose ps` shows order-service running.
- `GET http://localhost:4002/health` returns `200`.
- `GET http://localhost:4002/metrics` returns Prometheus metrics.
- Prometheus target `order-service` is `UP`.
- Grafana dashboard shows normal request/error/health values again.
- Frontend can load products.
- User can create a new order.
- User-service can load `/api/my-orders` by calling order-service internally.

## Lessons Learned

- Configuration changes must be reviewed.
- Health endpoints make failures easier to detect.
- Service-to-service failures should return clean user-facing errors.

## Action Items

- Add alert rules for order-service health or request errors.
- Add deployment checklist for environment variables.
