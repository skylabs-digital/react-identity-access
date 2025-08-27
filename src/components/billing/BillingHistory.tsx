import { useState } from 'react';
import { useSubscription } from '../../hooks/useSubscription';

export interface BillingHistoryProps {
  className?: string;
  showDownloadLinks?: boolean;
  maxItems?: number;
}

export function BillingHistory({
  className = '',
  showDownloadLinks = true,
  maxItems = 10,
}: BillingHistoryProps) {
  const { invoices, payments, isLoading, error, retryPayment, downloadInvoice } = useSubscription();

  const [isRetrying, setIsRetrying] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState<string | null>(null);

  const handleRetryPayment = async (invoiceId: string) => {
    setIsRetrying(invoiceId);
    try {
      await retryPayment(invoiceId);
    } catch (error) {
      console.error('Failed to retry payment:', error);
    } finally {
      setIsRetrying(null);
    }
  };

  const handleDownloadInvoice = async (invoiceId: string) => {
    setIsDownloading(invoiceId);
    try {
      const downloadUrl = await downloadInvoice(invoiceId);
      window.open(downloadUrl, '_blank');
    } catch (error) {
      console.error('Failed to download invoice:', error);
    } finally {
      setIsDownloading(null);
    }
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount / 100);
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(new Date(date));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
      case 'succeeded':
        return 'green';
      case 'pending':
      case 'processing':
        return 'yellow';
      case 'failed':
      case 'void':
      case 'canceled':
        return 'red';
      case 'open':
      case 'draft':
        return 'blue';
      default:
        return 'gray';
    }
  };

  if (isLoading) {
    return <div className={`billing-history loading ${className}`}>Loading billing history...</div>;
  }

  if (error) {
    return <div className={`billing-history error ${className}`}>Error: {error}</div>;
  }

  const displayInvoices = invoices.slice(0, maxItems);
  const displayPayments = payments.slice(0, maxItems);

  return (
    <div className={`billing-history ${className}`}>
      {/* Invoices Section */}
      <div className="invoices-section">
        <h3>Invoices</h3>
        {displayInvoices.length === 0 ? (
          <p className="no-data">No invoices found</p>
        ) : (
          <div className="invoices-table">
            <div className="table-header">
              <span>Invoice</span>
              <span>Date</span>
              <span>Amount</span>
              <span>Status</span>
              <span>Actions</span>
            </div>
            {displayInvoices.map(invoice => (
              <div key={invoice.id} className="table-row">
                <span className="invoice-id">#{invoice.id.slice(-8)}</span>
                <span className="invoice-date">{formatDate(invoice.createdAt)}</span>
                <span className="invoice-amount">
                  {formatCurrency(invoice.amount, invoice.currency)}
                </span>
                <span className={`invoice-status status-${getStatusColor(invoice.status)}`}>
                  {invoice.status}
                </span>
                <div className="invoice-actions">
                  {invoice.status === 'open' && (
                    <button
                      onClick={() => handleRetryPayment(invoice.id)}
                      disabled={isRetrying === invoice.id}
                      className="retry-button"
                    >
                      {isRetrying === invoice.id ? 'Retrying...' : 'Retry Payment'}
                    </button>
                  )}
                  {showDownloadLinks && invoice.downloadUrl && (
                    <button
                      onClick={() => handleDownloadInvoice(invoice.id)}
                      disabled={isDownloading === invoice.id}
                      className="download-button"
                    >
                      {isDownloading === invoice.id ? 'Downloading...' : 'Download'}
                    </button>
                  )}
                  {invoice.invoiceUrl && (
                    <a
                      href={invoice.invoiceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="view-button"
                    >
                      View
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Payments Section */}
      <div className="payments-section">
        <h3>Payment History</h3>
        {displayPayments.length === 0 ? (
          <p className="no-data">No payments found</p>
        ) : (
          <div className="payments-table">
            <div className="table-header">
              <span>Payment</span>
              <span>Date</span>
              <span>Amount</span>
              <span>Status</span>
              <span>Gateway</span>
            </div>
            {displayPayments.map(payment => (
              <div key={payment.id} className="table-row">
                <span className="payment-id">#{payment.id.slice(-8)}</span>
                <span className="payment-date">
                  {payment.processedAt
                    ? formatDate(payment.processedAt)
                    : formatDate(payment.createdAt)}
                </span>
                <span className="payment-amount">
                  {formatCurrency(payment.amount, payment.currency)}
                </span>
                <span className={`payment-status status-${getStatusColor(payment.status)}`}>
                  {payment.status}
                </span>
                <span className="payment-gateway">{payment.gateway}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Summary */}
      <div className="billing-summary">
        <h3>Summary</h3>
        <div className="summary-stats">
          <div className="stat">
            <span className="stat-label">Total Invoices:</span>
            <span className="stat-value">{invoices.length}</span>
          </div>
          <div className="stat">
            <span className="stat-label">Total Payments:</span>
            <span className="stat-value">{payments.length}</span>
          </div>
          <div className="stat">
            <span className="stat-label">Paid Invoices:</span>
            <span className="stat-value">
              {invoices.filter(inv => inv.status === 'paid').length}
            </span>
          </div>
          <div className="stat">
            <span className="stat-label">Successful Payments:</span>
            <span className="stat-value">
              {payments.filter(pay => pay.status === 'succeeded').length}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
