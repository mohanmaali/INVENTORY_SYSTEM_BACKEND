import Customer from '../models/Customer.model.js';

const padSequence = value => String(value).padStart(4, '0');

const generateCustomerCode = async options => {
  const latestCustomer = await Customer.findOne({})
    .sort({ createdAt: -1, customerCode: -1 })
    .select('customerCode')
    .session(options?.session || null)
    .lean();

  let nextSequence = 1;
  if (latestCustomer?.customerCode) {
    const numericPart = Number(String(latestCustomer.customerCode).replace('CUST-', ''));
    nextSequence = numericPart + 1;
  }

  return `CUST-${padSequence(nextSequence)}`;
};

export default {
  generateCustomerCode
};
