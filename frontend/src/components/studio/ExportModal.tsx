import React, { useState } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { FileText, X, FileSpreadsheet, ChevronDown, AlertTriangle } from 'lucide-react';
import { generateExecutiveSummary } from '../../data/mockData';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  result: any;
  cyInstance?: any;
  selectedUser?: any;
}

export default function ExportModal({ isOpen, onClose, result, cyInstance, selectedUser }: ExportModalProps) {
  const [exportScope, setExportScope] = useState('full');

  const MOCK_SUMMARY = generateExecutiveSummary(result);

  if (!isOpen) return null;

  const handleExportCSV = () => {
    // Upgraded CSV headers to include all 6 metrics
    
    const headers = [
      'Hash ID', 
      'Risk Score', 
      'Risk Label', 
      'Top Feature', 
      'Comment Frequency', 
      'Temporal Burst Activity', 
      'Content Repetition', 
      'Reply Count per Commenter', 
      'Degree Centrality', 
      'Clustering Coefficient'
    ];
    
    let dataToExport = [];
    if (exportScope === 'full') {
      dataToExport = result.commenters;
    } else if (exportScope === 'anomalous') {
      dataToExport = result.commenters.filter((c: any) => c.label === 'Anomalous');
    } else if (exportScope === 'single' && selectedUser) {
      dataToExport = [selectedUser]; // Wrap the single object in an array
    }

    const rows = dataToExport.map((c: any) => [
      c.hashId,
      c.riskScore.toFixed(3),
      c.label,
      c.topFeature,
      c.metrics.commentFrequency,
      c.metrics.temporalBurst,
      c.metrics.contentRepetition.toFixed(3),
      c.metrics.replyCount,
      c.metrics.degreeCentrality.toFixed(3),
      c.metrics.clusteringCoeff.toFixed(3)
    ]);

    let csvContent = [headers.join(','), ...rows.map((r: any[]) => r.join(','))].join('\n');

    // ─── INJECT WARNINGS INTO CSV ───
    if (result.totalCommenters < 30) {
      csvContent = `"WARNING: LOW CONFIDENCE OVERALL - The dataset contains fewer than 30 unique commenters. Classification metrics may exhibit high variance."\n` + csvContent;
    }
    if (result.overlappingCommenters < 10) {
      csvContent = `"WARNING: LOW NETWORK-SIGNAL STATE - Fewer than 10 unique commenters appear across multiple videos. Network metrics (Centrality/Clustering) are unreliable; classifications rely on behavioral features."\n` + csvContent;
    }
    
    // Add a final blank line to separate warnings from data
    if (result.totalCommenters < 30 || result.overlappingCommenters < 10) {
      csvContent = "\n" + csvContent;
    }
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    
    const filename = exportScope === 'single' ? `CIBWatch_${selectedUser.hashId}.csv` : `CIBWatch_Report_${result.jobId}.csv`;
    link.setAttribute('download', filename);
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    onClose();
  };

  const handleExportPDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    let currentY = 20;

    // --- 1. HEADER ---
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.setTextColor(11, 59, 140); 
    const titleText = exportScope === 'single' ? 'CIBWatch - Profile Audit' : 'CIBWatch - Analysis Report';
    doc.text(titleText, 14, currentY);
    currentY += 12;

    // --- 2. META DETAILS & METRICS ---
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    
    doc.text(`Job ID: #${result.jobId}`, 14, currentY);
    doc.text(`Date Processed: ${result.dateProcessed}`, 14, currentY + 6);
    doc.text(`Time Processed: ${result.timeProcessed}`, 14, currentY + 12);
    doc.text(`Contamination Parameter: ${result.contamination}`, 14, currentY + 18);

    doc.text(`Total Commenters: ${result.totalCommenters.toLocaleString()}`, 120, currentY);
    doc.text(`Organic Commenters: ${result.totalOrganic.toLocaleString()}`, 120, currentY + 6);
    doc.text(`Anomalous Commenters: ${result.totalAnomalous.toLocaleString()}`, 120, currentY + 12);
    doc.setTextColor(220, 38, 38); 
    doc.text(`Anomaly Rate: ${(result.anomalyRate * 100).toFixed(1)}%`, 120, currentY + 18);
    
    currentY += 28;

    // ─── 5. INJECT WARNINGS INTO PDF ───
    if (result.overlappingCommenters < 10) {
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 58, 138); // Dark Blue
      doc.text('WARNING: Low Network-Signal State', 14, currentY);
      currentY += 5;

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      const networkWarningText = "Fewer than 10 unique commenters appear across multiple videos. The co-commenter graph is too sparse to produce meaningful degree centrality and clustering coefficient values. Anomaly classifications are driven primarily by behavioral features.";
      const splitNetworkWarning = doc.splitTextToSize(networkWarningText, pageWidth - 28);
      doc.text(splitNetworkWarning, 14, currentY);
      currentY += (splitNetworkWarning.length * 4) + 6;
    }

    if (result.totalCommenters < 30) {
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(220, 38, 38); // Bold Red
      doc.text('WARNING: Low Confidence Overall', 14, currentY);
      currentY += 5;

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(180, 83, 9); // Dark amber/orange
      const overallWarningText = "The dataset contains fewer than 30 unique commenters. Overall classification metrics may exhibit high variance and should be audited manually.";
      const splitOverallWarning = doc.splitTextToSize(overallWarningText, pageWidth - 28);
      doc.text(splitOverallWarning, 14, currentY);
      currentY += (splitOverallWarning.length * 4) + 6;
    }

    // --- 3. VIDEOS ANALYZED ---
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(12);
    doc.text('Videos Analyzed', 14, currentY);
    currentY += 6;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    result.videos.forEach((v: any) => {
      doc.text(`• ${v.title} (${v.url})`, 14, currentY);
      currentY += 5;
    });
    currentY += 5;

    // --- 4. EXECUTIVE SUMMARY ---
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Executive Summary', 14, currentY);
    currentY += 6;
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(80, 80, 80);
    const splitSummary = doc.splitTextToSize(MOCK_SUMMARY, pageWidth - 28);
    doc.text(splitSummary, 14, currentY);
    currentY += (splitSummary.length * 5) + 8;

    // --- 5. NETWORK GRAPH SNAPSHOT ---
    let graphImage = null;
    if (cyInstance) {
      try {
        const activeElements = cyInstance.$('.active');
        if (exportScope !== 'single') {
          activeElements.removeClass('active');
        }

        graphImage = cyInstance.png({ bg: '#ffffff', full: true });

        if (exportScope !== 'single') {
          activeElements.addClass('active');
        }
      } catch (err) {
        console.error("Failed to capture graph", err);
      }
    }
    
    if (graphImage) {
      const imgProps = doc.getImageProperties(graphImage);
      const maxImgWidth = 180; 
      const maxImgHeight = 110; 
      const ratio = Math.min(maxImgWidth / imgProps.width, maxImgHeight / imgProps.height);
      const finalWidth = imgProps.width * ratio;
      const finalHeight = imgProps.height * ratio;

      if (currentY + finalHeight + 10 > pageHeight - 20) { 
        doc.addPage();
        currentY = 20;
      }

      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 0, 0);
      doc.text('Network Topology Snapshot', 14, currentY);
      currentY += 6;
      
      doc.addImage(graphImage, 'PNG', 14, currentY, finalWidth, finalHeight);
      currentY += finalHeight + 10;
    }

    // --- 6. TOP 100 COMMENTERS WITH ALL 6 METRICS ---
    if (exportScope === 'single' && selectedUser) {
      // Single profile is small, keep it portrait. Just check if it needs a new portrait page.
      if (currentY > pageHeight - 60) {
        doc.addPage();
        currentY = 20;
      } else {
        currentY += 15;
      }

      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text(`Target Profile Analysis`, 14, currentY);
      currentY += 8;

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Hash ID: ${selectedUser.hashId}`, 14, currentY);
      doc.text(`Risk Score: ${selectedUser.riskScore.toFixed(2)}`, 14, currentY + 6);
      doc.text(`Classification: ${selectedUser.label}`, 14, currentY + 12);
      doc.text(`Primary Feature Trigger: ${selectedUser.topFeature}`, 14, currentY + 18);
      currentY += 28;

      autoTable(doc, {
        startY: currentY,
        head: [['Behavioral & Structural Metric', 'Raw Value', 'SHAP Impact']],
        body: [
          ['Comment Frequency', selectedUser.metrics.commentFrequency, selectedUser.shapLocal.commentFrequency.toFixed(3)],
          ['Temporal Burst Activity', selectedUser.metrics.temporalBurst, selectedUser.shapLocal.temporalBurst.toFixed(3)],
          ['Content Repetition', selectedUser.metrics.contentRepetition.toFixed(3), selectedUser.shapLocal.contentRepetition.toFixed(3)],
          ['Reply Count', selectedUser.metrics.replyCount, selectedUser.shapLocal.replyCount.toFixed(3)],
          ['Degree Centrality', selectedUser.metrics.degreeCentrality.toFixed(3), selectedUser.shapLocal.degreeCentrality.toFixed(3)],
          ['Clustering Coefficient', selectedUser.metrics.clusteringCoeff.toFixed(3), selectedUser.shapLocal.clusteringCoeff.toFixed(3)],
        ],
        theme: 'grid',
        headStyles: { fillColor: [11, 59, 140], textColor: 255, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        margin: { top: 20, left: 14, right: 14 }
      });

    } else {
      // Standard Top 100 Render (Full or Anomalous)
      // Force a new landscape page for the wide data table
      doc.addPage('a4', 'landscape');
      currentY = 20;

      let tableData = result.commenters;
      if (exportScope === 'anomalous') {
        tableData = tableData.filter((c: any) => c.label === 'Anomalous');
      }

      const top100 = tableData
        .sort((a: any, b: any) => b.riskScore - a.riskScore)
        .slice(0, 100);

      autoTable(doc, {
        startY: currentY,
        head: [['Hash ID', 'Risk\nScore', 'Risk Label', 'Top\nFeature', 'Comment\nFrequency', 'Temporal\nBurst\nActivity', 'Content\nRepetition', 'Reply\nCount', 'Degree\nCentrality', 'Clustering\nCoefficient']],
        body: top100.map((c: any) => [
          c.hashId, 
          c.riskScore.toFixed(2), 
          c.label, 
          c.topFeature,
          `${c.metrics.commentFrequency}\n[+${c.shapLocal.commentFrequency.toFixed(2)}]`,
          `${c.metrics.temporalBurst}\n[+${c.shapLocal.temporalBurst.toFixed(2)}]`,
          `${c.metrics.contentRepetition.toFixed(2)}\n[+${c.shapLocal.contentRepetition.toFixed(2)}]`,
          `${c.metrics.replyCount}\n[+${c.shapLocal.replyCount.toFixed(2)}]`,
          `${c.metrics.degreeCentrality.toFixed(2)}\n[+${c.shapLocal.degreeCentrality.toFixed(2)}]`,
          `${c.metrics.clusteringCoeff.toFixed(2)}\n[+${c.shapLocal.clusteringCoeff.toFixed(2)}]`
        ]),
        theme: 'grid',
        // Bumped font sizes back up to 8.5 for readability
        headStyles: { fillColor: [11, 59, 140], textColor: 255, fontStyle: 'bold', fontSize: 8.5, halign: 'center' },
        // Increased cell padding to let the text breathe
        styles: { fontSize: 8.5, cellPadding: 3, overflow: 'linebreak', halign: 'center', valign: 'middle' },
        columnStyles: { 
          0: { cellWidth: 26, halign: 'left' },
          3: { cellWidth: 24 }
        },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        margin: { top: 20, left: 14, right: 14 }
      });
    }

    const filename = exportScope === 'single' ? `CIBWatch_Profile_${selectedUser?.hashId}.pdf` : `CIBWatch_Report_${result.jobId}.pdf`;
    doc.save(filename);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl p-0 max-w-[500px] w-full shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
        
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="bg-blue-50 p-2 rounded-xl">
              <FileText className="w-5 h-5 text-[#0B3B8C]" />
            </div>
            <h2 className="text-lg font-extrabold text-[#0B3B8C] uppercase tracking-wide">Export Report</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <p className="text-[14px] font-medium text-gray-500 leading-relaxed">
            Export the calculated hybrid model evaluations into formal compliance reports for offline review and audit.
          </p>

          <div className="space-y-2.5">
            <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Select Scope</label>
            <div className="relative">
              <select 
                value={exportScope}
                onChange={(e) => setExportScope(e.target.value)}
                className="w-full appearance-none bg-white border border-gray-200 text-gray-900 text-[14px] rounded-xl px-4 py-3 font-medium focus:outline-none focus:ring-2 focus:ring-[#0B3B8C]/20 focus:border-[#0B3B8C] transition-all cursor-pointer shadow-sm"
              >
                <option value="full">Full Report (All Commenters)</option>
                <option value="anomalous">Anomalous Only (Top Threats)</option>
                {selectedUser && (
                  <option value="single">Selected Profile ({selectedUser.hashId})</option>
                )}
              </select>
              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
          </div>

          <div className="space-y-2.5">
            <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Select Export Format</label>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={handleExportCSV} className="flex flex-col items-center justify-center p-4 border-2 border-transparent bg-gray-50 hover:bg-[#84CC16]/5 hover:border-[#84CC16]/30 rounded-2xl transition-all group">
                <FileSpreadsheet className="w-8 h-8 text-[#84CC16] mb-2 group-hover:scale-110 transition-transform" />
                <span className="font-bold text-[14px] text-gray-900 mb-0.5">Download CSV</span>
                <span className="text-[11px] text-gray-400 font-medium text-center">Matrix & features</span>
              </button>
              <button onClick={handleExportPDF} className="flex flex-col items-center justify-center p-4 border-2 border-transparent bg-gray-50 hover:bg-[#0B3B8C]/5 hover:border-[#0B3B8C]/30 rounded-2xl transition-all group">
                <FileText className="w-8 h-8 text-[#0B3B8C] mb-2 group-hover:scale-110 transition-transform" />
                <span className="font-bold text-[14px] text-gray-900 mb-0.5">Download PDF</span>
                <span className="text-[11px] text-gray-400 font-medium text-center">Visuals & SHAP</span>
              </button>
            </div>
          </div>

          <div className="bg-[#FFFBEB] border border-[#FEF3C7] rounded-xl p-3.5 flex gap-3 items-start">
            <AlertTriangle className="w-4 h-4 text-[#D97706] shrink-0 mt-0.5" />
            <p className="text-[12px] text-[#B45309] font-medium leading-relaxed">
              <strong className="font-bold">Report Warning:</strong> Low signal parameters or dataset size anomalies will be permanently printed alongside risk indicators.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}