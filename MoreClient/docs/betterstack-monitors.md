# BetterStack Synthetic Monitor Spec

Configure the following monitors in BetterStack Uptime (https://uptime.betterstack.com) once the production deployment is live.

## Monitors

### 1. Health Check — API readiness
- **URL:** `https://clientmore.com/api/readyz`  
- **Method:** GET  
- **Expected status:** 200  
- **Interval:** 60 s  
- **Alert after:** 2 consecutive failures  
- **Escalation:** PagerDuty → on-call

### 2. Health Check — App liveness
- **URL:** `https://clientmore.com/api/healthz`  
- **Method:** GET  
- **Expected status:** 200  
- **Interval:** 30 s  
- **Alert after:** 1 failure  

### 3. Public Talent Profile — Edge SSR
- **URL:** `https://clientmore.com/t/demo` *(create a `demo` talent seed)*
- **Method:** GET  
- **Expected status:** 200  
- **Expected content:** `clientMORE`  
- **Interval:** 120 s  

### 4. Inngest event delivery
- **URL:** `https://clientmore.com/api/inngest`  
- **Method:** GET  
- **Expected status:** 200  
- **Interval:** 300 s  

### 5. Stripe webhook endpoint
- **URL:** `https://clientmore.com/api/webhooks/stripe`  
- **Method:** POST  
- **Body:** `{}`  
- **Expected status:** 400 *(no signature = bad request, proves route is alive)*  
- **Interval:** 300 s  

## Alert Channels

| Channel | For |
|---|---|
| Slack `#alerts-production` | All P1/P2 monitors |
| PagerDuty | Health + payment endpoints only |
| Email `ops@clientmore.com` | Daily summary digest |

## Uptime SLA

- **Target:** 99.9% monthly (≤ 43.8 min/month downtime)  
- **Measurement:** BetterStack calculates from monitor status  
- **Review:** Weekly dashboard review by on-call engineer
