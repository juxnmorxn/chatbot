import { Client } from 'ssh2';

const conn = new Client();
conn.on('ready', () => {
  const code = `
    import('@libsql/client').then(async ({ createClient }) => {
      const db = createClient({ url: 'file:/app/data/chatbot.db' });
      const s = await db.execute({ sql: "SELECT key, value FROM settings WHERE key LIKE '%WISPHUB%'" });
      const apiKey = s.rows.find(r => r.key === 'WISPHUB_API_KEY')?.value;
      const url = s.rows.find(r => r.key === 'WISPHUB_API_URL')?.value || 'https://api.wisphub.net/api';
      
      import('axios').then(async ({ default: axios }) => {
        const api = axios.create({ baseURL: url, headers: { 'Authorization': 'Api-Key ' + apiKey }, timeout: 15000 });
        
        async function fetchPeriod(d0, d1) {
          console.log('Fetching', d0, 'to', d1);
          let nextUrl = '/facturas/?fecha_emision__range_0=' + d0 + '&fecha_emision__range_1=' + d1 + '&limit=300';
          let count = 0;
          let p = 0;
          while (nextUrl && p < 35) {
            p++;
            try {
              const res = await api.get(nextUrl);
              const list = res.data?.results || [];
              if (list.length === 0) break;
              
              for (const f of list) {
                let idServicio = null;
                if (Array.isArray(f.articulos) && f.articulos[0]?.servicio?.id_servicio) {
                  idServicio = Number(f.articulos[0].servicio.id_servicio);
                }
                const idFactura = f.id_factura || f.id;
                const folio = f.folio ? String(f.folio) : 'FAC-' + idFactura;
                const clienteNombre = f.cliente?.nombre || '';
                const clienteUsuario = f.cliente?.usuario || '';
                const clienteTel = f.cliente?.telefono || '';
                const total = Number(f.total || 0);
                const subTotal = Number(f.sub_total || total);
                const descuento = Number(f.descuento || 0);
                const estado = String(f.estado || 'Pendiente de Pago');
                const fechaEmision = f.fecha_emision || null;
                const fechaVencimiento = f.fecha_vencimiento || null;
                const fechaPago = f.fecha_pago || null;
                const descripcion = f.articulos?.[0]?.descripcion || '';
                const linkPago = f.url_pasarela || f.url_payu || ('https://wisphub.net/factura/' + idFactura + '/');
                const pdfUrl = f.url_pdf || ('https://wisphub.net/factura/pdf/' + idFactura + '/');
                const rawData = JSON.stringify({
                  forma_pago: f.forma_pago?.nombre || f.forma_pago || 'Efectivo',
                  cajero: f.cajero?.nombre || f.cajero || '',
                  zona: f.zona?.nombre || '',
                  total_cobrado: f.total_cobrado || total
                });
                
                await db.execute({
                  sql: \`INSERT INTO wisphub_invoices (
                    id_factura, id_servicio, folio, cliente_nombre, cliente_usuario, cliente_telefono,
                    total, sub_total, descuento, estado, fecha_emision, fecha_vencimiento, fecha_pago,
                    descripcion, link_pago, pdf_url, raw_data, updated_at
                  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
                  ON CONFLICT(id_factura) DO UPDATE SET
                    id_servicio = excluded.id_servicio,
                    folio = excluded.folio,
                    cliente_nombre = excluded.cliente_nombre,
                    cliente_usuario = excluded.cliente_usuario,
                    cliente_telefono = excluded.cliente_telefono,
                    total = excluded.total,
                    sub_total = excluded.sub_total,
                    descuento = excluded.descuento,
                    estado = excluded.estado,
                    fecha_emision = excluded.fecha_emision,
                    fecha_vencimiento = excluded.fecha_vencimiento,
                    fecha_pago = excluded.fecha_pago,
                    descripcion = excluded.descripcion,
                    link_pago = excluded.link_pago,
                    pdf_url = excluded.pdf_url,
                    raw_data = excluded.raw_data,
                    updated_at = excluded.updated_at\`,
                  args: [idFactura, idServicio, folio, clienteNombre, clienteUsuario, clienteTel, total, subTotal, descuento, estado, fechaEmision, fechaVencimiento, fechaPago, descripcion, linkPago, pdfUrl, rawData]
                });
                count++;
              }
              if (res.data?.next) {
                const m = res.data.next.match(/\\/facturas\\/\\?.*$/);
                nextUrl = m ? m[0] : null;
              } else {
                nextUrl = null;
              }
            } catch(e) {
              console.error('Err on page', p, e.message);
              break;
            }
          }
          console.log('Saved', count, 'invoices for period', d0, '-', d1);
        }

        // Fetch remaining periods back to 2024
        await fetchPeriod('2026-08-01', '2026-10-31');
        await fetchPeriod('2025-08-01', '2025-10-31');
        await fetchPeriod('2025-05-01', '2025-07-31');
        await fetchPeriod('2025-02-01', '2025-04-30');
        await fetchPeriod('2024-11-01', '2025-01-31');
        await fetchPeriod('2024-08-01', '2024-10-31');
        await fetchPeriod('2024-05-01', '2024-07-31');
        await fetchPeriod('2024-02-01', '2024-04-30');

        const chk = await db.execute({
          sql: 'SELECT id_factura, folio, fecha_emision, fecha_pago, total, estado, raw_data FROM wisphub_invoices WHERE cliente_usuario LIKE ? OR id_servicio = 756 ORDER BY id_factura DESC',
          args: ['%martin-baltazar%']
        });
        console.log('=== TOTAL INVOICES FOR MARTIN BALTAZAR ZAMORA ===', chk.rows.length);
        console.log(chk.rows.map(r => ({ id: r.id_factura, folio: r.folio, fecha_pago: r.fecha_pago, total: r.total, estado: r.estado })));
      });
    });
  `;
  const b64 = Buffer.from(code).toString('base64');
  conn.exec(`echo "${b64}" | base64 -d > /root/sync_all_history.mjs && docker cp /root/sync_all_history.mjs chatbot_app:/app/sync_all_history.mjs && docker exec chatbot_app node /app/sync_all_history.mjs`, (err, stream) => {
    if (err) throw err;
    stream.on('data', d => process.stdout.write(d));
    stream.stderr.on('data', d => process.stderr.write(d));
    stream.on('close', () => conn.end());
  });
}).connect({ host: '2.25.241.239', port: 22, username: 'root', password: 'CloudWare1991@' });
