export type InitPaymentType = {
  data: {
    authorization_url: string;
    access_code: string;
    reference: string;
  };
};
