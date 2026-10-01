import  { useState } from 'react';
import { format } from 'date-fns';
import { Phone, User, MapPin, Package, AlertCircle, Calendar, Clock, Edit2, Check, X, Notebook } from 'lucide-react';
import type { CustomerData } from '../types/customer';
import { updateCustomerStatus, updateCustomerIssue } from '../services/customerService';

interface CustomerTableProps {
  customers: CustomerData[];
  onCustomerUpdate: () => void;
}



export default function CustomerTable({ customers, onCustomerUpdate }: CustomerTableProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingIssue, setEditingIssue] = useState('');
  const [updating, setUpdating] = useState(false);

  const handleStatusUpdate = async (id: string, newStatus: 'pending' | 'completed') => {
    try {
      setUpdating(true);
      await updateCustomerStatus(id, newStatus);
      onCustomerUpdate();
    } catch (error) {
      console.error('Failed to update status:', error);
    } finally {
      setUpdating(false);
    }
  };

  const startEditing = (customer: CustomerData) => {
    setEditingId(customer._id);
    setEditingIssue(customer.issue);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditingIssue('');
  };

  const saveIssue = async (id: string) => {
    try {
      setUpdating(true);
      await updateCustomerIssue(id, editingIssue);
      onCustomerUpdate();
      setEditingId(null);
    } catch (error) {
      console.error('Failed to update issue:', error);
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="overflow-x-auto bg-white rounded-lg shadow">
      
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              <div className="flex items-center gap-1">
                <Notebook size={16} />
                <span>Complain Number</span>
              </div>
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              <div className="flex items-center gap-1">
                <User size={16} />
                <span>Customer</span>
              </div>
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              <div className="flex items-center gap-1">
                <Phone size={16} />
                <span>Mobile</span>
              </div>
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              <div className="flex items-center gap-1">
                <MapPin size={16} />
                <span>Address</span>
              </div>
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              <div className="flex items-center gap-1">
                <Package size={16} />
                <span>Product</span>
              </div>
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              <div className="flex items-center gap-1">
                <AlertCircle size={16} />
                <span>Issue</span>
              </div>
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              <div className="flex items-center gap-1">
                <Clock size={16} />
                <span>Status</span>
              </div>
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              <div className="flex items-center gap-1">
                <Calendar size={16} />
                <span>Date</span>
              </div>
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              <div className="flex items-center gap-1">
                <Calendar size={16} />
                <span>Priority </span>
              </div>
            </th>
            {/* <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              <span className="sr-only">Actions</span>
            </th> */}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {customers.map((customer) => (
            <tr key={customer._id} className="hover:bg-gray-50">
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm font-medium text-gray-900">{customer.complaint_number}</div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm font-medium text-gray-900">{customer.name}</div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm text-gray-500">{customer.mobile}</div>
              </td>
              <td className="px-6 py-4">
                <div className="text-sm text-gray-500 max-w-xs truncate">
                  {customer.address}
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm text-gray-500">{customer.product}</div>
              </td>
              <td className="px-6 py-4">
                {editingId === customer._id ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={editingIssue}
                      onChange={(e) => setEditingIssue(e.target.value)}
                      className="text-sm border rounded px-2 py-1 w-full"
                      disabled={updating}
                    />
                    <button
                      onClick={() => saveIssue(customer._id)}
                      disabled={updating}
                      className="text-green-600 hover:text-green-800"
                    >
                      <Check size={16} />
                    </button>
                    <button
                      onClick={cancelEditing}
                      disabled={updating}
                      className="text-red-600 hover:text-red-800"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-sm text-gray-500 max-w-xs truncate">
                      {customer.issue}
                    </div>
                    <button
                      onClick={() => startEditing(customer)}
                      className="text-gray-600 hover:text-gray-800"
                    >
                      <Edit2 size={16} />
                    </button>
                  </div>
                )}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <select
                  value={customer.status}
                  onChange={(e) => handleStatusUpdate(customer._id, e.target.value as 'pending' | 'completed')}
                  disabled={updating}
                  className={`px-2 py-1 text-xs font-semibold rounded-full ${
                    customer.status === 'completed'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-yellow-100 text-yellow-800'
                  }`}
                >
                  <option value="pending">Pending</option>
                  <option value="completed">Resolved</option>
                </select>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm text-gray-500">
                  {format(new Date(customer.timestamp), 'MMM d, yyyy HH:mm')}
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm font-medium text-gray-900">{customer.priority}</div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}