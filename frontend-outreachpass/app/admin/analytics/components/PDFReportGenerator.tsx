"use client";

import { Download } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { useState } from 'react';

interface AnalyticsOverview {
  total_emails: number;
  total_email_opens: number;
  total_email_clicks: number;
  total_card_views: number;
  total_wallet_passes: number;
  total_contact_exports: number;
  unique_visitors: number;
  email_open_rate: number;
  email_click_rate: number;
  breakdown?: {
    by_source?: Record<string, number>;
    by_device?: Record<string, number>;
  };
}

interface EmailAnalytics {
  event_type: string;
  count: number;
  occurred_at?: string;
}

interface CardViewAnalytics {
  source_type: string;
  count: number;
  occurred_at?: string;
}

interface WalletAnalytics {
  platform: string;
  event_type: string;
  count: number;
}

interface PDFReportGeneratorProps {
  overview: AnalyticsOverview | undefined;
  emailAnalytics: EmailAnalytics[] | undefined;
  cardViewAnalytics: CardViewAnalytics[] | undefined;
  walletAnalytics: WalletAnalytics[] | undefined;
  dateRange: string;
  dateMode: 'preset' | 'custom';
  startDate: string;
  endDate: string;
  eventName?: string;
  comparisonEnabled: boolean;
  previousOverview?: AnalyticsOverview;
}

export function PDFReportGenerator({
  overview,
  emailAnalytics,
  cardViewAnalytics,
  walletAnalytics,
  dateRange,
  dateMode,
  startDate,
  endDate,
  eventName,
  comparisonEnabled,
  previousOverview,
}: PDFReportGeneratorProps) {
  const [isGenerating, setIsGenerating] = useState(false);

  const formatDateRange = () => {
    if (dateMode === 'custom' && startDate && endDate) {
      return `${new Date(startDate).toLocaleDateString()} - ${new Date(endDate).toLocaleDateString()}`;
    }
    const days = parseInt(dateRange.replace('d', ''));
    return `Last ${days} days`;
  };

  const captureChart = async (elementId: string): Promise<string | null> => {
    const element = document.getElementById(elementId);
    if (!element) return null;

    try {
      const canvas = await html2canvas(element, {
        scale: 2,
        backgroundColor: '#ffffff',
        logging: false,
      });
      return canvas.toDataURL('image/png');
    } catch (error) {
      console.error(`Error capturing chart ${elementId}:`, error);
      return null;
    }
  };

  const generatePDF = async () => {
    if (!overview) {
      alert('No analytics data available to export');
      return;
    }

    setIsGenerating(true);

    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 15;
      const contentWidth = pageWidth - 2 * margin;
      let yPosition = margin;

      // Header
      pdf.setFontSize(24);
      pdf.setTextColor(33, 37, 41);
      pdf.text('OutreachPass Analytics Report', margin, yPosition);
      yPosition += 10;

      // Date range and generation info
      pdf.setFontSize(10);
      pdf.setTextColor(108, 117, 125);
      pdf.text(`Period: ${formatDateRange()}`, margin, yPosition);
      yPosition += 5;
      pdf.text(`Generated: ${new Date().toLocaleString()}`, margin, yPosition);
      yPosition += 5;
      if (eventName) {
        pdf.text(`Event: ${eventName}`, margin, yPosition);
        yPosition += 5;
      }
      if (comparisonEnabled && previousOverview) {
        pdf.text('Comparison: Period-over-Period Analysis Enabled', margin, yPosition);
        yPosition += 5;
      }
      yPosition += 10;

      // Executive Summary
      pdf.setFontSize(16);
      pdf.setTextColor(33, 37, 41);
      pdf.text('Executive Summary', margin, yPosition);
      yPosition += 10;

      // Key Metrics Grid
      pdf.setFontSize(10);
      const metrics = [
        { label: 'Total Emails Sent', value: overview.total_emails.toLocaleString(), change: comparisonEnabled && previousOverview ? calculateChange(overview.total_emails, previousOverview.total_emails) : null },
        { label: 'Email Open Rate', value: `${overview.email_open_rate.toFixed(1)}%`, change: comparisonEnabled && previousOverview ? calculateChange(overview.email_open_rate, previousOverview.email_open_rate) : null },
        { label: 'Card Views', value: overview.total_card_views.toLocaleString(), change: comparisonEnabled && previousOverview ? calculateChange(overview.total_card_views, previousOverview.total_card_views) : null },
        { label: 'Unique Visitors', value: overview.unique_visitors.toLocaleString(), change: comparisonEnabled && previousOverview ? calculateChange(overview.unique_visitors, previousOverview.unique_visitors) : null },
        { label: 'Wallet Passes', value: overview.total_wallet_passes.toLocaleString(), change: comparisonEnabled && previousOverview ? calculateChange(overview.total_wallet_passes, previousOverview.total_wallet_passes) : null },
        { label: 'Contact Exports', value: overview.total_contact_exports.toLocaleString(), change: comparisonEnabled && previousOverview ? calculateChange(overview.total_contact_exports, previousOverview.total_contact_exports) : null },
      ];

      const gridCols = 2;
      const gridRows = Math.ceil(metrics.length / gridCols);
      const cellWidth = contentWidth / gridCols;
      const cellHeight = 20;

      for (let i = 0; i < metrics.length; i++) {
        const row = Math.floor(i / gridCols);
        const col = i % gridCols;
        const x = margin + col * cellWidth;
        const y = yPosition + row * cellHeight;

        // Draw cell border
        pdf.setDrawColor(222, 226, 230);
        pdf.rect(x, y, cellWidth, cellHeight);

        // Label
        pdf.setFontSize(9);
        pdf.setTextColor(108, 117, 125);
        pdf.text(metrics[i].label, x + 3, y + 7);

        // Value
        pdf.setFontSize(14);
        pdf.setTextColor(33, 37, 41);
        pdf.text(metrics[i].value, x + 3, y + 14);

        // Change (if comparison enabled)
        if (metrics[i].change !== null) {
          pdf.setFontSize(8);
          const changeColor = metrics[i].change! > 0 ? [34, 197, 94] : metrics[i].change! < 0 ? [239, 68, 68] : [156, 163, 175];
          pdf.setTextColor(changeColor[0], changeColor[1], changeColor[2]);
          const changeSymbol = metrics[i].change! > 0 ? '↑' : metrics[i].change! < 0 ? '↓' : '−';
          pdf.text(`${changeSymbol} ${Math.abs(metrics[i].change!).toFixed(1)}%`, x + 3, y + 18);
        }
      }

      yPosition += gridRows * cellHeight + 15;

      // Email Funnel Summary
      if (emailAnalytics && emailAnalytics.length > 0) {
        pdf.setFontSize(12);
        pdf.setTextColor(33, 37, 41);
        pdf.text('Email Campaign Performance', margin, yPosition);
        yPosition += 8;

        pdf.setFontSize(9);
        pdf.setTextColor(73, 80, 87);

        // Aggregate email data
        const emailCounts: Record<string, number> = {};
        emailAnalytics.forEach(item => {
          emailCounts[item.event_type] = (emailCounts[item.event_type] || 0) + item.count;
        });

        const sent = emailCounts['sent'] || 0;
        const delivered = emailCounts['delivered'] || 0;
        const opened = emailCounts['opened'] || 0;
        const clicked = emailCounts['clicked'] || 0;
        const bounced = emailCounts['bounced'] || 0;
        const complained = emailCounts['complained'] || 0;

        const funnelData = [
          sent > 0 ? `Sent: ${sent.toLocaleString()} → Delivered: ${delivered.toLocaleString()} (${((delivered / sent) * 100).toFixed(1)}%)` : 'No email data',
          sent > 0 ? `Opened: ${opened.toLocaleString()} (${((opened / sent) * 100).toFixed(1)}%) → Clicked: ${clicked.toLocaleString()} (${((clicked / sent) * 100).toFixed(1)}%)` : '',
          sent > 0 ? `Bounced: ${bounced.toLocaleString()} (${((bounced / sent) * 100).toFixed(1)}%) | Complaints: ${complained.toLocaleString()}` : '',
        ].filter(line => line);

        funnelData.forEach(line => {
          pdf.text(line, margin + 5, yPosition);
          yPosition += 5;
        });

        yPosition += 5;
      }

      // Check if we need a new page
      if (yPosition > pageHeight - 40) {
        pdf.addPage();
        yPosition = margin;
      }

      // Charts Section
      pdf.setFontSize(16);
      pdf.setTextColor(33, 37, 41);
      pdf.text('Analytics Charts', margin, yPosition);
      yPosition += 10;

      // Capture and add charts
      const chartIds = [
        { id: 'email-funnel-chart', title: 'Email Event Distribution' },
        { id: 'card-source-chart', title: 'Card View Sources' },
        { id: 'wallet-platform-chart', title: 'Wallet Pass Platform Distribution' },
      ];

      for (const chart of chartIds) {
        if (yPosition > pageHeight - 80) {
          pdf.addPage();
          yPosition = margin;
        }

        pdf.setFontSize(12);
        pdf.setTextColor(33, 37, 41);
        pdf.text(chart.title, margin, yPosition);
        yPosition += 5;

        const chartImage = await captureChart(chart.id);
        if (chartImage) {
          const imgWidth = contentWidth;
          const imgHeight = 60;
          pdf.addImage(chartImage, 'PNG', margin, yPosition, imgWidth, imgHeight);
          yPosition += imgHeight + 10;
        } else {
          pdf.setFontSize(9);
          pdf.setTextColor(156, 163, 175);
          pdf.text('Chart not available', margin + 5, yPosition);
          yPosition += 10;
        }
      }

      // Data Tables Section
      if (yPosition > pageHeight - 60) {
        pdf.addPage();
        yPosition = margin;
      }

      pdf.setFontSize(16);
      pdf.setTextColor(33, 37, 41);
      pdf.text('Detailed Breakdown', margin, yPosition);
      yPosition += 10;

      // Card View Sources Table
      if (cardViewAnalytics && cardViewAnalytics.length > 0) {
        const sourceCounts: Record<string, number> = {};
        let totalViews = 0;
        cardViewAnalytics.forEach(item => {
          sourceCounts[item.source_type] = (sourceCounts[item.source_type] || 0) + item.count;
          totalViews += item.count;
        });

        if (Object.keys(sourceCounts).length > 0) {
          pdf.setFontSize(12);
          pdf.text('Card View Sources', margin, yPosition);
          yPosition += 7;

          pdf.setFontSize(9);
          Object.entries(sourceCounts).forEach(([source, count]) => {
            const percentage = totalViews > 0 ? ((count / totalViews) * 100).toFixed(1) : '0.0';
            pdf.text(`${source}: ${count.toLocaleString()} (${percentage}%)`, margin + 5, yPosition);
            yPosition += 5;
          });
          yPosition += 5;
        }
      }

      // Device Types Table (from overview breakdown)
      if (overview?.breakdown?.by_device) {
        if (yPosition > pageHeight - 30) {
          pdf.addPage();
          yPosition = margin;
        }

        const totalViews = Object.values(overview.breakdown.by_device).reduce((sum, count) => sum + count, 0);

        if (totalViews > 0) {
          pdf.setFontSize(12);
          pdf.setTextColor(33, 37, 41);
          pdf.text('Device Types', margin, yPosition);
          yPosition += 7;

          pdf.setFontSize(9);
          Object.entries(overview.breakdown.by_device).forEach(([device, count]) => {
            const percentage = ((count / totalViews) * 100).toFixed(1);
            pdf.text(`${device}: ${count.toLocaleString()} (${percentage}%)`, margin + 5, yPosition);
            yPosition += 5;
          });
          yPosition += 5;
        }
      }

      // Wallet Platform Distribution
      if (walletAnalytics && walletAnalytics.length > 0) {
        if (yPosition > pageHeight - 30) {
          pdf.addPage();
          yPosition = margin;
        }

        const platformCounts: Record<string, number> = {};
        let totalWallet = 0;
        walletAnalytics.forEach(item => {
          platformCounts[item.platform] = (platformCounts[item.platform] || 0) + item.count;
          totalWallet += item.count;
        });

        if (Object.keys(platformCounts).length > 0) {
          pdf.setFontSize(12);
          pdf.setTextColor(33, 37, 41);
          pdf.text('Wallet Platforms', margin, yPosition);
          yPosition += 7;

          pdf.setFontSize(9);
          Object.entries(platformCounts).forEach(([platform, count]) => {
            const percentage = totalWallet > 0 ? ((count / totalWallet) * 100).toFixed(1) : '0.0';
            pdf.text(`${platform}: ${count.toLocaleString()} (${percentage}%)`, margin + 5, yPosition);
            yPosition += 5;
          });
        }
      }

      // Footer on last page
      pdf.setFontSize(8);
      pdf.setTextColor(156, 163, 175);
      const footerY = pageHeight - 10;
      pdf.text('OutreachPass Analytics Report', margin, footerY);
      pdf.text(`Page ${pdf.getNumberOfPages()}`, pageWidth - margin - 15, footerY);

      // Save PDF
      const fileName = `OutreachPass_Analytics_${formatDateRange().replace(/\//g, '-')}_${new Date().getTime()}.pdf`;
      pdf.save(fileName);

      setIsGenerating(false);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF report. Please try again.');
      setIsGenerating(false);
    }
  };

  const calculateChange = (current: number, previous: number): number | null => {
    if (previous === 0) return null;
    return ((current - previous) / previous) * 100;
  };

  return (
    <button
      onClick={generatePDF}
      disabled={isGenerating || !overview}
      className="inline-flex items-center px-4 py-2 bg-brand-primary text-white rounded-lg hover:bg-brand-primary/90 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
    >
      <Download className="h-4 w-4 mr-2" />
      {isGenerating ? 'Generating PDF...' : 'Export PDF'}
    </button>
  );
}
