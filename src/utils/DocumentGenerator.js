import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

class DocumentGenerator {
  static async generateQuotation(enquiry, customer, company) {
    // Use the same HTML from your existing code
    const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body {
          font-family: Arial, sans-serif;
          margin: 0;
          padding: 20px;
        }
        .header {
          text-align: center;
          margin-bottom: 30px;
        }
        .company-name {
          font-size: 24px;
          font-weight: bold;
          color: #333;
        }
        .document-title {
          font-size: 20px;
          margin-top: 10px;
          color: #666;
        }
        .section {
          margin-bottom: 20px;
        }
        .section-title {
          font-size: 16px;
          font-weight: bold;
          margin-bottom: 10px;
          color: #333;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 10px;
        }
        th, td {
          border: 1px solid #ddd;
          padding: 8px;
          text-align: left;
        }
        th {
          background-color: #f2f2f2;
          font-weight: bold;
        }
        .total-row {
          font-weight: bold;
        }
        .footer {
          margin-top: 50px;
          text-align: center;
          color: #666;
          font-size: 12px;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="company-name">${company.name}</div>
        <div class="document-title">QUOTATION</div>
      </div>
      
      <div class="section">
        <div class="section-title">Customer Details</div>
        <p><strong>Name:</strong> ${customer.name}</p>
        <p><strong>Contact:</strong> ${customer.contactPerson}</p>
        <p><strong>Phone:</strong> ${customer.phone}</p>
        <p><strong>Email:</strong> ${customer.email}</p>
        <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
      </div>
      
      <div class="section">
        <div class="section-title">Products</div>
        <table>
          <thead>
            <tr>
              <th>S.No</th>
              <th>Product</th>
              <th>Quantity</th>
              <th>Rate</th>
              <th>Tax %</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            ${enquiry.products.map((product, index) => `
              <tr>
                <td>${index + 1}</td>
                <td>${product.name}</td>
                <td>${product.quantity}</td>
                <td>Rs.${product.rate}</td>
                <td>${product.tax}%</td>
                <td>Rs.${product.total}</td>
              </tr>
            `).join('')}
            <tr class="total-row">
              <td colspan="5" style="text-align: right;">Subtotal:</td>
              <td>Rs.${enquiry.subtotal}</td>
            </tr>
            <tr class="total-row">
              <td colspan="5" style="text-align: right;">Tax:</td>
              <td>Rs.${enquiry.taxAmount}</td>
            </tr>
            <tr class="total-row">
              <td colspan="5" style="text-align: right;">Grand Total:</td>
              <td>Rs.${enquiry.grandTotal}</td>
            </tr>
          </tbody>
        </table>
      </div>
      
      <div class="section">
        <div class="section-title">Terms & Conditions</div>
        <ol>
          <li>This quotation is valid for 30 days from the date of issue.</li>
          <li>Prices are subject to change without prior notice.</li>
          <li>Delivery will be made within 7-10 business days after order confirmation.</li>
          <li>Payment terms: 50% advance, balance on delivery.</li>
        </ol>
      </div>
      
      <div class="footer">
        <p>Thank you for your business!</p>
        <p>${company.address} | ${company.phone} | ${company.email}</p>
      </div>
    </body>
    </html>
  `;

    try {
      const { uri } = await Print.printToFileAsync({ 
        html,
        base64: false
      });
      return uri;
    } catch (error) {
      console.error('Error generating PDF:', error);
      throw error;
    }
  }

  static async generateInvoice(order, customer, company) {
    // Use your existing HTML template
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 20px;
          }
          .header {
            display: flex;
            justify-content: space-between;
            margin-bottom: 30px;
          }
          .company-info {
            text-align: left;
          }
          .invoice-info {
            text-align: right;
          }
          .company-name {
            font-size: 24px;
            font-weight: bold;
            color: #333;
          }
          .invoice-title {
            font-size: 28px;
            font-weight: bold;
            color: #333;
          }
          .invoice-number {
            font-size: 16px;
            color: #666;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
          }
          th, td {
            border: 1px solid #ddd;
            padding: 10px;
            text-align: left;
          }
          th {
            background-color: #f2f2f2;
            font-weight: bold;
          }
          .total-section {
            margin-top: 20px;
            text-align: right;
          }
          .total-row {
            margin: 5px 0;
          }
          .grand-total {
            font-size: 18px;
            font-weight: bold;
            color: #333;
            border-top: 2px solid #333;
            padding-top: 10px;
          }
          .payment-section {
            margin-top: 30px;
            padding: 15px;
            background-color: #f9f9f9;
            border-radius: 5px;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="company-info">
            <div class="company-name">${company.name}</div>
            <p>${company.address}</p>
            <p>Phone: ${company.phone}</p>
            <p>Email: ${company.email}</p>
            <p>GST: ${company.gst}</p>
          </div>
          <div class="invoice-info">
            <div class="invoice-title">INVOICE</div>
            <div class="invoice-number">${order.orderNumber}</div>
            <p>Date: ${new Date(order.date).toLocaleDateString()}</p>
          </div>
        </div>
        
        <div class="customer-section">
          <h3>Bill To:</h3>
          <p><strong>${customer.name}</strong></p>
          <p>${customer.address}</p>
          <p>Phone: ${customer.phone}</p>
          <p>GST: ${customer.gst || 'N/A'}</p>
        </div>
        
        <table>
          <thead>
            <tr>
              <th>S.No</th>
              <th>Product</th>
              <th>Quantity</th>
              <th>Rate</th>
              <th>Tax</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            ${order.products.map((product, index) => `
              <tr>
                <td>${index + 1}</td>
                <td>${product.name}</td>
                <td>${product.quantity}</td>
                <td>Rs.${product.rate}</td>
                <td>${product.tax}%</td>
                <td>Rs.${product.total}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        
        <div class="total-section">
          <div class="total-row">Subtotal: Rs.${order.subtotal}</div>
          <div class="total-row">Tax: Rs.${order.taxAmount}</div>
          <div class="grand-total">Grand Total: Rs.${order.totalAmount}</div>
        </div>
        
        <div class="payment-section">
          <h3>Payment Details</h3>
          <p>Total Amount: Rs.${order.totalAmount}</p>
          <p>Paid Amount: Rs.${order.paidAmount}</p>
          <p>Balance Amount: Rs.${order.balanceAmount}</p>
          
          ${order.payments && order.payments.length > 0 ? `
            <h4>Payment History:</h4>
            <ul>
              ${order.payments.map(payment => `
                <li>${new Date(payment.date).toLocaleDateString()} - Rs.${payment.amount} (${payment.mode})</li>
              `).join('')}
            </ul>
          ` : ''}
        </div>
      </body>
      </html>
    `;

    
    try {
      const { uri } = await Print.printToFileAsync({ 
        html,
        base64: false 
      });
      return uri;
    } catch (error) {
      console.error('Error generating invoice:', error);
      throw error;
    }
  }

  static async shareDocument(filePath, type = 'quotation') {
    try {
      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        await Sharing.shareAsync(filePath, {
          mimeType: 'application/pdf',
          dialogTitle: `Share ${type}`,
        });
      }
    } catch (error) {
      console.error('Error sharing document:', error);
    }
  }

  static async shareViaWhatsApp(filePath, phoneNumber, type = 'quotation') {
    // Expo doesn't have direct WhatsApp sharing, use general share
    await this.shareDocument(filePath, type);
  }
}

export default DocumentGenerator;
