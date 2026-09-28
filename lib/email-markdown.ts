/**
 * Email-Safe Markdown to HTML Converter
 * 
 * Generates clean, bulletproof HTML with inline styles compatible with:
 * Gmail, Outlook (Desktop & Web), Apple Mail, Yahoo, iOS Mail, Samsung Mail.
 */

export interface MarkdownOptions {
  themeColor?: string; // Hex color for buttons & accents, defaults to '#0d9488' (Teal)
}

/**
 * Escapes HTML characters
 */
function escapeHtml(text: string): string {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Parses button attributes like: url="..." text="..." or text="..." url="..."
 */
function extractButtonAttributes(attrString: string): { url: string; label: string } {
  // Support both raw quotes and HTML escaped entities
  const decoded = attrString
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'");

  const urlMatch = decoded.match(/url=["']([^"']*)["']/i) || decoded.match(/url=([^"'\s]+)/i);
  const textMatch = decoded.match(/text=["']([^"']*)["']/i) || decoded.match(/text=([^"'\s]+)/i);

  const url = urlMatch ? urlMatch[1].trim() : '#';
  const label = textMatch ? textMatch[1].trim() : 'Click Here';

  return { url, label };
}

/**
 * Bulletproof email button centered in an email-safe table wrapper
 */
export function renderEmailButton(label: string, url: string, themeColor: string = '#0d9488'): string {
  const safeUrl = escapeHtml(url);
  const safeLabel = escapeHtml(label);
  // Compact bulletproof button — works in Gmail, Outlook, Apple Mail, Yahoo
  return `<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin:20px 0;text-align:center;"><tr><td align="center"><table role="presentation" border="0" cellpadding="0" cellspacing="0"><tr><td align="center" bgcolor="${themeColor}" style="border-radius:10px;background-color:${themeColor};"><a href="${safeUrl}" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:13px 28px;font-family:Arial,sans-serif;font-size:14px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:10px;">${safeLabel} &rarr;</a></td></tr></table></td></tr></table>`;
}

/**
 * Parses banner attributes like: url="..." alt="..." link="..."
 */
export function extractBannerAttributes(attrString: string = ''): { url: string; alt: string; link?: string } {
  const decoded = attrString
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'");

  const urlMatch = decoded.match(/url=["']([^"']*)["']/i) || decoded.match(/src=["']([^"']*)["']/i) || decoded.match(/url=([^"'\s]+)/i);
  const altMatch = decoded.match(/alt=["']([^"']*)["']/i) || decoded.match(/alt=([^"'\s]+)/i);
  const linkMatch = decoded.match(/link=["']([^"']*)["']/i) || decoded.match(/href=["']([^"']*)["']/i);

  let url = urlMatch ? urlMatch[1].trim() : 'https://alghazali.vercel.app/email_data_format/333.jpg';
  if (url.startsWith('/')) {
    url = `https://alghazali.vercel.app${url}`;
  }
  const alt = altMatch ? altMatch[1].trim() : 'Al-Ghazali High School Banner';
  const link = linkMatch ? linkMatch[1].trim() : undefined;

  return { url, alt, link };
}

/**
 * Bulletproof email banner with rounded corners and optional link
 */
export function renderEmailBanner(
  imageUrl: string = 'https://alghazali.vercel.app/email_data_format/333.jpg',
  alt: string = 'Al-Ghazali High School Banner',
  linkUrl?: string
): string {
  let finalUrl = imageUrl || 'https://alghazali.vercel.app/email_data_format/333.jpg';
  if (finalUrl.startsWith('/')) {
    finalUrl = `https://alghazali.vercel.app${finalUrl}`;
  }
  const safeImgUrl = escapeHtml(finalUrl);
  const safeAlt = escapeHtml(alt);
  const safeLink = linkUrl ? escapeHtml(linkUrl) : '';

  const imgTag = `<img src="${safeImgUrl}" alt="${safeAlt}" width="570" style="width: 100%; max-width: 100%; height: auto; display: block; border-radius: 14px; border: 1px solid #e2e8f0; box-shadow: 0 4px 14px rgba(0, 0, 0, 0.06); outline: none; text-decoration: none;" />`;

  return `
<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 20px 0; text-align: center;">
  <tr>
    <td align="center" style="padding: 0;">
      ${safeLink ? `<a href="${safeLink}" target="_blank" rel="noopener noreferrer" style="display: block; text-decoration: none; border: 0;">${imgTag}</a>` : imgTag}
    </td>
  </tr>
</table>
`.trim();
}

/**
 * Parses inline markdown: bold, italic, strikethrough, code, links, and inline buttons
 */
function parseInline(text: string, themeColor: string): string {
  if (!text) return '';

  // 1. Extract button tags first with placeholders so escapeHtml does not mangle quotes or generated HTML
  const buttonHolders: string[] = [];

  let processed = text.replace(/:::button\s+(.*?):::/gi, (_match, attrs) => {
    const { url, label } = extractButtonAttributes(attrs);
    const key = `___BTN_HOLDER_${buttonHolders.length}___`;
    buttonHolders.push(renderEmailButton(label, url, themeColor));
    return key;
  });

  // Link button syntax: [Button Label](https://...){.btn} or {.button}
  processed = processed.replace(/\[([^\]]+)\]\(([^)]+)\)\{\.(?:btn|button)\}/gi, (_match, label, url) => {
    const key = `___BTN_HOLDER_${buttonHolders.length}___`;
    buttonHolders.push(renderEmailButton(label, url, themeColor));
    return key;
  });

  // 2. Escape HTML characters in remaining text
  let output = escapeHtml(processed);

  // 3. Inline code: `code`
  output = output.replace(
    /`([^`]+)`/g,
    `<code style="background-color: #f1f5f9; color: #0f172a; padding: 2px 6px; border-radius: 4px; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 13px; border: 1px solid #e2e8f0;">$1</code>`
  );

  // 4. Bold & Italic: ***text*** or ___text___
  output = output.replace(
    /(\*\*\*|___)(.*?)\1/g,
    '<strong style="font-weight: 700; color: #0f172a;"><em style="font-style: italic;">$2</em></strong>'
  );

  // 5. Bold: **text** or __text__
  output = output.replace(
    /(\*\*|__)(.*?)\1/g,
    '<strong style="font-weight: 700; color: #0f172a;">$2</strong>'
  );

  // 6. Italic: *text* or _text_
  output = output.replace(
    /(\*|_)(.*?)\1/g,
    '<em style="font-style: italic;">$2</em>'
  );

  // 7. Strikethrough: ~~text~~
  output = output.replace(
    /~~(.*?)~~/g,
    '<del style="text-decoration: line-through; color: #64748b;">$1</del>'
  );

  // 8. Highlight: ==text==
  output = output.replace(
    /==(.*?)==/g,
    `<mark style="background-color: #fef08a; color: #854d0e; padding: 1px 4px; border-radius: 2px;">$1</mark>`
  );

  // 9. Standard Images: ![alt](url)
  output = output.replace(
    /!\[([^\]]*)\]\(([^)]+)\)/g,
    `<img src="$2" alt="$1" style="max-width: 100%; height: auto; border-radius: 12px; display: block; margin: 16px auto; border: 1px solid #e2e8f0;" />`
  );

  // 10. Standard Links: [label](url)
  output = output.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    `<a href="$2" target="_blank" rel="noopener noreferrer" style="color: ${themeColor}; font-weight: 600; text-decoration: underline;">$1</a>`
  );

  // 11. Restore extracted buttons
  buttonHolders.forEach((btnHtml, idx) => {
    output = output.replace(`___BTN_HOLDER_${idx}___`, btnHtml);
  });

  return output;
}

/**
 * Converts Markdown string into email-safe styled HTML blocks
 */
export function markdownToEmailHtml(markdown: string, options: MarkdownOptions = {}): string {
  const themeColor = options.themeColor || '#0d9488';
  if (!markdown) return '';

  const lines = markdown.split(/\r?\n/);
  const htmlBlocks: string[] = [];

  let inList: 'ul' | 'ol' | null = null;
  let inCodeBlock = false;
  let codeBuffer: string[] = [];
  let inTable = false;
  let tableRows: string[][] = [];
  let inCallout: 'info' | 'warning' | 'success' | 'note' | null = null;
  let calloutBuffer: string[] = [];

  const flushList = () => {
    if (inList) {
      htmlBlocks.push(`</${inList}>`);
      inList = null;
    }
  };

  const flushCode = () => {
    if (inCodeBlock) {
      const codeContent = escapeHtml(codeBuffer.join('\n'));
      htmlBlocks.push(`
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin: 16px 0; background-color: #0f172a; border-radius: 8px; border: 1px solid #1e293b;">
          <tr>
            <td style="padding: 16px; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 13px; line-height: 1.6; color: #e2e8f0; overflow-x: auto;">
              <pre style="margin: 0; padding: 0; white-space: pre-wrap; word-break: break-word;"><code>${codeContent}</code></pre>
            </td>
          </tr>
        </table>
      `.trim());
      codeBuffer = [];
      inCodeBlock = false;
    }
  };

  const flushTable = () => {
    if (inTable && tableRows.length > 0) {
      let tableHtml = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:18px 0;border-collapse:collapse;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;font-size:14px;">`;
      tableRows.forEach((row, rowIndex) => {
        const isHeader = rowIndex === 0;
        const rowBg = isHeader ? '#f8fafc' : rowIndex % 2 === 0 ? '#ffffff' : '#f8fafc';
        tableHtml += `<tr style="background-color:${rowBg};border-bottom:${isHeader ? '2px solid #cbd5e1' : '1px solid #e2e8f0'};">` ;
        row.forEach(cell => {
          const content = parseInline(cell.trim(), themeColor);
          if (isHeader) {
            tableHtml += `<th style="padding:10px 12px;text-align:left;font-weight:700;color:#0f172a;border-right:1px solid #e2e8f0;">${content}</th>`;
          } else {
            tableHtml += `<td style="padding:10px 12px;text-align:left;color:#334155;border-right:1px solid #e2e8f0;">${content}</td>`;
          }
        });
        tableHtml += `</tr>`;
      });
      tableHtml += `</table>`;
      htmlBlocks.push(tableHtml);
      tableRows = [];
      inTable = false;
    }
  };

  const flushCallout = () => {
    if (inCallout) {
      let borderColor = '#0d9488';
      let bgColor = '#f0fdfa';
      let titleColor = '#115e59';
      let icon = 'ℹ️';
      let title = 'Note';

      if (inCallout === 'warning') {
        borderColor = '#e11d48';
        bgColor = '#fff1f2';
        titleColor = '#9f1239';
        icon = '⚠️';
        title = 'Important Notice';
      } else if (inCallout === 'info') {
        borderColor = '#0284c7';
        bgColor = '#f0f9ff';
        titleColor = '#075985';
        icon = '📌';
        title = 'Information';
      } else if (inCallout === 'success') {
        borderColor = '#059669';
        bgColor = '#ecfdf5';
        titleColor = '#065f46';
        icon = '✅';
        title = 'Confirmation';
      }

      const bodyHtml = calloutBuffer
        .map(line => `<p style="margin:0 0 6px 0;font-size:14px;line-height:1.6;color:#334155;">${parseInline(line, themeColor)}</p>`)
        .join('');

      htmlBlocks.push(`<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0;background-color:${bgColor};border-left:4px solid ${borderColor};border-radius:8px;border:1px solid #e2e8f0;border-left-width:4px;border-left-color:${borderColor};"><tr><td style="padding:14px 18px;"><div style="font-weight:700;font-size:14px;color:${titleColor};margin-bottom:6px;">${icon} ${title}</div><div>${bodyHtml}</div></td></tr></table>`);

      calloutBuffer = [];
      inCallout = null;
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    // Check Code blocks
    if (trimmed.startsWith('```')) {
      if (inCodeBlock) {
        flushCode();
      } else {
        flushList();
        flushTable();
        flushCallout();
        inCodeBlock = true;
      }
      continue;
    }

    if (inCodeBlock) {
      codeBuffer.push(rawLine);
      continue;
    }

    // Standalone Custom Button Block :::button url="..." text="..." :::
    const buttonBlockMatch = trimmed.match(/^:::button\s+(.*?):::$/i);
    if (buttonBlockMatch) {
      flushList();
      flushTable();
      flushCallout();
      const { url, label } = extractButtonAttributes(buttonBlockMatch[1]);
      htmlBlocks.push(renderEmailButton(label, url, themeColor));
      continue;
    }

    // Standalone Banner Block :::banner ... :::
    const bannerBlockMatch = trimmed.match(/^:::banner(?:\s+(.*?))?:::$/i);
    if (bannerBlockMatch) {
      flushList();
      flushTable();
      flushCallout();
      const { url, alt, link } = extractBannerAttributes(bannerBlockMatch[1] || "");
      htmlBlocks.push(renderEmailBanner(url, alt, link));
      continue;
    }

    // Callout blocks start :::callout-warning, :::info, etc.
    if (trimmed.startsWith(':::warning') || trimmed.startsWith(':::callout-warning')) {
      flushList(); flushTable(); flushCallout();
      inCallout = 'warning';
      continue;
    }
    if (trimmed.startsWith(':::info') || trimmed.startsWith(':::callout-info') || trimmed.startsWith(':::note')) {
      flushList(); flushTable(); flushCallout();
      inCallout = 'info';
      continue;
    }
    if (trimmed.startsWith(':::success') || trimmed.startsWith(':::callout-success')) {
      flushList(); flushTable(); flushCallout();
      inCallout = 'success';
      continue;
    }
    if (trimmed === ':::' && inCallout) {
      flushCallout();
      continue;
    }

    if (inCallout) {
      calloutBuffer.push(rawLine);
      continue;
    }

    // Empty lines flush paragraphs and lists
    if (trimmed === '') {
      flushList();
      flushTable();
      continue;
    }

    // Horizontal Rule
    if (/^(---|___|\*\*\*)$/.test(trimmed)) {
      flushList(); flushTable();
      htmlBlocks.push(`
        <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
      `.trim());
      continue;
    }

    // Table rows (| col 1 | col 2 |)
    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      // Check if it's separator row (|---|---|)
      if (/^\|(\s*[-:]+[-|\s:]*)\|$/.test(trimmed)) {
        continue;
      }
      flushList();
      inTable = true;
      const cells = trimmed
        .slice(1, -1)
        .split('|')
        .map(c => c.trim());
      tableRows.push(cells);
      continue;
    } else if (inTable) {
      flushTable();
    }

    // Headings
    if (trimmed.startsWith('# ')) {
      flushList();
      const content = parseInline(trimmed.slice(2), themeColor);
      const isFirst = htmlBlocks.length === 0;
      htmlBlocks.push(`<h1 style="font-size:22px;font-weight:800;color:#0f172a;margin:${isFirst ? '4px' : '22px'} 0 12px 0;line-height:1.3;letter-spacing:-0.02em;">${content}</h1>`);
      continue;
    }

    if (trimmed.startsWith('## ')) {
      flushList();
      const content = parseInline(trimmed.slice(3), themeColor);
      htmlBlocks.push(`<h2 style="font-size:19px;font-weight:700;color:#0f172a;margin:22px 0 10px 0;line-height:1.35;padding-bottom:6px;border-bottom:1px solid #e2e8f0;">${content}</h2>`);
      continue;
    }

    if (trimmed.startsWith('### ')) {
      flushList();
      const content = parseInline(trimmed.slice(4), themeColor);
      htmlBlocks.push(`<h3 style="font-size:16px;font-weight:700;color:#1e293b;margin:18px 0 8px 0;line-height:1.4;">${content}</h3>`);
      continue;
    }

    // Blockquote (> Quote)
    if (trimmed.startsWith('>')) {
      flushList();
      const quoteText = trimmed.replace(/^>\s?/, '');
      const content = parseInline(quoteText, themeColor);
      htmlBlocks.push(`<div style="background-color:#f8fafc;border-left:4px solid ${themeColor};padding:12px 18px;margin:14px 0;border-radius:4px;font-style:italic;color:#334155;font-size:14.5px;line-height:1.6;">${content}</div>`);
      continue;
    }

    // Unordered List (- or *)
    if (/^[-*]\s+/.test(trimmed)) {
      if (inList !== 'ul') {
        flushList();
        inList = 'ul';
        htmlBlocks.push(`<ul style="margin:10px 0 14px 0;padding-left:22px;color:#334155;font-size:15px;line-height:1.65;">`);
      }
      const itemText = trimmed.replace(/^[-*]\s+/, '');
      htmlBlocks.push(`<li style="margin-bottom:6px;">${parseInline(itemText, themeColor)}</li>`);
      continue;
    }

    // Ordered List (1. 2. 3.)
    if (/^\d+\.\s+/.test(trimmed)) {
      if (inList !== 'ol') {
        flushList();
        inList = 'ol';
        htmlBlocks.push(`<ol style="margin:10px 0 14px 0;padding-left:22px;color:#334155;font-size:15px;line-height:1.65;">`);
      }
      const itemText = trimmed.replace(/^\d+\.\s+/, '');
      htmlBlocks.push(`<li style="margin-bottom:6px;">${parseInline(itemText, themeColor)}</li>`);
      continue;
    }

    // Regular Paragraph
    flushList();
    const content = parseInline(trimmed, themeColor);
    htmlBlocks.push(`<p style="margin:0 0 14px 0;font-size:15px;line-height:1.68;color:#334155;">${content}</p>`);
  }

  flushList();
  flushCode();
  flushTable();
  flushCallout();

  return htmlBlocks.join('');
}

/**
 * Extracts plain text from Markdown for fallback multipart emails
 */
export function markdownToPlainText(markdown: string): string {
  if (!markdown) return '';
  return markdown
    .replace(/:::button\s+(.*?):::/gi, (_match, attrs) => {
      const { url, label } = extractButtonAttributes(attrs);
      return `${label}: ${url}`;
    })
    .replace(/:::banner[\s\S]*?:::/gi, '')
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '$1')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1 ($2)')
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/(\*\*|__)(.*?)\1/g, '$2')
    .replace(/(\*|_)(.*?)\1/g, '$2')
    .replace(/~~(.*?)~~/g, '$1')
    .replace(/==(.*?)==/g, '$1')
    .replace(/^#+\s+/gm, '')
    .replace(/^>\s+/gm, '')
    .replace(/[-*]\s+/g, '• ')
    .replace(/^\d+\.\s+/gm, '')
    .replace(/:::[a-z-]*/g, '')
    .trim();
}
