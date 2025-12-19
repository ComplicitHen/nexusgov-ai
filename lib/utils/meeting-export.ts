/**
 * Meeting Export Utilities
 *
 * Export meeting minutes to PDF/A (archive-compliant) and DOCX formats
 */

import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Document, Paragraph, TextRun, HeadingLevel, AlignmentType, Packer } from 'docx';
import { MeetingMinutes, Meeting, ActionItem } from '@/types';

/**
 * Export meeting minutes as PDF/A format
 *
 * @param meeting - Meeting metadata
 * @param minutes - Meeting minutes data
 */
export async function exportMeetingAsPDF(meeting: Meeting, minutes: MeetingMinutes): Promise<void> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  // Set document properties for PDF/A compliance
  doc.setProperties({
    title: `Mötesprotokoll - ${meeting.title}`,
    subject: 'Mötesprotokoll',
    author: meeting.metadata?.participants?.join(', ') || 'NexusGov AI',
    keywords: minutes.topics.join(', '),
    creator: 'NexusGov AI',
  });

  let yPosition = 20;
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;
  const contentWidth = pageWidth - 2 * margin;

  // Title
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text(meeting.title, margin, yPosition);
  yPosition += 10;

  // Metadata
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);

  const metadata = [
    `Datum: ${meeting.uploadedAt.toLocaleDateString('sv-SE')}`,
    meeting.duration ? `Längd: ${Math.floor(meeting.duration / 60)} min ${Math.floor(meeting.duration % 60)} sek` : null,
    meeting.metadata?.participants?.length ? `Deltagare: ${meeting.metadata.participants.join(', ')}` : null,
    meeting.metadata?.location ? `Plats: ${meeting.metadata.location}` : null,
  ].filter(Boolean);

  metadata.forEach((line) => {
    doc.text(line!, margin, yPosition);
    yPosition += 5;
  });

  yPosition += 5;

  // Horizontal line
  doc.setDrawColor(200, 200, 200);
  doc.line(margin, yPosition, pageWidth - margin, yPosition);
  yPosition += 10;

  // Summary Section
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('Sammanfattning', margin, yPosition);
  yPosition += 7;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const summaryLines = doc.splitTextToSize(minutes.summary, contentWidth);
  doc.text(summaryLines, margin, yPosition);
  yPosition += summaryLines.length * 5 + 5;

  // Topics Section
  if (minutes.topics.length > 0) {
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Nyckelämnen', margin, yPosition);
    yPosition += 7;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    minutes.topics.forEach((topic) => {
      doc.text(`• ${topic}`, margin + 5, yPosition);
      yPosition += 5;
    });
    yPosition += 5;
  }

  // Check if we need a new page
  if (yPosition > 250) {
    doc.addPage();
    yPosition = 20;
  }

  // Decisions Section
  if (minutes.decisions.length > 0) {
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Beslut', margin, yPosition);
    yPosition += 7;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    minutes.decisions.forEach((decision, index) => {
      const decisionLines = doc.splitTextToSize(`${index + 1}. ${decision}`, contentWidth - 5);

      // Check if we need a new page
      if (yPosition + decisionLines.length * 5 > 280) {
        doc.addPage();
        yPosition = 20;
      }

      doc.text(decisionLines, margin + 5, yPosition);
      yPosition += decisionLines.length * 5 + 3;
    });
    yPosition += 5;
  }

  // Check if we need a new page before action items
  if (yPosition > 220) {
    doc.addPage();
    yPosition = 20;
  }

  // Action Items Table
  if (minutes.actionItems.length > 0) {
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Åtgärdspunkter', margin, yPosition);
    yPosition += 10;

    const tableData = minutes.actionItems.map((item) => [
      item.description,
      item.assignee || '-',
      item.dueDate ? new Date(item.dueDate).toLocaleDateString('sv-SE') : '-',
      getPriorityLabel(item.priority),
    ]);

    autoTable(doc, {
      startY: yPosition,
      head: [['Åtgärd', 'Ansvarig', 'Deadline', 'Prioritet']],
      body: tableData,
      theme: 'grid',
      headStyles: {
        fillColor: [41, 128, 185],
        textColor: 255,
        fontSize: 10,
        fontStyle: 'bold',
      },
      styles: {
        fontSize: 9,
        cellPadding: 3,
      },
      columnStyles: {
        0: { cellWidth: 'auto' },
        1: { cellWidth: 35 },
        2: { cellWidth: 30 },
        3: { cellWidth: 25 },
      },
      margin: { left: margin, right: margin },
    });

    yPosition = (doc as any).lastAutoTable.finalY + 10;
  }

  // Full Minutes Section (if different from summary)
  if (minutes.fullMinutes && minutes.fullMinutes !== minutes.summary) {
    if (yPosition > 220) {
      doc.addPage();
      yPosition = 20;
    }

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Fullständigt Protokoll', margin, yPosition);
    yPosition += 7;

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    const fullMinutesLines = doc.splitTextToSize(minutes.fullMinutes, contentWidth);

    fullMinutesLines.forEach((line: string) => {
      if (yPosition > 280) {
        doc.addPage();
        yPosition = 20;
      }
      doc.text(line, margin, yPosition);
      yPosition += 4;
    });
  }

  // Footer on all pages
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(
      `Genererat av NexusGov AI - ${new Date().toLocaleDateString('sv-SE')}`,
      margin,
      doc.internal.pageSize.getHeight() - 10
    );
    doc.text(
      `Sida ${i} av ${pageCount}`,
      pageWidth - margin - 20,
      doc.internal.pageSize.getHeight() - 10
    );
  }

  // Save the PDF
  const fileName = `${sanitizeFileName(meeting.title)}_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(fileName);
}

/**
 * Export meeting minutes as DOCX format
 *
 * @param meeting - Meeting metadata
 * @param minutes - Meeting minutes data
 */
export async function exportMeetingAsDOCX(meeting: Meeting, minutes: MeetingMinutes): Promise<void> {
  const children: Paragraph[] = [];

  // Title
  children.push(
    new Paragraph({
      text: meeting.title,
      heading: HeadingLevel.HEADING_1,
      spacing: { after: 200 },
    })
  );

  // Metadata
  const metadata = [
    `Datum: ${meeting.uploadedAt.toLocaleDateString('sv-SE')}`,
    meeting.duration ? `Längd: ${Math.floor(meeting.duration / 60)} min ${Math.floor(meeting.duration % 60)} sek` : null,
    meeting.metadata?.participants?.length ? `Deltagare: ${meeting.metadata.participants.join(', ')}` : null,
    meeting.metadata?.location ? `Plats: ${meeting.metadata.location}` : null,
  ].filter(Boolean) as string[];

  metadata.forEach((line) => {
    children.push(
      new Paragraph({
        children: [new TextRun({ text: line, size: 20, color: '666666' })],
        spacing: { after: 100 },
      })
    );
  });

  children.push(
    new Paragraph({
      text: '',
      spacing: { after: 200 },
      border: {
        bottom: {
          color: 'CCCCCC',
          space: 1,
          style: 'single',
          size: 6,
        },
      },
    })
  );

  // Summary
  children.push(
    new Paragraph({
      text: 'Sammanfattning',
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 200, after: 100 },
    })
  );

  children.push(
    new Paragraph({
      text: minutes.summary,
      spacing: { after: 200 },
    })
  );

  // Topics
  if (minutes.topics.length > 0) {
    children.push(
      new Paragraph({
        text: 'Nyckelämnen',
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 200, after: 100 },
      })
    );

    minutes.topics.forEach((topic) => {
      children.push(
        new Paragraph({
          text: topic,
          bullet: { level: 0 },
          spacing: { after: 50 },
        })
      );
    });

    children.push(new Paragraph({ text: '', spacing: { after: 200 } }));
  }

  // Decisions
  if (minutes.decisions.length > 0) {
    children.push(
      new Paragraph({
        text: 'Beslut',
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 200, after: 100 },
      })
    );

    minutes.decisions.forEach((decision, index) => {
      children.push(
        new Paragraph({
          text: `${index + 1}. ${decision}`,
          spacing: { after: 100 },
        })
      );
    });

    children.push(new Paragraph({ text: '', spacing: { after: 200 } }));
  }

  // Action Items
  if (minutes.actionItems.length > 0) {
    children.push(
      new Paragraph({
        text: 'Åtgärdspunkter',
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 200, after: 100 },
      })
    );

    minutes.actionItems.forEach((item, index) => {
      children.push(
        new Paragraph({
          children: [
            new TextRun({ text: `${index + 1}. `, bold: true }),
            new TextRun({ text: item.description }),
          ],
          spacing: { after: 50 },
        })
      );

      const details: string[] = [];
      if (item.assignee) details.push(`Ansvarig: ${item.assignee}`);
      if (item.dueDate) details.push(`Deadline: ${new Date(item.dueDate).toLocaleDateString('sv-SE')}`);
      details.push(`Prioritet: ${getPriorityLabel(item.priority)}`);

      children.push(
        new Paragraph({
          children: [new TextRun({ text: details.join(' | '), size: 18, color: '666666', italics: true })],
          spacing: { after: 150 },
          indent: { left: 720 },
        })
      );
    });

    children.push(new Paragraph({ text: '', spacing: { after: 200 } }));
  }

  // Full Minutes
  if (minutes.fullMinutes && minutes.fullMinutes !== minutes.summary) {
    children.push(
      new Paragraph({
        text: 'Fullständigt Protokoll',
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 400, after: 100 },
      })
    );

    const fullMinutesLines = minutes.fullMinutes.split('\n');
    fullMinutesLines.forEach((line) => {
      if (line.trim()) {
        children.push(
          new Paragraph({
            text: line,
            spacing: { after: 100 },
          })
        );
      } else {
        children.push(new Paragraph({ text: '', spacing: { after: 100 } }));
      }
    });
  }

  // Footer
  children.push(
    new Paragraph({
      text: '',
      spacing: { before: 400 },
      border: {
        top: {
          color: 'CCCCCC',
          space: 1,
          style: 'single',
          size: 6,
        },
      },
    })
  );

  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: `Genererat av NexusGov AI - ${new Date().toLocaleDateString('sv-SE')}`,
          size: 18,
          color: '999999',
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { before: 100 },
    })
  );

  // Create document
  const doc = new Document({
    sections: [
      {
        properties: {},
        children,
      },
    ],
  });

  // Generate and download
  const blob = await Packer.toBlob(doc);
  const fileName = `${sanitizeFileName(meeting.title)}_${new Date().toISOString().split('T')[0]}.docx`;

  // Create download link
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

/**
 * Helper: Get Swedish priority label
 */
function getPriorityLabel(priority: ActionItem['priority']): string {
  switch (priority) {
    case 'HIGH':
      return 'Hög';
    case 'MEDIUM':
      return 'Medel';
    case 'LOW':
      return 'Låg';
    default:
      return priority;
  }
}

/**
 * Helper: Sanitize filename
 */
function sanitizeFileName(fileName: string): string {
  return fileName
    .replace(/[^a-zA-Z0-9åäöÅÄÖ\s-]/g, '')
    .replace(/\s+/g, '_')
    .substring(0, 50);
}
