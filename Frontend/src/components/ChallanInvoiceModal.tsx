import React, { useEffect, useState, useRef } from 'react';
import { api } from '../api/client';
import { numberToWords } from '../utils/numberToWords';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Download, Printer, X, Building2 } from 'lucide-react';

type ChallanItem = {
  id: number;
  productId: number;
  productName: string;
  sku: string;
  unitPrice: string;
  quantity: number;
};

type ChallanDetail = {
  id: number;
  challanNumber: string;
  customerId: number;
  totalQuantity: number;
  status: 'DRAFT' | 'CONFIRMED' | 'CANCELLED';
  createdAt: string;
  items?: ChallanItem[];
};

type CustomerDetail = {
  id: number;
  name: string;
  businessName: string;
  mobile: string;
  email: string | null;
  gstNumber: string | null;
  address: string;
};

interface Props {
  challanId: number;
  onClose: () => void;
}

export const ChallanInvoiceModal: React.FC<Props> = ({ challanId, onClose }) => {
  const [challan, setChallan] = useState<ChallanDetail | null>(null);
  const [customer, setCustomer] = useState<CustomerDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [generatingPdf, setGeneratingPdf] = useState(false);

  const invoiceRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const cDetail = await api.get<ChallanDetail>(`/challans/${challanId}`);
        setChallan(cDetail);

        if (cDetail.customerId) {
          const custDetail = await api.get<CustomerDetail>(`/customers/${cDetail.customerId}`).catch(() => null);
          setCustomer(custDetail);
        }
      } catch (err) {
        console.error('Failed to load invoice data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [challanId]);

  const calculateSubtotal = () => {
    if (!challan?.items) return 0;
    return challan.items.reduce((sum, item) => sum + parseFloat(item.unitPrice) * item.quantity, 0);
  };

  const subtotal = calculateSubtotal();
  const cgst = subtotal * 0.09;
  const sgst = subtotal * 0.09;
  const grandTotal = subtotal + cgst + sgst;

  const handleDownloadPdf = async () => {
    if (!invoiceRef.current || !challan) return;
    setGeneratingPdf(true);

    try {
      const element = invoiceRef.current;
      const canvas = await html2canvas(element, {
        scale: 2, // High resolution rendering
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Delivery_Challan_${challan.challanNumber}.pdf`);
    } catch (err) {
      console.error('PDF Generation failed:', err);
      alert('Failed to generate PDF. Please try again.');
    } finally {
      setGeneratingPdf(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1100 }}>
      <div
        className="modal-content"
        style={{
          maxWidth: '900px',
          width: '95%',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          padding: 0,
          overflow: 'hidden',
          backgroundColor: '#ffffff',
          border: '1px solid #e2e8f0',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Control Bar */}
        <div
          style={{
            padding: '16px 24px',
            backgroundColor: '#f8fafc',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Building2 size={22} color="var(--primary)" />
            <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--text-main)' }}>
              Official Delivery Challan & Invoice
            </h3>
          </div>

          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <button
              onClick={handleDownloadPdf}
              disabled={loading || generatingPdf}
              className="btn btn-primary btn-sm"
              style={{ padding: '8px 16px', fontWeight: 600 }}
            >
              <Download size={16} />
              <span>{generatingPdf ? 'Generating PDF...' : 'Download PDF Invoice'}</span>
            </button>

            <button
              onClick={handlePrint}
              disabled={loading}
              className="btn btn-secondary btn-sm"
              style={{ padding: '8px 14px' }}
            >
              <Printer size={16} />
              <span>Print</span>
            </button>

            <button onClick={onClose} className="btn btn-secondary btn-sm" style={{ padding: '8px' }}>
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Invoice Preview Container */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px', backgroundColor: '#f1f5f9' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
              Loading challan details...
            </div>
          ) : !challan ? (
            <div style={{ textAlign: 'center', padding: '60px', color: '#f87171' }}>
              Failed to load challan document.
            </div>
          ) : (
            /* Print Printable Invoice Template - Clean White Paper styling */
            <div
              ref={invoiceRef}
              id="printable-challan-invoice"
              style={{
                width: '100%',
                maxWidth: '800px',
                margin: '0 auto',
                backgroundColor: '#ffffff',
                color: '#1e293b',
                padding: '36px',
                borderRadius: '8px',
                boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
                fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
                fontSize: '13px',
                lineHeight: 1.5,
              }}
            >
              {/* Invoice Header */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  borderBottom: '2px solid #6366f1',
                  paddingBottom: '20px',
                  marginBottom: '24px',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <div
                      style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '6px',
                        background: '#6366f1',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#fff',
                        fontWeight: 900,
                        fontSize: '14px',
                      }}
                    >
                      F
                    </div>
                    <span style={{ fontSize: '18px', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em' }}>
                      FUNDSROOM ERP & LOGISTICS
                    </span>
                  </div>
                  <div style={{ color: '#475569', fontSize: '11px', lineHeight: 1.4 }}>
                    104-108 Financial District, BKC, Mumbai - 400051, India
                    <br />
                    GSTIN: 27AAAAA1234A1Z5 | CIN: U72900MH2026PTC123456
                    <br />
                    Email: billing@fundsroom.com | Support: +91 22 6789 0100
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div
                    style={{
                      display: 'inline-block',
                      backgroundColor: '#6366f1',
                      color: '#ffffff',
                      padding: '4px 12px',
                      borderRadius: '4px',
                      fontWeight: 800,
                      fontSize: '12px',
                      letterSpacing: '0.05em',
                      textTransform: 'uppercase',
                      marginBottom: '8px',
                    }}
                  >
                    DELIVERY CHALLAN & TAX INVOICE
                  </div>
                  <div style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a', fontFamily: 'monospace' }}>
                    {challan.challanNumber}
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                    Date: <strong>{new Date(challan.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</strong>
                  </div>
                  <div style={{ marginTop: '6px' }}>
                    <span
                      style={{
                        padding: '2px 8px',
                        borderRadius: '12px',
                        fontSize: '10px',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        backgroundColor:
                          challan.status === 'CONFIRMED'
                            ? '#dcfce7'
                            : challan.status === 'DRAFT'
                            ? '#fef3c7'
                            : '#fee2e2',
                        color:
                          challan.status === 'CONFIRMED'
                            ? '#15803d'
                            : challan.status === 'DRAFT'
                            ? '#b45309'
                            : '#b91c1c',
                      }}
                    >
                      ● {challan.status}
                    </span>
                  </div>
                </div>
              </div>

              {/* Billed & Shipped To Grid */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '20px',
                  backgroundColor: '#f8fafc',
                  padding: '16px',
                  borderRadius: '6px',
                  border: '1px solid #e2e8f0',
                  marginBottom: '24px',
                }}
              >
                <div>
                  <div style={{ fontSize: '10px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>
                    CONSIGNEE / BILLED TO:
                  </div>
                  <div style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a' }}>
                    {customer?.businessName || customer?.name || 'Valued Customer'}
                  </div>
                  <div style={{ fontSize: '11px', color: '#334155', marginTop: '2px' }}>
                    <strong>Contact Person:</strong> {customer?.name || 'N/A'}
                  </div>
                  <div style={{ fontSize: '11px', color: '#334155' }}>
                    <strong>Address:</strong> {customer?.address || 'Standard Registered Address'}
                  </div>
                  <div style={{ fontSize: '11px', color: '#334155' }}>
                    <strong>Mobile:</strong> {customer?.mobile || 'N/A'} | <strong>Email:</strong> {customer?.email || 'N/A'}
                  </div>
                  {customer?.gstNumber && (
                    <div style={{ fontSize: '11px', color: '#6366f1', fontWeight: 700, marginTop: '2px' }}>
                      GSTIN: {customer.gstNumber}
                    </div>
                  )}
                </div>

                <div style={{ borderLeft: '1px dashed #cbd5e1', paddingLeft: '16px' }}>
                  <div style={{ fontSize: '10px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>
                    DISPATCH & LOGISTICS DETAILS:
                  </div>
                  <div style={{ fontSize: '11px', color: '#334155' }}>
                    <strong>Dispatch Mode:</strong> Surface Express / Direct Trucking
                  </div>
                  <div style={{ fontSize: '11px', color: '#334155' }}>
                    <strong>LR / Tracking No:</strong> LR-2026-{challan.id.toString().padStart(4, '0')}
                  </div>
                  <div style={{ fontSize: '11px', color: '#334155' }}>
                    <strong>Vehicle Number:</strong> MH-02-CD-4821
                  </div>
                  <div style={{ fontSize: '11px', color: '#334155' }}>
                    <strong>Place of Supply:</strong> Maharashtra (27)
                  </div>
                  <div style={{ fontSize: '11px', color: '#334155' }}>
                    <strong>Payment Terms:</strong> Net 30 Days
                  </div>
                </div>
              </div>

              {/* Items Table */}
              <div style={{ marginBottom: '24px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#0f172a', color: '#ffffff' }}>
                      <th style={{ padding: '10px 12px', textAlign: 'center', border: '1px solid #0f172a', width: '40px' }}>#</th>
                      <th style={{ padding: '10px 12px', textAlign: 'left', border: '1px solid #0f172a' }}>Item Description & SKU</th>
                      <th style={{ padding: '10px 12px', textAlign: 'center', border: '1px solid #0f172a', width: '80px' }}>HSN Code</th>
                      <th style={{ padding: '10px 12px', textAlign: 'right', border: '1px solid #0f172a', width: '70px' }}>Qty</th>
                      <th style={{ padding: '10px 12px', textAlign: 'right', border: '1px solid #0f172a', width: '100px' }}>Unit Price (₹)</th>
                      <th style={{ padding: '10px 12px', textAlign: 'right', border: '1px solid #0f172a', width: '110px' }}>Amount (₹)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {challan.items && challan.items.length > 0 ? (
                      challan.items.map((item, idx) => {
                        const itemTotal = parseFloat(item.unitPrice) * item.quantity;
                        return (
                          <tr key={item.id} style={{ backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f8fafc' }}>
                            <td style={{ padding: '10px 12px', textAlign: 'center', border: '1px solid #e2e8f0', color: '#64748b' }}>
                              {idx + 1}
                            </td>
                            <td style={{ padding: '10px 12px', border: '1px solid #e2e8f0' }}>
                              <div style={{ fontWeight: 700, color: '#0f172a' }}>{item.productName}</div>
                              <div style={{ fontSize: '10px', color: '#6366f1', fontFamily: 'monospace' }}>SKU: {item.sku}</div>
                            </td>
                            <td style={{ padding: '10px 12px', textAlign: 'center', border: '1px solid #e2e8f0', fontFamily: 'monospace', color: '#475569' }}>
                              8471.30
                            </td>
                            <td style={{ padding: '10px 12px', textAlign: 'right', border: '1px solid #e2e8f0', fontWeight: 700, color: '#0f172a' }}>
                              {item.quantity}
                            </td>
                            <td style={{ padding: '10px 12px', textAlign: 'right', border: '1px solid #e2e8f0', color: '#334155' }}>
                              ₹{parseFloat(item.unitPrice).toFixed(2)}
                            </td>
                            <td style={{ padding: '10px 12px', textAlign: 'right', border: '1px solid #e2e8f0', fontWeight: 700, color: '#0f172a' }}>
                              ₹{itemTotal.toFixed(2)}
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={6} style={{ padding: '20px', textAlign: 'center', color: '#94a3b8' }}>
                          No line items attached to this challan.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Financial Calculation Summary */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '20px', marginBottom: '28px' }}>
                <div>
                  <div style={{ backgroundColor: '#f1f5f9', padding: '12px 14px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: '10px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '4px' }}>
                      AMOUNT IN WORDS:
                    </div>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#0f172a', fontStyle: 'italic' }}>
                      {numberToWords(grandTotal)}
                    </div>
                  </div>

                  <div style={{ marginTop: '16px', fontSize: '11px', color: '#64748b' }}>
                    <strong>Terms & Conditions:</strong>
                    <ol style={{ paddingLeft: '16px', margin: '4px 0 0' }}>
                      <li>Goods delivered as per approved specifications and order contract.</li>
                      <li>Please inspect items immediately upon delivery. Claims after 3 days will not be entertained.</li>
                      <li>Subject to Mumbai Jurisdiction.</li>
                    </ol>
                  </div>
                </div>

                <div>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                    <tbody>
                      <tr>
                        <td style={{ padding: '6px 10px', color: '#475569' }}>Total Quantity:</td>
                        <td style={{ padding: '6px 10px', textAlign: 'right', fontWeight: 700, color: '#0f172a' }}>
                          {challan.totalQuantity} units
                        </td>
                      </tr>
                      <tr>
                        <td style={{ padding: '6px 10px', color: '#475569' }}>Taxable Value:</td>
                        <td style={{ padding: '6px 10px', textAlign: 'right', fontWeight: 600, color: '#0f172a' }}>
                          ₹{subtotal.toFixed(2)}
                        </td>
                      </tr>
                      <tr>
                        <td style={{ padding: '6px 10px', color: '#475569' }}>CGST @ 9%:</td>
                        <td style={{ padding: '6px 10px', textAlign: 'right', color: '#334155' }}>
                          ₹{cgst.toFixed(2)}
                        </td>
                      </tr>
                      <tr>
                        <td style={{ padding: '6px 10px', color: '#475569' }}>SGST @ 9%:</td>
                        <td style={{ padding: '6px 10px', textAlign: 'right', color: '#334155' }}>
                          ₹{sgst.toFixed(2)}
                        </td>
                      </tr>
                      <tr style={{ backgroundColor: '#0f172a', color: '#ffffff' }}>
                        <td style={{ padding: '10px', fontWeight: 800, fontSize: '13px' }}>Grand Total (INR):</td>
                        <td style={{ padding: '10px', textAlign: 'right', fontWeight: 900, fontSize: '15px', color: '#38bdf8' }}>
                          ₹{grandTotal.toFixed(2)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Signatures Section */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '40px',
                  marginTop: '40px',
                  paddingTop: '20px',
                  borderTop: '1px solid #cbd5e1',
                }}
              >
                <div>
                  <div style={{ height: '45px' }}></div>
                  <div style={{ borderTop: '1px dashed #94a3b8', paddingTop: '4px', textAlign: 'center', fontSize: '11px', fontWeight: 700, color: '#475569' }}>
                    Customer / Receiver Signature & Stamp
                  </div>
                </div>

                <div>
                  <div style={{ textAlign: 'center', fontSize: '11px', color: '#64748b', marginBottom: '25px', fontWeight: 700 }}>
                    For FUNDSROOM ERP SOLUTIONS PVT. LTD.
                  </div>
                  <div style={{ borderTop: '1px dashed #94a3b8', paddingTop: '4px', textAlign: 'center', fontSize: '11px', fontWeight: 700, color: '#0f172a' }}>
                    Authorized Signatory
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
