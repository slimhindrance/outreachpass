# OutreachPass Performance Baselines & Monitoring Thresholds

## Baseline Metrics (24-hour period: 2025-11-17 to 2025-11-18)

### Lambda: outreachpass-dev-api
| Metric | Baseline | Current Alarm Threshold | Recommendation |
|--------|----------|------------------------|----------------|
| Average Duration | **166 ms** | 5000 ms (5s) | ✅ Appropriate (30x headroom) |
| Max Duration | **3576 ms** (3.6s) | 5000 ms (5s) | ⚠️ Consider lowering to 4000ms |
| Error Rate | **3.5%** (5/143) | 5% | ✅ Appropriate |
| Total Invocations | 143/day | N/A | Low traffic baseline |

**Analysis**:
- Average response time is excellent (166ms)
- Max duration spike to 3.6s suggests occasional slow queries/external calls
- Error rate is within acceptable range
- Low traffic allows for tighter performance thresholds

### Lambda: outreachpass-pass-worker
| Metric | Baseline | Current Alarm Threshold | Recommendation |
|--------|----------|------------------------|----------------|
| Average Duration | **64 ms** | N/A (no duration alarm) | ✅ Excellent performance |
| Error Rate | **0%** (0 errors) | 5% | ✅ Appropriate |
| Total Invocations | 781/day | N/A | Good throughput |

**Analysis**:
- Excellent performance (64ms average)
- No errors in 781 invocations
- Higher volume than API (5.5x more invocations)
- Worker is reliable and fast

### API Gateway: r2h140rt0a
| Metric | Baseline | Current Alarm Threshold | Recommendation |
|--------|----------|------------------------|----------------|
| Average Latency | **1591 ms** (1.6s) | 3000 ms (3s) | ✅ Appropriate |
| 4xx Error Rate | **0%** (0 errors) | 10% | ✅ Very healthy |
| 5xx Error Rate | **0%** (0 errors) | 5% | ✅ Very healthy |
| Total Requests | 143/day | N/A | Low traffic baseline |

**Analysis**:
- Latency is higher than Lambda duration (1.6s vs 166ms) due to cold starts
- Zero client/server errors indicates stable API
- Threshold provides good buffer for traffic spikes

### RDS: outreachpass-dev
| Metric | Baseline | Current Alarm Threshold | Recommendation |
|--------|----------|------------------------|----------------|
| Average CPU | **26.5%** | 80% | ✅ Excellent headroom |
| Average Connections | **1** | 80 | ✅ Very low usage |
| Free Storage | N/A | <5 GB | Monitor during growth |

**Analysis**:
- Very low CPU utilization (26.5%) with plenty of headroom
- Single connection indicates minimal concurrent load
- Database is significantly underutilized (room for 10x growth)

### SQS: outreachpass-pass-generation
| Metric | Baseline | Current Alarm Threshold | Recommendation |
|--------|----------|------------------------|----------------|
| Average Queue Depth | **0 messages** | 100 messages | ✅ Fast processing |
| Max Queue Depth | **0 messages** | 100 messages | ✅ No backlog |
| Message Age | N/A | 300s (5 min) | ✅ Good threshold |
| DLQ Depth | **0 messages** | 0 messages | ✅ No failures |

**Analysis**:
- Messages processed immediately (zero queue depth)
- No failed messages in DLQ
- Worker is keeping up with message volume
- 100 message threshold provides early warning of processing delays

---

## Current Alarm Configuration

### Lambda Alarms

#### 1. Backend Lambda - Error Rate
- **Alarm**: `outreachpass-dev-lambda-backend-errors`
- **Threshold**: >5% error rate
- **Evaluation**: 2 periods × 5 minutes
- **Action**: SNS notification
- **Baseline**: 3.5% error rate
- **Status**: ✅ Appropriate

#### 2. Backend Lambda - Duration
- **Alarm**: `outreachpass-dev-lambda-backend-duration`
- **Threshold**: >5000ms average
- **Evaluation**: 2 periods × 5 minutes
- **Action**: SNS notification
- **Baseline**: 166ms average, 3576ms max
- **Status**: ⚠️ Consider lowering to 4000ms

#### 3. Worker Lambda - Error Rate
- **Alarm**: `outreachpass-dev-lambda-worker-errors`
- **Threshold**: >5% error rate
- **Evaluation**: 2 periods × 5 minutes
- **Action**: SNS notification
- **Baseline**: 0% error rate
- **Status**: ✅ Appropriate

### API Gateway Alarms

#### 4. API Gateway - 4xx Errors
- **Alarm**: `outreachpass-dev-api-4xx-errors`
- **Threshold**: >10% error rate
- **Evaluation**: 2 periods × 5 minutes
- **Action**: SNS notification
- **Baseline**: 0% error rate
- **Status**: ✅ Appropriate

#### 5. API Gateway - 5xx Errors
- **Alarm**: `outreachpass-dev-api-5xx-errors`
- **Threshold**: >5% error rate
- **Evaluation**: 2 periods × 5 minutes
- **Action**: SNS notification + OK notification
- **Baseline**: 0% error rate
- **Status**: ✅ Appropriate

#### 6. API Gateway - Latency
- **Alarm**: `outreachpass-dev-api-latency`
- **Threshold**: >3000ms average
- **Evaluation**: 2 periods × 5 minutes
- **Action**: SNS notification
- **Baseline**: 1591ms average
- **Status**: ✅ Appropriate

### RDS Alarms

#### 7. RDS - CPU Utilization
- **Alarm**: `outreachpass-dev-rds-cpu`
- **Threshold**: >80% average
- **Evaluation**: 2 periods × 5 minutes
- **Action**: SNS notification
- **Baseline**: 26.5% average
- **Status**: ✅ Appropriate

#### 8. RDS - Database Connections
- **Alarm**: `outreachpass-dev-rds-connections`
- **Threshold**: >80 connections
- **Evaluation**: 2 periods × 5 minutes
- **Action**: SNS notification
- **Baseline**: 1 connection average
- **Status**: ✅ Appropriate

#### 9. RDS - Free Storage
- **Alarm**: `outreachpass-dev-rds-storage`
- **Threshold**: <5 GB free
- **Evaluation**: 1 period × 5 minutes
- **Action**: SNS notification
- **Baseline**: Unknown (not queried)
- **Status**: ✅ Appropriate

### SQS Alarms

#### 10. SQS - Queue Depth
- **Alarm**: `outreachpass-dev-sqs-queue-depth`
- **Threshold**: >100 messages
- **Evaluation**: 2 periods × 5 minutes
- **Action**: SNS notification
- **Baseline**: 0 messages average
- **Status**: ✅ Appropriate

#### 11. SQS - Message Age
- **Alarm**: `outreachpass-dev-sqs-message-age`
- **Threshold**: >300 seconds (5 min)
- **Evaluation**: 1 period × 5 minutes
- **Action**: SNS notification
- **Baseline**: 0 seconds (immediate processing)
- **Status**: ✅ Appropriate

#### 12. SQS - Dead Letter Queue Depth
- **Alarm**: `outreachpass-dev-sqs-dlq-depth`
- **Threshold**: >0 messages (any message)
- **Evaluation**: 1 period × 5 minutes
- **Action**: SNS notification
- **Baseline**: 0 messages
- **Status**: ✅ Appropriate

---

## Recommendations

### Immediate Actions
1. ⚠️ **Lower Lambda Backend Duration Alarm**: Reduce from 5000ms to 4000ms based on max observed duration of 3576ms
2. ✅ **Confirm SNS Email Subscription**: Check christopherwlindeman@gmail.com for confirmation email

### Short-term Monitoring (Next 7 Days)
1. Monitor Lambda cold start impact on API Gateway latency
2. Track error patterns during increased load
3. Observe queue depth during peak processing times
4. Monitor RDS CPU during batch operations

### Long-term Improvements
1. **Auto-scaling Triggers**: Add auto-scaling when:
   - API Gateway latency >2000ms sustained
   - SQS queue depth >50 messages
   - RDS CPU >60% sustained

2. **Performance Optimization**:
   - Investigate 3.6s Lambda duration spikes
   - Optimize cold start times (currently causing 1.6s latency)
   - Consider provisioned concurrency for API Lambda

3. **Additional Monitoring**:
   - Add custom metrics for business KPIs:
     - Pass generation success rate
     - Email delivery rate
     - Wallet add-to-pass conversion rate
   - Add distributed tracing with X-Ray
   - Add database query performance monitoring

4. **Capacity Planning**:
   - Current system handles ~150 requests/day
   - Database has headroom for 10x growth
   - Worker processes ~800 messages/day with zero backlog
   - Plan for scaling at 1000 requests/day milestone

---

## Alarm Testing Results

### Test Date: 2025-11-18
**Test Scenarios Executed:**
1. ✅ Generated 15 4xx errors (10×404, 5×405)
2. ✅ Verified alarm thresholds not exceeded (errors below 10% threshold)
3. ✅ Confirmed structured logging with correlation IDs
4. ✅ Verified CloudWatch Insights queries work correctly

**Alarm States During Test:**
- All alarms remained in OK state (expected - errors below thresholds)
- No false positives or alarm flapping
- SNS notifications pending email confirmation

---

## Monitoring Best Practices

### Daily
- Review CloudWatch dashboard for any alarm state changes
- Check DLQ for any failed messages
- Monitor error rates in CloudWatch Insights

### Weekly
- Review performance trends (latency, error rates, throughput)
- Analyze slow query patterns in RDS
- Review and adjust alarm thresholds based on traffic patterns

### Monthly
- Update baseline metrics document
- Review and optimize alarm evaluation periods
- Analyze cost vs performance trade-offs
- Plan capacity for growth

---

## CloudWatch Dashboard Access

**Console URL**: https://console.aws.amazon.com/cloudwatch/home?region=us-east-1

**Quick Links**:
- All Alarms: CloudWatch → Alarms → All alarms
- Log Insights: CloudWatch → Logs → Insights
- Metrics: CloudWatch → Metrics → All metrics

**Recommended Dashboard Widgets**:
1. Lambda Duration (all functions)
2. API Gateway Latency (p50, p90, p99)
3. RDS CPU Utilization
4. SQS Queue Depth
5. Error Rate Summary (all services)

---

*Last Updated: 2025-11-18*
*Next Review: 2025-11-25*
