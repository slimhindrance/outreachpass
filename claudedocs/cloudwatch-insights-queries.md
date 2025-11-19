# CloudWatch Insights Queries for OutreachPass

These queries leverage our structured JSON logging for powerful log analysis.

## Basic Queries

### 1. All Errors (Last Hour)
```
fields @timestamp, level, message, correlation_id, location.module
| filter level = "ERROR"
| sort @timestamp desc
| limit 100
```

### 2. All Warnings (Last Hour)
```
fields @timestamp, level, message, correlation_id, status_code, path
| filter level = "WARNING"
| sort @timestamp desc
| limit 100
```

### 3. Request Lifecycle by Correlation ID
```
fields @timestamp, logger, message, method, path, status_code
| filter correlation_id = "PASTE_CORRELATION_ID_HERE"
| sort @timestamp asc
```

## Performance Analysis

### 4. Slowest Requests (by duration)
```
fields @timestamp, correlation_id, method, path, status_code
| filter message = "Request completed"
| sort @timestamp desc
| limit 50
```

### 5. Requests by Status Code
```
fields @timestamp, correlation_id, method, path, status_code
| filter ispresent(status_code)
| stats count() by status_code
| sort status_code asc
```

### 6. Failed Requests (4xx and 5xx)
```
fields @timestamp, correlation_id, method, path, status_code, message
| filter status_code >= 400
| sort @timestamp desc
| limit 100
```

## Traffic Analysis

### 7. Requests by Path
```
fields @timestamp, method, path, status_code
| filter ispresent(path)
| stats count() by path
| sort count desc
```

### 8. Requests by Client IP
```
fields @timestamp, client_ip, method, path, status_code
| filter ispresent(client_ip)
| stats count() by client_ip
| sort count desc
| limit 20
```

### 9. Request Rate Over Time (5-minute intervals)
```
fields @timestamp
| filter message = "Request started"
| stats count() by bin(5m)
```

## Error Analysis

### 10. Errors by Module
```
fields @timestamp, level, message, location.module, location.function
| filter level = "ERROR"
| stats count() by location.module
| sort count desc
```

### 11. 404 Errors (Most Requested Missing Resources)
```
fields @timestamp, path, method
| filter status_code = 404
| stats count() by path
| sort count desc
| limit 20
```

### 12. 500 Errors with Stack Traces
```
fields @timestamp, correlation_id, message, exception
| filter status_code = 500
| sort @timestamp desc
| limit 50
```

## Database & External Service Analysis

### 13. Database Query Errors
```
fields @timestamp, correlation_id, message, exception
| filter message like /database|postgres|sql/i
| filter level = "ERROR"
| sort @timestamp desc
```

### 14. S3 Upload Failures
```
fields @timestamp, correlation_id, message, exception
| filter message like /s3|upload/i
| filter level = "ERROR" or level = "WARNING"
| sort @timestamp desc
```

### 15. SES Email Send Errors
```
fields @timestamp, correlation_id, message, exception
| filter message like /email|ses/i
| filter level = "ERROR"
| sort @timestamp desc
```

## User Activity Tracking

### 16. Card Creation Events
```
fields @timestamp, correlation_id, method, path
| filter path like /\/api\/admin\/cards$/
| filter method = "POST"
| sort @timestamp desc
```

### 17. Email Tracking Events
```
fields @timestamp, correlation_id, path, method
| filter path like /\/track\//
| stats count() by path
| sort count desc
```

### 18. Wallet Pass Generation
```
fields @timestamp, correlation_id, message
| filter message like /wallet|pass/i
| filter message like /generat/i
| sort @timestamp desc
```

## Security Analysis

### 19. Unauthorized Access Attempts (401/403)
```
fields @timestamp, correlation_id, client_ip, path, status_code
| filter status_code = 401 or status_code = 403
| stats count() by client_ip, path
| sort count desc
```

### 20. Rate Limit Violations
```
fields @timestamp, correlation_id, client_ip, path, message
| filter message like /rate limit/i
| stats count() by client_ip
| sort count desc
```

## Custom Aggregations

### 21. Daily Request Summary
```
fields @timestamp
| filter message = "Request started"
| stats count() as total_requests,
        count(status_code >= 400 and status_code < 500) as client_errors,
        count(status_code >= 500) as server_errors
  by bin(1d)
```

### 22. Error Rate Percentage
```
fields @timestamp, status_code
| filter ispresent(status_code)
| stats count() as total,
        count(status_code >= 400) as errors
| fields total, errors, (errors / total * 100) as error_rate_percent
```

## How to Use These Queries

1. Go to **CloudWatch Console** → **Logs** → **Insights**
2. Select log group: `/aws/lambda/outreachpass-dev-api`
3. Paste any query above
4. Adjust time range as needed
5. Click **Run query**

## Tips

- **Time Range**: Adjust based on your needs (1h, 24h, 7d, etc.)
- **Correlation ID**: Copy from any log entry to trace entire request lifecycle
- **Filters**: Combine filters with `and` / `or` for more specific queries
- **Performance**: Limit result size with `limit N` for faster queries
- **Alerts**: Save frequently used queries for quick access

## Common Debugging Workflow

1. **Find the error**: Run query #1 (All Errors)
2. **Get correlation ID**: Copy from error log entry
3. **Trace request**: Run query #3 with correlation ID
4. **Analyze pattern**: If recurring, run query #10 (Errors by Module)
5. **Check metrics**: Verify with CloudWatch Metrics/Alarms
