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
          while (nextUrl && p < 30) {
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
                
                await db.execute({
                  sql: \`INSERT INTO wisphub_invoices (
                    id_factura, id_servicio, folio, cliente_nombre, cliente_usuario,
                    total, sub_total, descuento, estado, fecha_emision, fecha_vencimiento, fecha_pago,
                    descripcion, link_pago, pdf_url, updated_at
                  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
                  ON CONFLICT(id_factura) DO UPDATE SET
                    id_servicio = excluded.id_servicio,
                    folio = excluded.folio,
                    cliente_nombre = excluded.cliente_nombre,
                    cliente_usuario = excluded.cliente_usuario,
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
                    updated_at = excluded.updated_at\`,
                  args: [idFactura, idServicio, folio, clienteNombre, clienteUsuario, total, subTotal, descuento, estado, fechaEmision, fechaVencimiento, fechaPago, descripcion, linkPago, pdfUrl]
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

        // Fetch periods
        await fetchPeriod('2026-05-01', '2026-07-31');
        await fetchPeriod('2026-02-01', '2026-04-30');
        await fetchPeriod('2025-11-01', '2026-01-31');

        const chk = await db.execute({
          sql: 'SELECT id_factura, folio, fecha_emision, fecha_pago, total, estado FROM wisphub_invoices WHERE cliente_usuario LIKE ? OR id_servicio = 756 ORDER BY id_factura DESC',
          args: ['%martin-baltazar%']
        });
        console.log('--- INVOICES FOR MARTIN NOW --- count:', chk.rows.length);
        console.log(JSON.stringify(chk.rows, null, 2));
      });
    });
  `;
  const b64 = Buffer.from(code).toString('base64');
  conn.exec(`echo "${b64}" | base64 -d > /root/test_sync_periods.mjs && docker cp /root/test_sync_periods.mjs chatbot_app:/app/test_sync_periods.mjs && docker exec chatbot_app node /app/test_sync_periods.mjs`, (err, stream) => {
    if (err) throw err;
    stream.on('data', d => process.stdout.write(d));
    stream.stderr.on('data', d => process.stderr.write(d));
    stream.on('close', () => conn.end());
  });
}).connect({ host: '2.25.241.239', port: 22, username: 'root', password: 'CloudWare1991@' });
