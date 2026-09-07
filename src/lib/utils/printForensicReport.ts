import { format } from 'date-fns';

export function printForensicAuditReport(announcement: any) {
  if (!announcement || typeof window === 'undefined') return;

  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  iframe.setAttribute('aria-hidden', 'true');
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (!doc) return;

  const createdAtFormatted = announcement.createdAt?.toDate 
    ? format(announcement.createdAt.toDate(), "PPPP 'at' HH:mm:ss 'UTC'")
    : announcement.createdAt
      ? new Date(announcement.createdAt).toUTCString()
      : 'N/A';

  const isRegional = !!announcement.isRegional;
  const authorityName = announcement.regionalAuthorityName || announcement.sentBy || 'Verified Platform Authority';
  const authorityId = announcement.ownerId || announcement.userId || 'N/A';
  const scopeText = isRegional ? 'Regional Multi-Hub Boundary' : `${announcement.scope || 'Community'}-level`;
  const communities: string[] = announcement.targetCommunityNames || [];

  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="utf-8" />
      <title>Official Investigative Audit Record - ${announcement.id || ''}</title>
      <style>
        @page {
          size: A4 portrait;
          margin: 10mm 12mm 10mm 12mm;
        }
        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
          color: #0f172a;
          background: #ffffff;
          font-size: 10.5px;
          line-height: 1.4;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        .header {
          border-bottom: 2px solid #0f172a;
          padding-bottom: 8px;
          margin-bottom: 10px;
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
        }
        .title {
          font-size: 16px;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: -0.5px;
          color: #0f172a;
        }
        .subtitle {
          font-size: 8.5px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 1px;
          color: #64748b;
          margin-top: 1px;
        }
        .badge {
          display: inline-block;
          padding: 2px 7px;
          border-radius: 4px;
          font-size: 8.5px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .badge-type {
          background: ${announcement.type === 'Emergency' ? '#dc2626' : '#2563eb'};
          color: #ffffff;
        }
        .badge-tier {
          background: #4338ca;
          color: #ffffff;
        }
        .badge-scope {
          background: #f1f5f9;
          border: 1px solid #cbd5e1;
          color: #334155;
        }
        .card {
          border: 1.5px solid #cbd5e1;
          border-radius: 8px;
          padding: 8px 12px;
          margin-bottom: 8px;
          background: #f8fafc;
          page-break-inside: avoid;
        }
        .card-authority {
          border-color: ${isRegional ? '#818cf8' : (announcement.type === 'Emergency' ? '#f87171' : '#cbd5e1')};
          background: ${isRegional ? '#f5f3ff' : (announcement.type === 'Emergency' ? '#fef2f2' : '#f8fafc')};
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .meta-label {
          font-size: 8px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.8px;
          color: #64748b;
          margin-bottom: 2px;
        }
        .auth-name {
          font-size: 15px;
          font-weight: 900;
          color: #0f172a;
          letter-spacing: -0.3px;
        }
        .meta-tag {
          display: inline-block;
          background: #e2e8f0;
          padding: 1px 5px;
          border-radius: 3px;
          font-size: 8.5px;
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
          margin-top: 2px;
        }
        .section {
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 8px 12px;
          margin-bottom: 8px;
          background: #ffffff;
          page-break-inside: avoid;
        }
        .subject-text {
          font-size: 13px;
          font-weight: 800;
          color: #0f172a;
          margin-bottom: 4px;
        }
        .message-box {
          font-size: 10px;
          line-height: 1.45;
          color: #1e293b;
          background: #f8fafc;
          padding: 6px 10px;
          border-radius: 6px;
          border: 1px dashed #cbd5e1;
        }
        .towns-grid {
          display: flex;
          flex-wrap: wrap;
          gap: 4px;
          margin-top: 4px;
        }
        .town-chip {
          background: #ffffff;
          border: 1px solid #c7d2fe;
          padding: 2px 6px;
          border-radius: 4px;
          font-size: 8.5px;
          font-weight: 700;
          color: #3730a3;
        }
        .timeline {
          border-left: 2px solid #e2e8f0;
          margin-left: 4px;
          padding-left: 8px;
          margin-top: 4px;
        }
        .timeline-item {
          margin-bottom: 4px;
          position: relative;
        }
        .timeline-item::before {
          content: '';
          position: absolute;
          left: -13px;
          top: 4px;
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #2563eb;
        }
        .footer-ref {
          margin-top: 8px;
          border-top: 1px solid #e2e8f0;
          padding-top: 4px;
          display: flex;
          justify-content: space-between;
          font-size: 8px;
          color: #94a3b8;
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div>
          <div class="title">Official Investigative Audit Record</div>
          <div class="subtitle">Permanent Platform Forensic Communication Log &bull; System Verified</div>
        </div>
        <div style="text-align: right;">
          <span class="badge badge-type">${announcement.type || 'Standard'} DISPATCH</span>
        </div>
      </div>

      <!-- Verified Sender Box -->
      <div class="card card-authority">
        <div>
          <div class="meta-label">${isRegional ? 'Verified Regional Authority Sender' : 'Verified Sender Authority'}</div>
          <div class="auth-name">${authorityName}</div>
          <div style="display: flex; align-items: center; gap: 4px; margin-top: 2px;">
            <span class="meta-tag">Auth ID: ${authorityId}</span>
            ${isRegional ? '<span class="badge badge-tier">Regional Tier</span>' : ''}
          </div>
        </div>
        <div style="text-align: right;">
          <div class="meta-label">Timestamp of Origin</div>
          <div style="font-weight: 800; font-size: 9.5px;">${createdAtFormatted}</div>
          <div style="margin-top: 2px;">
            <span class="badge badge-scope">Scope: ${scopeText}</span>
          </div>
        </div>
      </div>

      <!-- Targeted Communities for Regional Dispatches -->
      ${communities.length > 0 ? `
      <div class="section" style="background: #faf5ff; border-color: #e9d5ff;">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <div class="meta-label" style="color: #7e22ce;">Targeted Boundary Member Communities (${communities.length})</div>
          <span class="badge" style="background: #9333ea; color: #fff; font-size: 7.5px;">Delivery Scope Verified</span>
        </div>
        <div class="towns-grid">
          ${communities.map((name: string) => `<span class="town-chip">&bull; ${name}</span>`).join('')}
        </div>
      </div>
      ` : ''}

      <!-- Subject & Validated Message Body -->
      <div class="section">
        <div class="meta-label">Broadcast Subject Heading</div>
        <div class="subject-text">${announcement.subject || 'Untitled Announcement'}</div>
        <div class="meta-label" style="margin-top: 4px;">Validated Message Body</div>
        <div class="message-box">${announcement.message || ''}</div>
      </div>

      <!-- Forensic Lifecycle Audit Timeline -->
      ${Array.isArray(announcement.history) && announcement.history.length > 0 ? `
      <div class="section">
        <div class="meta-label">Forensic Lifecycle Audit Timeline</div>
        <div class="timeline">
          ${announcement.history.map((h: any) => {
            const hTime = h.timestamp?.toDate 
              ? format(h.timestamp.toDate(), "PPPP 'at' HH:mm:ss 'UTC'")
              : h.timestamp ? new Date(h.timestamp).toUTCString() : '';
            return `
              <div class="timeline-item">
                <span style="font-weight: 800; font-size: 8.5px; text-transform: uppercase;">[${h.status || 'LOG'}]</span>
                <span style="color: #64748b; font-size: 8px;">Auth ID: ${h.actorId || 'system'} &bull; ${hTime}</span>
                ${h.reason ? `<div style="color: #b45309; font-size: 8px; font-weight: 700;">${h.reason}</div>` : ''}
              </div>
            `;
          }).join('')}
        </div>
      </div>
      ` : ''}

      <div class="footer-ref">
        <span>DATABASE AUDIT REF: ${announcement.id || 'N/A'}</span>
        <span>GENERATED: ${new Date().toUTCString()}</span>
      </div>
    </body>
    </html>
  `;

  doc.open();
  doc.write(html);
  doc.close();

  // Trigger print after rendering and clean up iframe
  setTimeout(() => {
    iframe.contentWindow?.focus();
    iframe.contentWindow?.print();
    setTimeout(() => {
      if (document.body.contains(iframe)) {
        document.body.removeChild(iframe);
      }
    }, 1500);
  }, 250);
}