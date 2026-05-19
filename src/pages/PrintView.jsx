import React, { useState, useEffect } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import client from '../api/client';
import { formatDate, numberToWords } from '../utils/format';

const PrintView = () => {
  const { type, id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        let endpoint = '';
        if (type === 'invoice' || type === 'thermal' || type === 'challan') endpoint = `/invoices/${id}`;
        else if (type === 'quote') endpoint = `/quotations/${id}`;
        else if (type === 'receipt') endpoint = `/payments/${id}`;
        else if (type === 'sales-return') endpoint = `/sales-returns/${id}`;
        else if (type === 'purchase-return') endpoint = `/purchase-returns/${id}`;
        else if (type === 'ledger') endpoint = `/customers/${id}/ledger`;
        else if (type === 'supplier-ledger') endpoint = `/suppliers/${id}/ledger`;
        
        const { data } = await client.get(endpoint);
        setData(data);
      } catch (err) {
        console.error(err);
        setError(err.response?.data?.error || err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [type, id]);

  useEffect(() => {
    if (!loading && data) {
      const timer = setTimeout(() => {
        window.print();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [loading, data]);

  if (loading) return <div>Loading print format...</div>;
  if (error) return <div style={{ padding: '2rem', color: '#ef4444' }}>Error: {error}</div>;
  if (!data) return <div>Data not found</div>;

  const isThermal = type === 'thermal';
  const isChallan = type === 'challan';
  const isReceipt = type === 'receipt';
  const isSalesReturn = type === 'sales-return';
  const isPurchaseReturn = type === 'purchase-return';
  const isLedger = type === 'ledger' || type === 'supplier-ledger';
  const isSupplierLedger = type === 'supplier-ledger';

  return (
    <div className={`print-container ${type}`}>
      <style>{`
        @media screen {
          html, body { background: #f1f5f9 !important; color: #1e293b !important; }
          .print-container {
            background: white !important;
            color: black !important;
            margin: 2rem auto;
            padding: 2rem;
            box-shadow: 0 0 20px rgba(0,0,0,0.1);
            width: ${isThermal ? '80mm' : '210mm'};
            min-height: ${isThermal ? 'auto' : '297mm'};
            border-radius: 8px;
          }
        }
        @media print {
          @page { margin: 10mm; size: auto; }
          html, body { background: white !important; color: black !important; margin: 0; padding: 0; }
          .print-container { width: 100%; margin: 0; padding: 0; box-shadow: none; background: white !important; }
          .no-print { display: none; }
        }
        .print-container { font-family: 'Inter', sans-serif; line-height: 1.4; color: #000 !important; }
        .print-container * { color: #000 !important; border-color: #000 !important; }
        .header { display: flex; justify-content: space-between; border-bottom: 2px solid #000 !important; padding-bottom: 1rem; margin-bottom: 1.5rem; }
        .company-info h1 { font-size: 1.5rem; margin: 0; font-weight: 800; }
        .company-info p { font-size: 0.75rem; margin: 0; }
        .doc-title { text-align: right; }
        .doc-title h2 { font-size: 1.25rem; margin: 0; text-transform: uppercase; color: #444; }
        
        .client-info { display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; margin-bottom: 2rem; font-size: 0.875rem; }
        
        table.print-table { width: 100%; border-collapse: collapse; margin-bottom: 2rem; }
        table.print-table th { border: 1px solid #ddd; padding: 8px; background: #f8fafc; text-align: left; font-size: 0.75rem; }
        table.print-table td { border: 1px solid #ddd; padding: 8px; font-size: 0.875rem; }
        
        .totals { display: flex; justify-content: flex-end; }
        .totals-table { width: 300px; }
        .totals-table tr td { padding: 4px 8px; }
        .totals-table tr td:last-child { text-align: right; font-weight: 600; }
        
        .thermal { width: 80mm; font-size: 10px; padding: 2mm; }
        .thermal .header { flex-direction: column; text-align: center; border-bottom: 1px dashed #000; }
        .thermal table { font-size: 9px; width: 100%; border-collapse: collapse; }
        .thermal table td, .thermal table th { padding: 2px 0; border: none; border-bottom: 0.5px solid #eee; }
        .thermal .totals-table { width: 100%; margin-top: 5px; border-top: 1px solid #000; }
        
        .signature { margin-top: 4rem; display: flex; justify-content: flex-end; text-align: center; }
        .sig-box { width: 200px; border-top: 1px solid #000; padding-top: 0.5rem; font-size: 0.75rem; }
      `}</style>


      <div className="header">
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <img src="/logo.jpg" alt="Logo" style={{ height: '70px', marginRight: '1rem', objectFit: 'contain' }} onError={(e) => e.target.style.display = 'none'} />
          <div className="company-info">
            <h1>Ephphatha Construction Trading Co.</h1>
            <p>Industrial Estate, Lane 4, Ernakulam, Kerala</p>
            <p>Phone: +91 98765 43210 | GSTIN: 32AAAAA0000A1Z5</p>
          </div>
        </div>
        <div className="doc-title">
          <h2>{
            type === 'invoice' ? 'Tax Invoice' : 
            type === 'thermal' ? 'Retail Invoice' : 
            type === 'quote' ? 'Quotation' : 
            type === 'challan' ? 'Delivery Challan' : 
            type === 'receipt' ? 'Payment Receipt' : 
            type === 'sales-return' ? 'Credit Note (Sales Return)' : 
            type === 'purchase-return' ? 'Debit Note (Purchase Return)' : 
            type === 'ledger' ? 'Statement of Account (Customer)' : 
            type === 'supplier-ledger' ? 'Statement of Account (Supplier)' : ''
          }</h2>
          {!isLedger && <p style={{ fontWeight: '700' }}>#{data.return_number || data.invoice_number || data.quote_number || data.id}</p>}
          <p>Date: {!isLedger ? formatDate(data.date) : formatDate(new Date().toISOString().split('T')[0])}</p>
        </div>
      </div>

      {!isThermal && (
        <div className="client-info">
          <div>
            <p style={{ textTransform: 'uppercase', color: '#666', fontSize: '0.7rem', fontWeight: '800' }}>{isPurchaseReturn ? 'Return To:' : isSupplierLedger ? 'Supplier:' : isLedger ? 'Customer:' : 'Bill To:'}</p>
            <p style={{ fontWeight: '700', fontSize: '1rem' }}>{isSupplierLedger ? data.supplier.name : isLedger ? data.customer.name : (data.company_name || data.customer_name || data.supplier_name)}</p>
            <p>{isSupplierLedger ? data.supplier.address : isLedger ? data.customer.address : data.address}</p>
            <p>GSTIN: {(isSupplierLedger ? data.supplier.gstin : isLedger ? data.customer.gstin : data.gstin) || 'UNREGISTERED'}</p>
            <p>Ph: {isSupplierLedger ? data.supplier.phone : isLedger ? data.customer.phone : data.phone}</p>
          </div>
          <div style={{ textAlign: 'right' }}>
             <div style={{ textAlign: 'left', display: 'inline-block', maxWidth: '300px' }}>
               <p style={{ textTransform: 'uppercase', color: '#666', fontSize: '0.7rem', fontWeight: '800' }}>Ship To:</p>
               <p style={{ fontWeight: '700' }}>{data.company_name || data.customer_name || 'N/A'}</p>
               <p style={{ whiteSpace: 'pre-line' }}>{data.delivery_address || data.address || 'Address Not Provided'}</p>
               {data.delivery_address && <div style={{ fontSize: '0.6rem', color: '#999', marginTop: '4px' }}>(Custom Delivery Address)</div>}
             </div>
             {isReceipt && (
               <>
                 <p>Payment Mode: {data.payment_mode}</p>
                 <p>Ref No: {data.reference_no || 'N/A'}</p>
               </>
             )}
             {(isSalesReturn || isPurchaseReturn) && (
               <>
                 <p>Original Doc: {data.original_invoice || data.original_bill}</p>
                 <p>Reason: {data.reason}</p>
               </>
             )}
          </div>
        </div>
      )}

      {isLedger && (
         <table className="print-table">
           <thead>
             <tr><th>Date</th><th>Type</th><th>Ref</th><th>Debit</th><th>Credit</th><th>Balance</th></tr>
           </thead>
           <tbody>
             {data.ledger?.map((tx, i) => (
               <tr key={i}>
                 <td>{formatDate(tx.date)}</td>
                 <td>{tx.type}</td>
                 <td>{tx.ref}</td>
                 <td>{tx.debit || '-'}</td>
                 <td>{tx.credit || '-'}</td>
                 <td style={{ fontWeight: '600' }}>{tx.balance}</td>
               </tr>
             ))}
           </tbody>
           <tfoot>
             <tr>
               <td colSpan="5" style={{ textAlign: 'right', fontWeight: 'bold' }}>Closing Balance:</td>
               <td style={{ fontWeight: 'bold' }}>
                 ₹{Math.abs(data.closingBalance).toLocaleString()} {data.closingBalance > 0 ? '(Dr)' : data.closingBalance < 0 ? '(Cr)' : ''}
               </td>
             </tr>
           </tfoot>
         </table>
       )}

      {isThermal && (
        <div style={{ marginBottom: '1rem', textAlign: 'center' }}>
          <p>Customer: {data.customer_name}</p>
          <p>--------------------------------</p>
        </div>
      )}

      {(!isReceipt && !isLedger) && (
        <table className="print-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Description</th>
              <th>HSN</th>
              <th>Qty</th>
              {!isChallan && <th>Rate</th>}
              {!isChallan && <th>Amount</th>}
            </tr>
          </thead>
          <tbody>
            {(data.items || []).map((item, i) => (
              <tr key={i}>
                <td>{i + 1}</td>
                <td>
                  <strong>{item.name}</strong>
                  <div style={{ fontSize: '0.75rem' }}>P/N: {item.part_number}</div>
                </td>
                <td>{item.hsn_code}</td>
                <td>{item.quantity} {item.unit}</td>
                {!isChallan && <td>{item.rate.toLocaleString()}</td>}
                {!isChallan && <td>{item.amount.toLocaleString()}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {isReceipt && (
        <div style={{ padding: '2rem', border: '1px solid #eee', marginBottom: '2rem', textAlign: 'center' }}>
          <p style={{ fontSize: '1.25rem' }}>Received with thanks the sum of</p>
          <h2 style={{ fontSize: '2rem', margin: '1rem 0' }}>₹{data.amount.toLocaleString()}</h2>
          <div style={{ fontStyle: 'italic', marginBottom: '1rem' }}>({numberToWords(data.amount)})</div>
          <p>Towards Invoice: {data.invoice_number}</p>
        </div>
      )}

      {!isChallan && !isReceipt && !isLedger && (
        <div className="totals" style={{ flexDirection: 'column', alignItems: 'flex-end' }}>
          <table className="totals-table">
            <tr>
              <td>Subtotal</td>
              <td>₹{data.subtotal.toLocaleString()}</td>
            </tr>
            {data.cgst > 0 && (
              <>
                <tr><td>CGST</td><td>₹{data.cgst.toLocaleString()}</td></tr>
                <tr><td>SGST</td><td>₹{data.sgst.toLocaleString()}</td></tr>
              </>
            )}
            {data.igst > 0 && (
              <tr><td>IGST</td><td>₹{data.igst.toLocaleString()}</td></tr>
            )}
            {(data.discount && data.discount > 0) ? (
              <tr><td style={{ color: '#ef4444' }}>Discount</td><td style={{ color: '#ef4444' }}>-₹{data.discount.toLocaleString()}</td></tr>
            ) : null}
            <tr style={{ borderTop: '2px solid #000' }}>
              <td style={{ fontSize: '1.125rem' }}>Total</td>
              <td style={{ fontSize: '1.125rem' }}>₹{data.total.toLocaleString()}</td>
            </tr>
          </table>
          <div style={{ marginTop: '0.5rem', textAlign: 'right', fontSize: '0.875rem', maxWidth: '400px' }}>
            <strong>Amount in Words:</strong> <br/>
            <span style={{ textTransform: 'capitalize', fontStyle: 'italic' }}>{numberToWords(data.total)}</span>
          </div>
        </div>
      )}

      {!isThermal && (
        <div className="signature">
          <div className="sig-box">
            For Ephphatha Construction Trading Co.
            <br /><br /><br />
            Authorized Signatory
          </div>
        </div>
      )}

      {isThermal && (
        <div style={{ textAlign: 'center', marginTop: '1rem' }}>
          <p>Thank You! Visit Again.</p>
        </div>
      )}
    </div>
  );
};

export default PrintView;
