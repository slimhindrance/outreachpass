# Phase 3 Analytics Testing Checklist

## Build & Environment Verification ✅

### Local Build
- [x] TypeScript compilation passes (`npm run type-check`)
- [x] Production build completes successfully (`npm run build`)
- [x] Development server starts without errors (`npm run dev`)
- [x] All Phase 3 components import correctly
- [x] No ESLint errors in analytics code

**Status**: All local checks passed! Server running on http://localhost:3001

---

## Phase 3 Feature Testing

### 1. Custom Date Range Picker

**Component**: `DateRangePicker.tsx`

**Test Cases**:
- [ ] Toggle between "Quick Select" and "Custom Range" modes
- [ ] Quick Select options work (7d, 30d, 90d, 180d, 365d)
- [ ] Custom range auto-populates with sensible defaults (last 30 days)
- [ ] Start date validation (cannot be after end date)
- [ ] End date validation (cannot be after today)
- [ ] End date auto-adjusts if start date is moved forward
- [ ] "Days selected" counter displays correctly
- [ ] API queries update when date range changes
- [ ] Charts and metrics refresh with new date range

**Expected Behavior**:
- Switching to custom mode populates start/end dates automatically
- Date inputs enforce max/min constraints
- All analytics data updates when dates change

---

### 2. CSV Export

**Component**: Native `exportData()` function

**Test Cases**:
- [ ] Export CSV button appears next to PDF export
- [ ] Button is disabled when no data is loaded
- [ ] Click downloads a CSV file
- [ ] CSV filename includes current date (format: `outreachpass-analytics-YYYY-MM-DD.csv`)
- [ ] CSV contains all overview metrics
- [ ] CSV includes date range and event filter information
- [ ] CSV opens correctly in Excel/Google Sheets
- [ ] Values are properly formatted (numbers, percentages)

**Expected CSV Structure**:
```
OutreachPass Analytics Export
Generated: [ISO timestamp]
Event: [Event name or "All Events"]
Date Range: [Range description]

Overview Metrics
Metric,Value
Total Emails,[number]
Email Opens,[number]
...
```

---

### 3. Advanced Filtering

**Component**: `AdvancedFilters.tsx`

**Test Cases**:
- [ ] Filters button shows active filter count badge
- [ ] Click opens filter dropdown panel
- [ ] Source filters (QR, Email, Direct, Share) work independently
- [ ] Device filters (Mobile, Desktop, Tablet) work independently
- [ ] Platform filters (Apple, Google) work independently
- [ ] Multiple filters can be selected simultaneously
- [ ] Active filter chips appear below the panel
- [ ] Clicking X on filter chip removes that filter
- [ ] "Clear All" button removes all filters
- [ ] Charts update to show only filtered data
- [ ] Filter panel closes when clicking outside

**Expected Behavior**:
- Available filter options populate from actual data
- Filter badge shows total count (sources + devices + platforms)
- Filtered data reflects correct subset of analytics

---

### 4. Database Query Optimization

**Migration Script**: `backend/scripts/apply_analytics_indexes.sh`
**SQL File**: `backend/migrations/add_analytics_indexes.sql`

**Test Cases**:
- [ ] Migration script exists and has execute permissions
- [ ] Script validates DATABASE_URL before proceeding
- [ ] Script prompts for confirmation before applying
- [ ] Migration creates all 18 indexes successfully
- [ ] Script shows index sizes after creation
- [ ] No duplicate index errors on re-run (IF NOT EXISTS works)

**To Run**:
```bash
cd backend
export DATABASE_URL='postgresql://user:password@host:port/database'
./scripts/apply_analytics_indexes.sh
```

**Verify Indexes Created**:
```sql
SELECT schemaname, tablename, indexname,
       pg_size_pretty(pg_relation_size(indexrelid)) as size
FROM pg_stat_user_indexes
WHERE indexname LIKE 'idx_%_tenant_%'
   OR indexname LIKE 'idx_%_event_%'
   OR indexname LIKE 'idx_%_card_%'
ORDER BY tablename, indexname;
```

**Expected Performance**:
- Analytics queries 50-70% faster on large datasets
- Tenant + date range queries use composite indexes
- Breakdown queries (by source, device, platform) optimized

---

### 5. Period-over-Period Comparison

**Components**: `ComparisonToggle.tsx`, `ComparisonBadge.tsx`

**Test Cases**:
- [ ] "Compare Periods" toggle appears in dashboard header
- [ ] Toggle switches between ON/OFF states smoothly
- [ ] When enabled, previous period data loads automatically
- [ ] Comparison badges appear on all 6 metric cards
- [ ] Green badge (↑) shows for increases
- [ ] Red badge (↓) shows for decreases
- [ ] Gray badge (−) shows for no change
- [ ] "New data" badge shows when previous period has 0
- [ ] Percentage calculations are correct
- [ ] "vs. X previous" text displays below badges
- [ ] Custom date ranges calculate matching previous period correctly
- [ ] Preset ranges (7d, 30d, etc.) calculate correct previous period

**Calculation Logic**:
- **Preset**: If current = last 30 days, previous = 30 days before that
- **Custom**: If current = Jan 1-15 (15 days), previous = Dec 17-31 (15 days)

**Expected Display**:
```
[Metric Value]
↑ +15.3%              (if increased)
vs. 1,234 previous
```

---

### 6. PDF Report Generation

**Component**: `PDFReportGenerator.tsx`

**Test Cases**:
- [ ] Export PDF button appears next to CSV export
- [ ] Button is disabled when no data is loaded
- [ ] Button shows "Generating PDF..." during export
- [ ] Click generates and downloads PDF file
- [ ] PDF filename includes date range and timestamp
- [ ] PDF opens correctly in PDF viewer

**PDF Content Verification**:

**Page 1 - Executive Summary**:
- [ ] "OutreachPass Analytics Report" title
- [ ] Date range displays correctly (preset or custom)
- [ ] Generation timestamp shown
- [ ] Event name shown (if filtered)
- [ ] "Comparison enabled" note (if applicable)
- [ ] 6 key metrics in grid layout (2 columns x 3 rows)
- [ ] Each metric shows label, value, and optional change %
- [ ] Change indicators color-coded (green ↑, red ↓, gray −)
- [ ] Email funnel summary section
- [ ] Funnel shows: Sent → Delivered → Opened → Clicked
- [ ] Bounce rate and complaints included

**Page 2+ - Charts**:
- [ ] "Analytics Charts" section header
- [ ] Email Event Distribution chart captured
- [ ] Card View Sources chart captured
- [ ] Wallet Pass Platform Distribution chart captured
- [ ] Charts render as images (not blank)
- [ ] Chart titles appear above each image

**Final Pages - Data Tables**:
- [ ] "Detailed Breakdown" section header
- [ ] Card View Sources table with percentages
- [ ] Device Types table with percentages
- [ ] Wallet Platforms table with percentages
- [ ] All percentages sum to 100%

**Footer**:
- [ ] "OutreachPass Analytics Report" on left
- [ ] Page number on right

**Expected PDF File**:
- Filename: `OutreachPass_Analytics_[DateRange]_[timestamp].pdf`
- Size: ~100-500KB depending on chart complexity
- Format: Letter size (8.5" x 11")

---

## Integration Testing

### API Endpoint Testing

**Test with curl (requires valid auth token)**:

```bash
# Overview
curl -H "Authorization: Bearer $TOKEN" \
  "https://api.outreachpass.com/admin/analytics/overview?tenant_id=xxx&days=30"

# Email Analytics
curl -H "Authorization: Bearer $TOKEN" \
  "https://api.outreachpass.com/admin/analytics/emails?tenant_id=xxx&days=30"

# Card Views
curl -H "Authorization: Bearer $TOKEN" \
  "https://api.outreachpass.com/admin/analytics/card-views?tenant_id=xxx&days=30"

# Wallet Passes
curl -H "Authorization: Bearer $TOKEN" \
  "https://api.outreachpass.com/admin/analytics/wallet-passes?tenant_id=xxx&days=30"

# Custom Date Range
curl -H "Authorization: Bearer $TOKEN" \
  "https://api.outreachpass.com/admin/analytics/overview?tenant_id=xxx&start_date=2025-01-01&end_date=2025-01-15"

# With Event Filter
curl -H "Authorization: Bearer $TOKEN" \
  "https://api.outreachpass.com/admin/analytics/overview?tenant_id=xxx&event_id=yyy&days=30"
```

---

## Known Limitations

### Local Testing Constraints

**Cognito Authentication Issue**:
- Cannot fully test the dashboard locally without valid Cognito credentials
- Development server runs but auth redirects prevent full page access
- Components render correctly but data fetching requires authenticated session

**Workarounds**:
1. **Component-level testing**: Write Jest tests for individual components
2. **API testing**: Test backend endpoints directly with curl/Postman
3. **Deployed environment**: Full E2E testing requires deployment to dev/staging

### Testing Recommendations

**What CAN be tested locally**:
- ✅ Component rendering (no runtime errors)
- ✅ TypeScript compilation
- ✅ Build process
- ✅ PropTypes validation
- ✅ UI interactions (dropdowns, toggles, modals)

**What REQUIRES deployed environment**:
- ⚠️ Actual data fetching from API
- ⚠️ Full user authentication flow
- ⚠️ PDF generation with real chart data
- ⚠️ CSV export with real analytics data
- ⚠️ Period comparison calculations with real data

---

## Automated Testing (Future)

### Suggested Unit Tests

**DateRangePicker**:
```typescript
describe('DateRangePicker', () => {
  it('switches between preset and custom modes')
  it('validates end date cannot be before start date')
  it('auto-populates dates when switching to custom')
  it('displays correct days selected count')
})
```

**AdvancedFilters**:
```typescript
describe('AdvancedFilters', () => {
  it('shows active filter count badge')
  it('applies multiple filters simultaneously')
  it('clears individual filters via chip X button')
  it('clears all filters with Clear All button')
})
```

**ComparisonBadge**:
```typescript
describe('ComparisonBadge', () => {
  it('shows green badge for increase')
  it('shows red badge for decrease')
  it('shows gray badge for no change')
  it('calculates percentage change correctly')
  it('handles division by zero gracefully')
})
```

**PDFReportGenerator**:
```typescript
describe('PDFReportGenerator', () => {
  it('disables button when no data available')
  it('shows loading state during generation')
  it('aggregates email analytics correctly')
  it('aggregates card view sources correctly')
  it('calculates percentages correctly')
})
```

---

## Manual Testing Workflow

### When Deployed Environment is Available

1. **Login** to OutreachPass admin portal with valid Cognito credentials
2. **Navigate** to `/admin/analytics`
3. **Work through each feature** systematically using this checklist
4. **Document** any bugs or unexpected behavior
5. **Take screenshots** of each feature working correctly
6. **Export** sample CSV and PDF files for review

### Priority Testing Order

1. ✅ Custom Date Range Picker (critical path)
2. ✅ Period Comparison (depends on date picker)
3. ✅ Advanced Filtering (visual feedback important)
4. ✅ CSV Export (quick validation)
5. ✅ PDF Export (comprehensive test)
6. ✅ Database Index Migration (one-time operation)

---

## Success Criteria

All features are considered production-ready when:

- [ ] All test cases pass in deployed environment
- [ ] No console errors when using any feature
- [ ] Performance is acceptable (<3s for data loading)
- [ ] PDF and CSV exports work for various data sizes
- [ ] Comparison calculations are mathematically correct
- [ ] Filters apply properly without breaking charts
- [ ] Date picker handles edge cases (leap years, month boundaries)
- [ ] Database indexes improve query performance measurably

---

## Troubleshooting

### Common Issues

**Issue**: Charts don't appear in PDF
**Solution**: Check that chart container IDs match: `email-funnel-chart`, `card-source-chart`, `wallet-platform-chart`

**Issue**: Comparison shows "NaN%"
**Solution**: Check for division by zero in percentage calculations (handled in ComparisonBadge)

**Issue**: Filters not working
**Solution**: Verify `useMemo` dependencies include filter state arrays

**Issue**: Custom dates not updating API calls
**Solution**: Verify `queryKey` includes `startDate` and `endDate` for cache invalidation

**Issue**: Database index migration fails
**Solution**: Check DATABASE_URL format and database permissions

---

## Next Steps After Testing

1. **Collect Feedback**: Gather user feedback on UI/UX
2. **Performance Monitoring**: Track query performance with indexes
3. **Iterate**: Address any bugs or feature requests
4. **Production Deployment**: Deploy to production with indexes
5. **Documentation**: Update user docs with new features

---

**Testing Status**: 🟡 In Progress
**Last Updated**: 2025-11-18
**Version**: Phase 3.0
