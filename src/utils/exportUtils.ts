import jsPDF from 'jspdf';
import 'jspdf-autotable';

export const exportToPdf = (analysis: AnalysisResult, dataset: Dataset) => {
  const doc = new jsPDF();
  
  // Title
  doc.setFontSize(20);
  doc.text('Data Analysis Report', 14, 22);
  
  // Summary section
  doc.setFontSize(14);
  doc.text('Summary Statistics', 14, 36);
  
  if (analysis.summaryStatistics) {
    const summaryData = Object.entries(analysis.summaryStatistics).map(([key, value]) => [key, value]);
    (doc as any).autoTable({
      startY: 40,
      head: [['Metric', 'Value']],
      body: summaryData,
      theme: 'grid',
      headStyles: { fillColor: [41, 128, 185] }
    });
  }
  
  // Add more sections as needed
  
  // Save the PDF
  doc.save('data_analysis_report.pdf');
};

export const exportToCsv = (analysis: AnalysisResult, dataset: Dataset) => {
  // Convert analysis to CSV
  let csvContent = "data:text/csv;charset=utf-8,";
  
  // Add summary stats
  csvContent += "Summary Statistics\n";
  if (analysis.summaryStatistics) {
    csvContent += Object.entries(analysis.summaryStatistics)
      .map(([key, value]) => `${key},${value}`)
      .join("\n");
  }
  
  // Add other analysis sections as needed
  
  // Create download link
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", "data_analysis_report.csv");
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
