export interface ChargeSuccessWebhookType {
  event: 'charge.success';
  data: {
    id: number;
    domain: string;
    status: string;
    reference: string;
    amount: number;
    message: string | null;
    gateway_response: string;
    paid_at: string;
    created_at: string;
    channel: string;
    currency: string;
    ip_address: string;
    metadata: string;
    fees_breakdown: any | null;
    log: any | null;
    fees: number;
    fees_split: any | null;
    authorization: {
      authorization_code: string;
      bin: string;
      last4: string;
      exp_month: string;
      exp_year: string;
      channel: string;
      card_type: string;
      bank: string;
      country_code: string;
      brand: string;
      reusable: boolean;
      signature: string;
      account_name: string | null;
    };
    customer: {
      id: number;
      first_name: string | null;
      last_name: string | null;
      email: string;
      customer_code: string;
      phone: string | null;
      metadata: any | null;
      risk_action: string;
      international_format_phone: string | null;
    };
    plan: Record<string, any>;
    subaccount: Record<string, any>;
    split: Record<string, any>;
    order_id: string | null;
    paidAt: string;
    requested_amount: number;
    pos_transaction_data: any | null;
    source: {
      type: string;
      source: string;
      entry_point: string;
      identifier: string | null;
    };
  };
}
