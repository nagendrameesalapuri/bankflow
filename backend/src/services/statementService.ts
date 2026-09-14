import PDFDocument from 'pdfkit';
import * as accountRepo from '../repositories/accountRepository';
import * as statementRepo from '../repositories/statementRepository';
import * as transactionRepo from '../repositories/transactionRepository';
import * as userRepo from '../repositories/userRepository';
import { ApiError } from '../utils/ApiError';
import { maskAccountNumber } from '../utils/format';

async function getOwnedAccount(userId: string, accountId: string) {
  const account = await accountRepo.findById(accountId);
  if (!account || account.user_id !== userId) throw ApiError.notFound('Account not found.');
  return account;
}

export async function generateStatement(userId: string, accountId: string, periodStart: string, periodEnd: string) {
  const account = await getOwnedAccount(userId, accountId);
  if (new Date(periodStart) > new Date(periodEnd)) {
    throw ApiError.badRequest('Start date must be before end date.');
  }

  const transactions = await transactionRepo.listInRange(accountId, periodStart, periodEnd);
  const closingBalance =
    transactions.length > 0 ? Number(transactions[transactions.length - 1].balance_after) : Number(account.current_balance);
  const netChange = transactions.reduce(
    (sum, t) => sum + (t.direction === 'CREDIT' ? Number(t.amount) : -Number(t.amount)),
    0,
  );
  const openingBalance = closingBalance - netChange;

  const statement = await statementRepo.create({
    accountId,
    periodStart,
    periodEnd,
    openingBalance,
    closingBalance,
  });

  return {
    id: statement.id,
    accountId,
    periodStart,
    periodEnd,
    openingBalance,
    closingBalance,
    transactionCount: transactions.length,
    generatedAt: statement.generated_at,
  };
}

export async function listStatements(userId: string, accountId: string) {
  await getOwnedAccount(userId, accountId);
  const rows = await statementRepo.listByAccount(accountId);
  return rows.map((s) => ({
    id: s.id,
    accountId: s.account_id,
    periodStart: s.period_start,
    periodEnd: s.period_end,
    openingBalance: Number(s.opening_balance),
    closingBalance: Number(s.closing_balance),
    generatedAt: s.generated_at,
  }));
}

async function loadStatementForDownload(userId: string, statementId: string) {
  const statement = await statementRepo.findById(statementId);
  if (!statement) throw ApiError.notFound('Statement not found.');
  const account = await getOwnedAccount(userId, statement.account_id);
  const user = await userRepo.findById(userId);
  const transactions = await transactionRepo.listInRange(
    statement.account_id,
    statement.period_start.toISOString().slice(0, 10),
    statement.period_end.toISOString().slice(0, 10),
  );
  return { statement, account, user, transactions };
}

const PDF_COLORS = {
  brandDark: '#161c50',
  brand: '#2447ee',
  brandLight: '#5b90ff',
  violet: '#8a55ef',
  ink900: '#1b1f2e',
  ink600: '#535d78',
  ink400: '#8b95ab',
  ink200: '#dbe0e8',
  ink100: '#eef0f4',
  ink50: '#f7f8fa',
  white: '#ffffff',
  success: '#0f9d6e',
  successBg: '#e3f8ef',
  warning: '#b45309',
  warningBg: '#fef3c7',
  danger: '#dc2626',
  dangerBg: '#fee2e2',
  neutralBg: '#e9ebf1',
};

const STATUS_TONE: Record<string, { text: string; bg: string }> = {
  SUCCESS: { text: PDF_COLORS.success, bg: PDF_COLORS.successBg },
  PENDING: { text: PDF_COLORS.warning, bg: PDF_COLORS.warningBg },
  FAILED: { text: PDF_COLORS.danger, bg: PDF_COLORS.dangerBg },
  REVERSED: { text: PDF_COLORS.ink600, bg: PDF_COLORS.neutralBg },
};

interface TableColumn {
  key: 'date' | 'reference' | 'description' | 'type' | 'amount' | 'status';
  label: string;
  width: number;
  align?: 'left' | 'right' | 'center';
}

const PAGE_MARGIN = 44;
const TABLE_COLUMNS: TableColumn[] = [
  { key: 'date', label: 'DATE', width: 62 },
  { key: 'reference', label: 'REFERENCE', width: 116 },
  { key: 'description', label: 'DESCRIPTION', width: 132 },
  { key: 'type', label: 'TYPE', width: 82 },
  { key: 'amount', label: 'AMOUNT', width: 78, align: 'right' },
  { key: 'status', label: 'STATUS', width: 62, align: 'center' },
];
const TABLE_WIDTH = TABLE_COLUMNS.reduce((sum, c) => sum + c.width, 0);

export async function buildStatementPdf(userId: string, statementId: string): Promise<Buffer> {
  const { statement, account, user, transactions } = await loadStatementForDownload(userId, statementId);

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: PAGE_MARGIN, size: 'A4', bufferPages: true });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const pageWidth = doc.page.width;
    const contentBottom = doc.page.height - PAGE_MARGIN - 30;

    // ---- Header band ----
    const headerGradient = doc.linearGradient(0, 0, pageWidth, 96);
    headerGradient.stop(0, PDF_COLORS.brandDark).stop(0.6, PDF_COLORS.brand).stop(1, PDF_COLORS.violet);
    doc.rect(0, 0, pageWidth, 96).fill(headerGradient);
    doc
      .fillColor(PDF_COLORS.white)
      .fontSize(22)
      .font('Helvetica-Bold')
      .text('BankFlow', PAGE_MARGIN, 26);
    doc
      .fillColor('#c7d2fe')
      .fontSize(9)
      .font('Helvetica')
      .text('Fictional demo bank - no real funds or accounts are involved.', PAGE_MARGIN, 54);
    doc
      .fillColor(PDF_COLORS.white)
      .fontSize(13)
      .font('Helvetica-Bold')
      .text('ACCOUNT STATEMENT', PAGE_MARGIN, 34, { align: 'right', width: pageWidth - PAGE_MARGIN * 2 });

    let y = 118;

    // ---- Info panel: account details (left) + balance summary card (right) ----
    const panelHeight = 102;
    const panelWidth = pageWidth - PAGE_MARGIN * 2;
    const summaryWidth = 180;
    const detailsWidth = panelWidth - summaryWidth - 14;

    doc.roundedRect(PAGE_MARGIN, y, detailsWidth, panelHeight, 8).fill(PDF_COLORS.ink50);
    doc.roundedRect(PAGE_MARGIN, y, detailsWidth, panelHeight, 8).lineWidth(1).stroke(PDF_COLORS.ink100);

    const detailX = PAGE_MARGIN + 18;
    const detailValueWidth = detailsWidth - 36;
    const labelStyle = () => doc.fillColor(PDF_COLORS.ink400).font('Helvetica-Bold').fontSize(7.5);
    const valueStyle = () => doc.fillColor(PDF_COLORS.ink900).font('Helvetica').fontSize(10);

    labelStyle().text('CUSTOMER', detailX, y + 16);
    valueStyle().text(user?.full_name ?? 'N/A', detailX, y + 27, { width: detailValueWidth });
    labelStyle().text('ACCOUNT', detailX, y + 46);
    valueStyle().text(`${maskAccountNumber(account.account_number)}  ·  ${account.account_type}`, detailX, y + 57, {
      width: detailValueWidth,
    });
    labelStyle().text('STATEMENT PERIOD', detailX, y + 76);
    valueStyle().text(
      `${statement.period_start.toISOString().slice(0, 10)}  to  ${statement.period_end.toISOString().slice(0, 10)}`,
      detailX,
      y + 87,
      { width: detailValueWidth },
    );

    const openingBal = Number(statement.opening_balance);
    const closingBal = Number(statement.closing_balance);
    const trendUp = closingBal >= openingBal;
    const summaryX = PAGE_MARGIN + detailsWidth + 14;

    const summaryGradient = doc.linearGradient(summaryX, y, summaryX, y + panelHeight);
    summaryGradient.stop(0, PDF_COLORS.brand).stop(1, PDF_COLORS.brandDark);
    doc.roundedRect(summaryX, y, summaryWidth, panelHeight, 8).fill(summaryGradient);

    doc
      .fillColor('#c7d2fe')
      .font('Helvetica-Bold')
      .fontSize(7.5)
      .text('OPENING BALANCE', summaryX + 16, y + 14);
    doc
      .fillColor(PDF_COLORS.white)
      .font('Helvetica')
      .fontSize(11)
      .text(`${account.currency} ${openingBal.toFixed(2)}`, summaryX + 16, y + 25);

    doc
      .moveTo(summaryX + 16, y + 48)
      .lineTo(summaryX + summaryWidth - 16, y + 48)
      .lineWidth(0.5)
      .stroke('#3d4a9e');

    doc
      .fillColor('#c7d2fe')
      .font('Helvetica-Bold')
      .fontSize(7.5)
      .text('CLOSING BALANCE', summaryX + 16, y + 58);
    doc
      .fillColor(trendUp ? '#6ee7b7' : '#fca5a5')
      .font('Helvetica-Bold')
      .fontSize(13)
      .text(`${account.currency} ${closingBal.toFixed(2)}`, summaryX + 16, y + 69);

    y += panelHeight + 22;

    // ---- Transactions table ----
    doc.fillColor(PDF_COLORS.ink900).font('Helvetica-Bold').fontSize(12).text('Transactions', PAGE_MARGIN, y);
    doc
      .fillColor(PDF_COLORS.ink400)
      .font('Helvetica')
      .fontSize(9)
      .text(`${transactions.length} transaction${transactions.length === 1 ? '' : 's'} in this period`, PAGE_MARGIN, y + 15);
    y += 34;

    function drawTableHeader(startY: number): number {
      const rowH = 24;
      doc.rect(PAGE_MARGIN, startY, TABLE_WIDTH, rowH).fill(PDF_COLORS.brandDark);
      let x = PAGE_MARGIN;
      for (const col of TABLE_COLUMNS) {
        doc
          .fillColor(PDF_COLORS.white)
          .font('Helvetica-Bold')
          .fontSize(7.5)
          .text(col.label, x + 8, startY + 8, { width: col.width - 12, align: col.align ?? 'left' });
        x += col.width;
      }
      return startY + rowH;
    }

    function drawStatusChip(status: string, x: number, colWidth: number, rowY: number) {
      const tone = STATUS_TONE[status] ?? { text: PDF_COLORS.ink600, bg: PDF_COLORS.neutralBg };
      const label = status.slice(0, 8);
      doc.font('Helvetica-Bold').fontSize(6.5);
      const textWidth = doc.widthOfString(label) + 12;
      const chipX = x + (colWidth - textWidth) / 2;
      doc.roundedRect(chipX, rowY + 4, textWidth, 13, 6.5).fill(tone.bg);
      doc.fillColor(tone.text).text(label, chipX, rowY + 7.5, { width: textWidth, align: 'center' });
    }

    y = drawTableHeader(y);

    if (transactions.length === 0) {
      doc
        .rect(PAGE_MARGIN, y, TABLE_WIDTH, 40)
        .fill(PDF_COLORS.ink50);
      doc
        .fillColor(PDF_COLORS.ink400)
        .font('Helvetica')
        .fontSize(9)
        .text('No transactions in this period.', PAGE_MARGIN + 12, y + 14);
      y += 40;
    } else {
      transactions.forEach((t, index) => {
        const rowH = 26;
        if (y + rowH > contentBottom) {
          doc.addPage();
          y = PAGE_MARGIN;
          y = drawTableHeader(y);
        }

        doc.rect(PAGE_MARGIN, y, TABLE_WIDTH, rowH).fill(index % 2 === 0 ? PDF_COLORS.white : PDF_COLORS.ink50);

        let x = PAGE_MARGIN;
        const cellY = y + 8;

        doc
          .fillColor(PDF_COLORS.ink600)
          .font('Helvetica')
          .fontSize(8)
          .text(t.created_at.toISOString().slice(0, 10), x + 8, cellY, { width: TABLE_COLUMNS[0].width - 12 });
        x += TABLE_COLUMNS[0].width;

        doc
          .fillColor(PDF_COLORS.ink600)
          .font('Helvetica')
          .fontSize(7.5)
          .text(t.reference_number, x + 8, cellY, { width: TABLE_COLUMNS[1].width - 12, ellipsis: true });
        x += TABLE_COLUMNS[1].width;

        doc
          .fillColor(PDF_COLORS.ink900)
          .font('Helvetica')
          .fontSize(8)
          .text(t.description, x + 8, cellY, { width: TABLE_COLUMNS[2].width - 12, ellipsis: true });
        x += TABLE_COLUMNS[2].width;

        doc
          .fillColor(PDF_COLORS.ink600)
          .font('Helvetica')
          .fontSize(8)
          .text(t.type, x + 8, cellY, { width: TABLE_COLUMNS[3].width - 12, ellipsis: true });
        x += TABLE_COLUMNS[3].width;

        const sign = t.direction === 'CREDIT' ? '+' : '-';
        doc
          .fillColor(t.direction === 'CREDIT' ? PDF_COLORS.success : PDF_COLORS.ink900)
          .font('Helvetica-Bold')
          .fontSize(8)
          .text(`${sign}${Number(t.amount).toFixed(2)}`, x + 4, cellY, { width: TABLE_COLUMNS[4].width - 12, align: 'right' });
        x += TABLE_COLUMNS[4].width;

        drawStatusChip(t.status, x, TABLE_COLUMNS[5].width, y);

        doc
          .moveTo(PAGE_MARGIN, y + rowH)
          .lineTo(PAGE_MARGIN + TABLE_WIDTH, y + rowH)
          .lineWidth(0.5)
          .stroke(PDF_COLORS.ink100);

        y += rowH;
      });
    }

    // ---- Footer on every page ----
    const range = doc.bufferedPageRange();
    for (let i = range.start; i < range.start + range.count; i++) {
      doc.switchToPage(i);
      const footerY = doc.page.height - PAGE_MARGIN - 6;
      doc
        .moveTo(PAGE_MARGIN, footerY - 10)
        .lineTo(pageWidth - PAGE_MARGIN, footerY - 10)
        .lineWidth(0.5)
        .stroke(PDF_COLORS.ink100);
      doc
        .fillColor(PDF_COLORS.ink400)
        .font('Helvetica')
        .fontSize(7.5)
        .text('BankFlow is a fictional demo application. This statement is synthetic and not a real financial record.', PAGE_MARGIN, footerY - 4, {
          width: (pageWidth - PAGE_MARGIN * 2) * 0.7,
        });
      doc
        .fillColor(PDF_COLORS.ink400)
        .fontSize(7.5)
        .text(`Page ${i - range.start + 1} of ${range.count}`, PAGE_MARGIN, footerY - 4, {
          width: pageWidth - PAGE_MARGIN * 2,
          align: 'right',
        });
    }

    doc.end();
  });
}

export async function buildStatementCsv(userId: string, statementId: string): Promise<string> {
  const { transactions } = await loadStatementForDownload(userId, statementId);
  const header = 'Date,ReferenceNumber,Type,Description,Direction,Amount,Status,BalanceAfter';
  const lines = transactions.map((t) =>
    [
      t.created_at.toISOString(),
      t.reference_number,
      t.type,
      `"${t.description.replace(/"/g, '""')}"`,
      t.direction,
      Number(t.amount).toFixed(2),
      t.status,
      t.balance_after !== null ? Number(t.balance_after).toFixed(2) : '',
    ].join(','),
  );
  return [header, ...lines].join('\n');
}
