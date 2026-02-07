import { getPedidoImpresion } from "@/lib/api/orders";

interface OpcionesImpresion {
  metodoPago?: string;
  recibido?: number;
  cambio?: number;
}

export const imprimirTicket = async (pedidoId: number, opciones?: OpcionesImpresion) => {
  try {
    const pedido: any = await getPedidoImpresion(pedidoId);
    
    if (!pedido) {
      alert("Error: No se encontró el pedido.");
      return;
    }

    const metodoPagoFinal = opciones?.metodoPago || pedido.MetodoPago;
    const fecha = new Date().toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' });
    
    const tercero = pedido.cliente?.tercero;
    const nombreCliente = tercero 
        ? `${tercero.Nombres} ${tercero.Apellidos || ''}`.trim() 
        : 'Cliente General';

    const numeroFactura = pedido.PedidoID.toString().padStart(6, '0');

    const formatoMoneda = (valor: number) => 
        new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(valor);

    // --- CORRECCIÓN DE LA RUTA DEL LOGO ---
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
    // La ruta en disco es public/img/logoPyC.png -> La URL es /img/logoPyC.png
    const logoUrl = `${baseUrl}/img/logoPyC.png`; 

    const ticketHTML = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <title>Factura ${numeroFactura}</title>
          <style>
            @page { size: 80mm auto; margin: 0mm; }
            body {
              font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
              width: 78mm;
              margin: 0 auto;
              padding: 5px;
              color: #000;
              background: #fff;
              font-size: 12px;
              line-height: 1.2;
            }
            .header { text-align: center; margin-bottom: 10px; }
            
            /* LOGO */
            .logo-container { text-align: center; margin-bottom: 5px; }
            .logo { 
                max-width: 60%; 
                height: auto; 
                display: inline-block;
            }
            
            .brand { font-size: 18px; font-weight: 900; text-transform: uppercase; margin-top: 5px; }
            .info-local { font-size: 10px; color: #333; margin-top: 4px; }
            
            .divider { border-top: 1px dashed #000; margin: 8px 0; }
            .divider-bold { border-top: 2px solid #000; margin: 8px 0; }
            .info-grid { display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 3px; }
            .label { font-weight: bold; }
            table { width: 100%; border-collapse: collapse; margin-top: 5px; }
            th { text-align: left; font-size: 10px; text-transform: uppercase; border-bottom: 1px solid #000; padding-bottom: 3px; }
            td { padding: 4px 0; vertical-align: top; font-size: 11px; }
            .col-cant { width: 10%; text-align: center; font-weight: bold; }
            .col-prod { width: 60%; padding-left: 5px; }
            .col-total { width: 30%; text-align: right; }
            .totals-section { margin-top: 10px; text-align: right; }
            .row-total { display: flex; justify-content: space-between; margin-bottom: 3px; font-size: 12px; }
            .final-total { font-size: 18px; font-weight: 900; margin-top: 5px; padding-top: 5px; border-top: 2px solid #000; }
            .footer { text-align: center; margin-top: 20px; font-size: 10px; }
          </style>
        </head>
        <body>
          
          <div class="header">
            <div class="logo-container">
                <img src="${logoUrl}" class="logo" alt="Pide&Come" onerror="this.style.display='none'" />
            </div>
            
            <div class="brand">PIDE & COME</div>
            <div class="info-local">
              NIT: 900.123.456-1<br/>
              Régimen Simplificado<br/>
              Calle 12 # 34-56, Valledupar<br/>
              Tel: 300 123 4567
            </div>
          </div>

          <div class="divider"></div>

          <div class="info-grid"><span class="label">Factura de Venta:</span> <span>N° ${numeroFactura}</span></div>
          <div class="info-grid"><span class="label">Fecha:</span> <span>${fecha}</span></div>
          <div class="info-grid"><span class="label">Cajero:</span> <span>${pedido.usuario?.Username || 'Sistema'}</span></div>
          
          <div class="divider"></div>
          
          <div style="font-size: 11px; margin-bottom: 2px;"><strong>Cliente:</strong> ${nombreCliente}</div>
          <div style="font-size: 10px; color: #444;">ID/NIT: ${tercero?.NumeroDocumento || 'Consumidor Final'}</div>
          <div style="font-size: 10px; color: #444;">Dir: ${tercero?.Direccion || 'Mostrador'}</div>
          <div style="font-size: 10px; color: #444;">Tel: ${tercero?.Telefono || ''}</div>

          <div class="divider"></div>

          <table>
            <thead>
              <tr>
                <th class="col-cant">CANT</th>
                <th class="col-prod">DESCRIPCIÓN</th>
                <th class="col-total">TOTAL</th>
              </tr>
            </thead>
            <tbody>
              ${pedido.detallepedido.map((det: any) => `
                <tr>
                  <td class="col-cant">${det.Cantidad}</td>
                  <td class="col-prod">
                    ${det.producto.Nombre}
                    ${det.Observacion ? `<div style="font-size:9px; color:#555;">(${det.Observacion})</div>` : ''}
                  </td>
                  <td class="col-total">${formatoMoneda(det.Cantidad * det.PrecioUnit)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="divider-bold"></div>

          <div class="totals-section">
            <div class="row-total">
              <span>Subtotal:</span>
              <span>${formatoMoneda(pedido.Total)}</span>
            </div>
            
            <div class="row-total final-total">
              <span>TOTAL A PAGAR:</span>
              <span>${formatoMoneda(pedido.Total)}</span>
            </div>

            <div style="margin-top: 10px; font-size: 11px;">
              <div class="row-total">
                <strong>Forma de Pago:</strong>
                <strong>${metodoPagoFinal}</strong>
              </div>
              ${opciones?.recibido ? `
                <div class="row-total">
                  <span>Efectivo Recibido:</span>
                  <span>${formatoMoneda(opciones.recibido)}</span>
                </div>
              ` : ''}
              ${opciones?.cambio ? `
                <div class="row-total">
                  <span>Cambio / Vueltos:</span>
                  <span>${formatoMoneda(opciones.cambio)}</span>
                </div>
              ` : ''}
            </div>
          </div>

          <div class="footer">
            <div style="font-weight: bold; margin-bottom: 5px;">¡GRACIAS POR SU PREFERENCIA!</div>
            <div>Representación gráfica de factura</div>
            <div style="color: #888; margin-top: 5px;">Sistema Pide&Come</div>
          </div>

        </body>
      </html>
    `;

    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (doc) {
      doc.open();
      doc.write(ticketHTML);
      doc.close();

      setTimeout(() => {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      }, 800);
    }

  } catch (error) {
    console.error("Error imprimiendo:", error);
    alert("Error al generar factura.");
  }
};