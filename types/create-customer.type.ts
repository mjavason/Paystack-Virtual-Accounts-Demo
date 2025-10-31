export interface CreateCustomerResponseType {
    data: {
        transactions: any[];
        subscriptions: any[];
        authorizations: any[];
        first_name: string;
        last_name: string;
        email: string;
        integration: number;
        domain: string;
        metadata: Record<string, any>;
        customer_code: string;
        risk_action: string;
        id: number;
        createdAt: string;
        updatedAt: string;
        identified: boolean;
        identifications: any;
    };
}