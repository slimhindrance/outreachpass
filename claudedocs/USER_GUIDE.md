# OutreachPass User Guide

**Version:** 2.0.0
**Last Updated:** 2025-11-18
**Platform:** Web Application

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [Dashboard Overview](#dashboard-overview)
3. [Managing Events](#managing-events)
4. [Managing Attendees](#managing-attendees)
5. [Generating Wallet Passes](#generating-wallet-passes)
6. [Viewing Analytics](#viewing-analytics)
7. [Settings & Configuration](#settings--configuration)
8. [Troubleshooting](#troubleshooting)
9. [Best Practices](#best-practices)
10. [FAQ](#faq)

---

## Getting Started

### Accessing the Platform

**URL**: https://app.outreachpass.base2ml.com

**System Requirements**:
- **Browser**: Chrome, Safari, Firefox, Edge (latest versions)
- **Internet**: Stable connection required
- **Screen Resolution**: Minimum 1280x720 (desktop), responsive mobile support

### Creating an Account

**Step 1: Sign Up**
1. Navigate to https://app.outreachpass.base2ml.com
2. Click "Sign Up" button
3. Enter your email address
4. Create a strong password (min 8 chars, uppercase, lowercase, number, symbol)
5. Click "Create Account"

**Step 2: Verify Email**
1. Check your email inbox
2. Click verification link from "noreply@outreachpass.base2ml.com"
3. You'll be redirected to the login page

**Step 3: First Login**
1. Enter your email and password
2. Click "Sign In"
3. You'll be redirected to the dashboard

### User Roles

| Role | Permissions | Typical Use Case |
|------|------------|------------------|
| **Admin** | Full access to all features | Event organizers, team leads |
| **User** | Event/attendee management, analytics | Event coordinators |
| **Exhibitor** | Read-only, lead capture | Sponsors, booth staff |

---

## Dashboard Overview

### Home Dashboard

```
┌─────────────────────────────────────────────────────────┐
│  OutreachPass                    [User Menu ▼]          │
├─────────────────────────────────────────────────────────┤
│  [Dashboard] [Events] [Attendees] [Analytics]           │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Quick Stats                                            │
│  ┌────────────┬────────────┬────────────┬────────────┐ │
│  │  5         │  3          │  46        │  29        │ │
│  │  Total     │  Active     │  Attendees │  Cards     │ │
│  │  Events    │  Events     │            │  Generated │ │
│  └────────────┴────────────┴────────────┴────────────┘ │
│                                                          │
│  Recent Events                                          │
│  ┌────────────────────────────────────────────────────┐ │
│  │  Tech Summit 2025            Status: Active        │ │
│  │  Jan 15-17, 2025             25 attendees          │ │
│  │  [View] [Edit] [Analytics]                         │ │
│  └────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────┐ │
│  │  Healthcare Conference       Status: Draft         │ │
│  │  Mar 10-12, 2025             15 attendees          │ │
│  │  [View] [Edit] [Analytics]                         │ │
│  └────────────────────────────────────────────────────┘ │
│                                                          │
│  Quick Actions                                          │
│  [+ Create Event] [Import Attendees] [View Analytics]  │
└─────────────────────────────────────────────────────────┘
```

### Navigation Menu

**Main Menu Items**:
- **Dashboard**: Home page with overview stats
- **Events**: Manage all events
- **Attendees**: View all attendees across events
- **Analytics**: Comprehensive analytics dashboard
- **Settings**: Account and brand settings

---

## Managing Events

### Creating a New Event

**Step 1: Navigate to Events**
1. Click "Events" in the main menu
2. Click "+ Create Event" button

**Step 2: Fill Event Details**
```
Event Information
├─ Event Name: "Tech Summit 2025"
├─ Slug: "tech-summit-2025" (URL-friendly, auto-generated)
├─ Brand: [Select Brand ▼] → OutreachPass
├─ Start Date: January 15, 2025
├─ Start Time: 9:00 AM
├─ End Date: January 17, 2025
├─ End Time: 5:00 PM
└─ Timezone: America/New_York
```

**Step 3: Configure Settings**
```
Event Settings
├─ Enable QR Codes: ☑ Yes
├─ Enable Wallet Passes: ☑ Yes
├─ Auto-send Emails: ☑ Yes
└─ Custom Email Template: [Optional]
```

**Step 4: Save Event**
1. Click "Create Event" button
2. Event is created with status "Draft"
3. You'll be redirected to the event detail page

### Editing an Event

**Step 1: Locate Event**
1. Go to Events page
2. Find your event in the list
3. Click "Edit" button

**Step 2: Update Details**
1. Modify any field (name, dates, settings)
2. Click "Save Changes"
3. Changes are applied immediately

**Step 3: Publish Event**
1. Change status from "Draft" to "Active"
2. Click "Publish Event"
3. Event is now live

### Event Detail View

```
┌─────────────────────────────────────────────────────────┐
│  « Back to Events                                        │
├─────────────────────────────────────────────────────────┤
│  Tech Summit 2025                        [Edit Event]   │
│  January 15-17, 2025 • New York                         │
│  Status: Active                                         │
├─────────────────────────────────────────────────────────┤
│  [Overview] [Attendees] [Analytics]                     │
├─────────────────────────────────────────────────────────┤
│  Event Overview                                         │
│  ┌────────────┬────────────┬────────────┬────────────┐ │
│  │  25        │  25         │  20        │  18        │ │
│  │  Registered│  Cards      │  Emails    │  Wallet    │ │
│  │  Attendees │  Generated  │  Sent      │  Passes    │ │
│  └────────────┴────────────┴────────────┴────────────┘ │
│                                                          │
│  Quick Actions                                          │
│  [+ Add Attendee] [Import CSV] [Send Emails]           │
│  [Download QR Codes] [View Analytics]                   │
└─────────────────────────────────────────────────────────┘
```

### Deleting an Event

**Warning**: Deleting an event will delete all associated attendees, cards, and analytics data. This action cannot be undone.

**Steps**:
1. Go to Event Detail page
2. Click "Delete Event" button
3. Confirm deletion in popup dialog
4. Type event name to confirm
5. Click "Delete Permanently"

---

## Managing Attendees

### Adding Attendees Manually

**Step 1: Navigate to Event**
1. Go to Events page
2. Click on an event
3. Go to "Attendees" tab

**Step 2: Add Single Attendee**
1. Click "+ Add Attendee" button
2. Fill out the form:
   ```
   Personal Information
   ├─ First Name: John
   ├─ Last Name: Doe
   ├─ Email: john@example.com (required)
   └─ Phone: +1-555-0100

   Professional Information
   ├─ Organization: Acme Corporation
   ├─ Title: CEO
   └─ LinkedIn URL: https://linkedin.com/in/johndoe

   Options
   ├─ Send Welcome Email: ☑ Yes
   └─ Generate Wallet Pass: ☑ Yes
   ```
3. Click "Add Attendee"
4. Attendee is created and card is generated
5. Welcome email is sent (if enabled)

### Importing Attendees (CSV)

**Step 1: Prepare CSV File**

**Template**:
Download template: Click "Download CSV Template" button

**Example CSV**:
```csv
first_name,last_name,email,phone,org_name,title,linkedin_url
John,Doe,john@example.com,+1-555-0100,Acme Corp,CEO,https://linkedin.com/in/johndoe
Jane,Smith,jane@example.com,+1-555-0101,Tech Inc,CTO,https://linkedin.com/in/janesmith
Bob,Johnson,bob@example.com,+1-555-0102,Startup Co,Founder,
```

**Requirements**:
- **Format**: UTF-8 encoded, comma-separated
- **Required Columns**: first_name, last_name, email
- **Optional Columns**: phone, org_name, title, linkedin_url
- **Max File Size**: 10 MB
- **Max Rows**: 5,000 attendees

**Step 2: Upload CSV**
1. Click "Import CSV" button
2. Select CSV file from your computer
3. Review import settings:
   ```
   Import Options
   ├─ Send Welcome Emails: ☑ Yes
   ├─ Generate Wallet Passes: ☑ Yes
   └─ Skip Duplicates: ☑ Yes (based on email)
   ```
4. Click "Start Import"

**Step 3: Monitor Import Progress**
```
Import Status
├─ Total Rows: 250
├─ Imported: 248
├─ Failed: 2
├─ Progress: 99%
└─ Status: Completed

Errors:
• Row 15: Invalid email format (john.doe@)
• Row 127: Missing required field: first_name
```

**Step 4: Review Results**
1. Check imported attendees in the list
2. Review error log for failed rows
3. Fix errors and re-import if needed

### Viewing Attendee Details

**Step 1: Locate Attendee**
1. Go to Event → Attendees tab
2. Search by name or email
3. Click on attendee row

**Step 2: Attendee Detail Page**
```
┌─────────────────────────────────────────────────────────┐
│  « Back to Attendees                                     │
├─────────────────────────────────────────────────────────┤
│  John Doe                              [Edit] [Delete]  │
│  CEO, Acme Corporation                                  │
├─────────────────────────────────────────────────────────┤
│  Contact Information                                    │
│  Email: john@example.com                                │
│  Phone: +1-555-0100                                     │
│  LinkedIn: linkedin.com/in/johndoe                      │
│                                                          │
│  Card Information                                       │
│  Card ID: abc-123-def                                   │
│  Card URL: outreachpass.base2ml.com/c/abc-123-def       │
│  [View Card] [Download QR Code] [Download vCard]        │
│                                                          │
│  Wallet Pass Status                                     │
│  Google Wallet: ✅ Delivered                            │
│  Sent: Nov 15, 2025 10:30 AM                            │
│  [Resend Wallet Pass]                                   │
│                                                          │
│  Engagement Metrics                                     │
│  ├─ Card Views: 45                                      │
│  ├─ Email Opened: Yes (Nov 15, 2025 2:15 PM)           │
│  ├─ Wallet Link Clicked: Yes                            │
│  ├─ Wallet Pass Added: Yes                              │
│  └─ vCard Downloaded: 3 times                           │
└─────────────────────────────────────────────────────────┘
```

### Editing Attendee Information

**Step 1: Open Edit Form**
1. Navigate to attendee detail page
2. Click "Edit" button

**Step 2: Update Information**
1. Modify any field (name, email, org, etc.)
2. Click "Save Changes"
3. Contact card is automatically updated
4. vCard revision number is incremented

**Note**: If email is changed, a new welcome email will be sent to the new address.

### Deleting an Attendee

**Warning**: Deleting an attendee will also delete their contact card and all associated analytics data.

**Steps**:
1. Go to attendee detail page
2. Click "Delete" button
3. Confirm deletion
4. Attendee and related data are removed

---

## Generating Wallet Passes

### Automatic Pass Generation

**When Passes Are Auto-Generated**:
1. **New Attendee Added**: If "Generate Wallet Pass" is enabled
2. **CSV Import**: If import option "Generate Wallet Passes" is checked
3. **Manual Trigger**: Click "Generate Pass" button

**Pass Generation Process**:
```
1. Attendee Created
   ↓
2. Contact Card Generated
   ↓
3. QR Code Created
   ↓
4. Pass Job Queued (SQS)
   ↓
5. Worker Lambda Processes Job
   ↓
6. Google Wallet Pass Created
   ↓
7. Pass URL Generated
   ↓
8. Email Sent to Attendee
```

**Processing Time**: Typically 30-60 seconds per pass

### Manual Pass Generation

**For Single Attendee**:
1. Go to attendee detail page
2. Click "Generate Wallet Pass" button
3. Pass is queued for generation
4. Wait for "Processing" to change to "Delivered"
5. Pass URL and email will be available

**For Bulk Generation**:
1. Go to Event page
2. Click "Generate Passes" button
3. Select attendees (or select all)
4. Click "Generate Selected"
5. Jobs are queued in batches
6. Monitor progress on Jobs page

### Resending Wallet Passes

**Resend to Single Attendee**:
1. Go to attendee detail page
2. Click "Resend Wallet Pass" button
3. Confirmation dialog appears
4. Click "Resend"
5. Email is re-sent immediately

**Resend to Multiple Attendees**:
1. Go to Event → Attendees tab
2. Select attendees using checkboxes
3. Click "Resend Passes" (bulk action)
4. Confirm bulk resend
5. Emails are queued and sent

### Wallet Pass Troubleshooting

**Problem**: Attendee didn't receive wallet pass email

**Solutions**:
1. Check spam/junk folder
2. Verify email address is correct
3. Check email delivery status on attendee page
4. Resend wallet pass
5. Contact support if issue persists

**Problem**: "Something went wrong" when clicking wallet link

**Solutions**:
1. Ensure Google Wallet app is installed (Android)
2. Try opening link in different browser
3. Check wallet pass status on attendee page
4. Regenerate wallet pass if needed

---

## Viewing Analytics

### Analytics Dashboard

**Accessing Analytics**:
1. Click "Analytics" in main menu
2. Or click "View Analytics" on event page

**Date Range Selection**:
```
Date Range: [Last 30 Days ▼]
Options:
• Last 7 days
• Last 30 days
• Last 90 days
• Custom range (coming soon)
```

### Overview Metrics

```
┌─────────────────────────────────────────────────────────┐
│  Analytics Dashboard                  [Export CSV]      │
├─────────────────────────────────────────────────────────┤
│  Date Range: Last 30 Days                               │
│                                                          │
│  Key Metrics                                            │
│  ┌────────────┬────────────┬────────────┬────────────┐ │
│  │  2,150     │  1,820      │  687       │  412       │ │
│  │  Total     │  Emails     │  Emails    │  Wallet    │ │
│  │  Card      │  Sent       │  Opened    │  Passes    │ │
│  │  Views     │            │            │  Issued    │ │
│  │            │  99% deliv  │  38% open  │  23% conv  │ │
│  └────────────┴────────────┴────────────┴────────────┘ │
└─────────────────────────────────────────────────────────┘
```

**Metric Definitions**:
- **Total Card Views**: Number of times cards were viewed
- **Emails Sent**: Total emails sent via platform
- **Emails Opened**: Number of emails opened (tracking pixel)
- **Wallet Passes Issued**: Total wallet passes generated
- **Delivery Rate**: % of emails successfully delivered
- **Open Rate**: % of delivered emails opened
- **Conversion Rate**: % of email recipients who added pass to wallet

### Email Funnel Analysis

```
Email Engagement Funnel

Sent (1,820)      ████████████████████████████ 100%
Delivered (1,802) ███████████████████████████  99%
Opened (687)      ██████████                   38%
Clicked (412)     ██████                       23%
```

**Insights**:
- **High Delivery Rate (99%)**: Emails are reaching inboxes
- **Low Open Rate (38%)**: Consider improving subject lines
- **Good Click Rate (23%)**: Call-to-action is working
- **Improvement Areas**: Focus on increasing open rate

### Card View Sources

```
Card View Sources (Pie Chart)

• QR Scan: 45% (970 views)
• Email Link: 30% (645 views)
• Direct Link: 20% (430 views)
• Share: 5% (105 views)
```

**Insights**:
- **QR Codes Popular**: Attendees prefer scanning QR codes
- **Email Drives Traffic**: 30% come from email links
- **Word of Mouth**: 5% from sharing

### Device & Browser Breakdown

```
Device Distribution

Mobile: 60% (1,290 views)
Desktop: 25% (538 views)
Tablet: 15% (322 views)

Browser Distribution

• Mobile Safari: 35%
• Chrome Mobile: 25%
• Chrome Desktop: 20%
• Safari Desktop: 10%
• Firefox: 5%
• Other: 5%
```

**Insights**:
- **Mobile-First**: 60% access from mobile devices
- **iOS Dominant**: Mobile Safari is most popular
- **Responsive Design Critical**: Ensure mobile optimization

### Wallet Pass Analytics

```
Wallet Pass Platform Distribution

Google Wallet: 92% (380 passes)
Apple Wallet: 8% (32 passes)
```

**Insights**:
- **Android Dominance**: Most users on Android
- **Google Wallet Success**: High adoption rate
- **Apple Wallet**: Consider marketing to iOS users

### Exporting Analytics

**CSV Export**:
1. Click "Export CSV" button on analytics page
2. File downloads automatically
3. Open in Excel, Google Sheets, or data analysis tool

**Export Contains**:
- Daily metrics for selected date range
- Email funnel statistics
- Card view breakdown by source
- Device and browser distribution
- Wallet pass statistics

---

## Settings & Configuration

### Account Settings

**Accessing Settings**:
1. Click user menu (top right)
2. Select "Settings"

**Profile Settings**:
```
Account Information
├─ Full Name: John Admin
├─ Email: admin@company.com
├─ Role: Admin
└─ Tenant: Base2ML

Change Password
├─ Current Password: ••••••••
├─ New Password: ••••••••
└─ Confirm Password: ••••••••

[Save Changes]
```

### Brand Settings (Admin Only)

**Brand Configuration**:
```
Brand Settings
├─ Brand Name: OutreachPass
├─ Domain: outreachpass.base2ml.com
├─ Primary Color: #4F46E5
├─ Logo: [Upload Logo]
├─ Favicon: [Upload Favicon]
└─ Email From Name: OutreachPass Events

Features
├─ Google Wallet: ☑ Enabled
├─ Apple Wallet: ☐ Disabled (requires Apple Developer account)
├─ Custom Email Templates: ☐ Disabled
└─ Advanced Analytics: ☑ Enabled

[Save Brand Settings]
```

---

## Troubleshooting

### Common Issues

#### Issue 1: Can't Log In

**Symptoms**: "Incorrect email or password" error

**Solutions**:
1. Verify email address is correct
2. Check caps lock is off
3. Try password reset:
   - Click "Forgot Password?"
   - Enter email address
   - Check email for reset link
   - Create new password
4. Clear browser cache and cookies
5. Try different browser

#### Issue 2: CSV Import Fails

**Symptoms**: "Invalid CSV format" or "Import failed" error

**Solutions**:
1. Check CSV file encoding (must be UTF-8)
2. Verify column headers match template exactly
3. Ensure required columns are present (first_name, last_name, email)
4. Check for invalid email addresses
5. Remove special characters from data
6. Ensure file size < 10 MB
7. Download fresh template and retry

#### Issue 3: Wallet Pass Not Working

**Symptoms**: "Something went wrong" when clicking wallet link

**Solutions**:
1. **For Google Wallet**:
   - Ensure Google Wallet app is installed
   - Update Google Wallet to latest version
   - Try opening in Chrome browser
   - Check internet connection

2. **For Apple Wallet**:
   - Currently requires Apple Developer credentials
   - Contact admin to enable Apple Wallet

3. **General**:
   - Check pass status on attendee page
   - Regenerate pass if status is "Failed"
   - Try different device/browser

#### Issue 4: Emails Not Received

**Symptoms**: Attendee reports not receiving wallet pass email

**Solutions**:
1. Check spam/junk folder
2. Verify email address is correct (no typos)
3. Check email delivery status on attendee page
4. Resend wallet pass from attendee page
5. Check email provider isn't blocking sender
6. Try alternative email address

#### Issue 5: Analytics Not Showing Data

**Symptoms**: Analytics dashboard shows zero or "No data available"

**Solutions**:
1. Verify date range includes activity period
2. Check that tracking is enabled for event
3. Ensure cards have been viewed/emails sent
4. Try refreshing page
5. Clear browser cache
6. Wait 5-10 minutes for data to appear (processing delay)

### Getting Help

**Support Channels**:
1. **Email**: christopherwlindeman@gmail.com
2. **Response Time**: Within 24 hours (business days)

**When Contacting Support**:
Include:
- Your email address
- Tenant/organization name
- Detailed description of issue
- Steps to reproduce
- Screenshots (if applicable)
- Browser and OS version

---

## Best Practices

### Event Planning

**Before the Event**:
1. **Create Event Early**: Set up event at least 2 weeks before
2. **Test Workflow**: Add test attendee and verify entire flow
3. **Customize Branding**: Upload logo, set colors before launch
4. **Prepare Attendee List**: Clean and validate CSV data
5. **Schedule Emails**: Plan when to send wallet passes

**During the Event**:
1. **Monitor Analytics**: Check engagement in real-time
2. **Respond to Issues**: Address attendee questions quickly
3. **Track QR Scans**: Encourage QR code usage
4. **Collect Feedback**: Note any issues for improvement

**After the Event**:
1. **Review Analytics**: Analyze engagement data
2. **Export Data**: Download analytics for reporting
3. **Archive Event**: Change status to "Archived"
4. **Document Learnings**: Note what worked well

### Attendee Management

**Data Quality**:
1. **Validate Emails**: Ensure all emails are valid format
2. **Complete Profiles**: Include org, title for better cards
3. **Avoid Duplicates**: Check for existing attendees before import
4. **Update Regularly**: Keep attendee data current

**Communication**:
1. **Clear Subject Lines**: Make email purpose obvious
2. **Test Emails**: Send test before bulk send
3. **Timing Matters**: Send during business hours
4. **Follow Up**: Resend to unopened after 48 hours

### Analytics Usage

**Regular Monitoring**:
1. **Check Daily**: Monitor engagement during event
2. **Weekly Reviews**: Review trends weekly
3. **Identify Patterns**: Note high/low engagement periods
4. **Compare Events**: Benchmark against previous events

**Data-Driven Decisions**:
1. **Low Open Rates**: Improve subject lines
2. **High QR Usage**: Print more QR codes
3. **Device Insights**: Optimize for mobile if dominant
4. **Source Analysis**: Focus on high-performing channels

### Security Best Practices

**Account Security**:
1. **Strong Passwords**: Use 12+ characters, mix of types
2. **Unique Passwords**: Don't reuse passwords
3. **Enable MFA**: Turn on multi-factor authentication (if available)
4. **Regular Updates**: Change password every 90 days
5. **Secure Logout**: Always log out on shared devices

**Data Protection**:
1. **Limited Access**: Only grant necessary permissions
2. **Regular Audits**: Review user access quarterly
3. **Secure Exports**: Protect downloaded CSV files
4. **Delete Old Data**: Archive or delete outdated events

---

## FAQ

### General Questions

**Q: What is OutreachPass?**
A: OutreachPass is a digital contact card and event management platform that helps organizations create branded digital business cards, issue mobile wallet passes, and track engagement analytics.

**Q: Do I need technical knowledge to use OutreachPass?**
A: No, OutreachPass is designed for non-technical users. Basic computer skills and familiarity with spreadsheets (CSV) are sufficient.

**Q: Can I use OutreachPass for multiple events?**
A: Yes, you can create unlimited events within your account.

**Q: Is there a mobile app?**
A: Currently, OutreachPass is web-based only. However, generated contact cards and wallet passes work perfectly on mobile devices.

### Features

**Q: What's the difference between a contact card and wallet pass?**
A:
- **Contact Card**: Web page with contact info, accessible via QR code or link
- **Wallet Pass**: Digital pass stored in Apple Wallet or Google Wallet on phones

**Q: Can attendees update their own information?**
A: Currently, only admins can update attendee information. Self-service attendee portal is planned for future release.

**Q: How many attendees can I import at once?**
A: Maximum 5,000 attendees per CSV import. For larger imports, split into multiple files.

**Q: Can I customize email templates?**
A: Custom email templates are available for enterprise plans. Contact support for details.

### Wallet Passes

**Q: Why is Apple Wallet disabled?**
A: Apple Wallet requires an Apple Developer account ($99/year) and certificates. Contact admin to enable.

**Q: Do wallet passes expire?**
A: Passes can be configured to expire after the event ends (default) or remain active indefinitely.

**Q: Can I update a wallet pass after it's issued?**
A: Yes, wallet passes can be updated remotely. Changes will sync to attendees' devices automatically.

**Q: What happens if someone doesn't have Google Wallet?**
A: They can still access the contact card via QR code or link, and download the vCard file.

### Analytics

**Q: How accurate is the analytics data?**
A: Analytics is highly accurate for:
- Email delivery: 100% accurate (SES reports)
- Email opens: ~95% accurate (tracking pixel method)
- Link clicks: 100% accurate (redirect tracking)
- Card views: 100% accurate (server logs)

**Q: Why don't email open rates match 100%?**
A: Email clients with image blocking disabled won't load tracking pixels. Industry average open rate is 20-40%.

**Q: How long is analytics data retained?**
A: Analytics data is retained indefinitely. You can view historical data at any time.

**Q: Can I export analytics to Excel?**
A: Yes, click "Export CSV" on the analytics page. CSV files open in Excel, Google Sheets, etc.

### Billing & Plans

**Q: How much does OutreachPass cost?**
A: Contact christopherwlindeman@gmail.com for pricing information.

**Q: Is there a free trial?**
A: Contact support to inquire about trial availability.

**Q: What happens if I exceed my plan limits?**
A: Your account admin will be notified. You can upgrade or purchase add-ons as needed.

### Technical

**Q: What browsers are supported?**
A: Chrome, Safari, Firefox, and Edge (latest versions). Mobile browsers are also supported.

**Q: Is my data secure?**
A: Yes, all data is encrypted at rest and in transit. OutreachPass uses AWS infrastructure with enterprise-grade security.

**Q: Can I export my data?**
A: Yes, you can export attendee lists and analytics data as CSV files at any time.

**Q: Do you offer API access?**
A: API access is available for enterprise plans. Contact support for API documentation.

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl/Cmd + K` | Open search |
| `Ctrl/Cmd + N` | Create new event |
| `Ctrl/Cmd + ,` | Open settings |
| `Esc` | Close modal/dialog |
| `/` | Focus search box |

---

## Appendix

### CSV Template

**Download**: Click "Download CSV Template" on import page

**Format**:
```csv
first_name,last_name,email,phone,org_name,title,linkedin_url
John,Doe,john@example.com,+1-555-0100,Acme Corp,CEO,https://linkedin.com/in/johndoe
```

### Supported File Formats

**Import**:
- CSV (UTF-8 encoding)

**Export**:
- CSV (attendee lists, analytics)
- vCard (.vcf for contact cards)
- PKPass (.pkpass for Apple Wallet)

### Browser Compatibility

| Browser | Version | Support |
|---------|---------|---------|
| Chrome | 90+ | ✅ Full |
| Safari | 14+ | ✅ Full |
| Firefox | 88+ | ✅ Full |
| Edge | 90+ | ✅ Full |
| Mobile Safari | iOS 14+ | ✅ Full |
| Chrome Mobile | Android 10+ | ✅ Full |

### Contact Information

**Support Email**: christopherwlindeman@gmail.com
**Response Time**: Within 24 hours (business days)

---

**Document End** • [Back to Top](#outreachpass-user-guide)
