import axios from 'axios';

const API_BASE_URL = 'http://localhost:3000/api/customers';

export const updateCustomerStatus = async (id: string, status: 'pending' | 'completed') => {
  const response = await axios.patch(`${API_BASE_URL}/${id}`, { status });
  return response.data;
};

export const updateCustomerIssue = async (id: string, issue: string) => {
  const response = await axios.patch(`${API_BASE_URL}/${id}`, { issue });
  return response.data;
};