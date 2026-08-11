import { withTransaction } from "../database/db";
import { ApiError } from "../utils/apiError";
import type { Customer, CustomerFollowup, CustomerListResponse } from "../types/customer";
import type { CustomerCreateInput, CustomerFollowupInput, CustomerListQuery, CustomerUpdateInput } from "../validators/customerValidators";
import {
  createCustomer as createCustomerRecord,
  createCustomerFollowup,
  getCustomerById,
  listCustomerFollowups,
  listCustomers,
  touchCustomerFollowup,
  updateCustomer as updateCustomerRecord
} from "../repositories/customerRepository";

export async function listCustomerService(query: CustomerListQuery): Promise<CustomerListResponse> {
  return listCustomers(query);
}

export async function getCustomerService(id: number): Promise<Customer> {
  const customer = await getCustomerById(id);
  if (!customer) {
    throw new ApiError(404, "Customer not found");
  }

  return customer;
}

export async function createCustomerService(input: CustomerCreateInput, createdBy: number): Promise<Customer> {
  return createCustomerRecord(input, createdBy);
}

export async function updateCustomerService(id: number, input: CustomerUpdateInput): Promise<Customer> {
  const customer = await updateCustomerRecord(id, input);
  if (!customer) {
    throw new ApiError(404, "Customer not found");
  }

  return customer;
}

export async function listCustomerFollowupService(customerId: number): Promise<CustomerFollowup[]> {
  const customer = await getCustomerById(customerId);
  if (!customer) {
    throw new ApiError(404, "Customer not found");
  }

  return listCustomerFollowups(customerId);
}

export async function createCustomerFollowupService(
  customerId: number,
  input: CustomerFollowupInput,
  createdBy: number
): Promise<CustomerFollowup> {
  const customer = await getCustomerById(customerId);
  if (!customer) {
    throw new ApiError(404, "Customer not found");
  }

  return withTransaction(async (client) => {
    const followup = await createCustomerFollowup(client, customerId, input, createdBy);
    await touchCustomerFollowup(client, customerId, followup.followUpDate, followup.note);
    return followup;
  });
}
