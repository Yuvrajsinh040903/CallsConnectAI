import  { useEffect, useState } from 'react';
import axios from 'axios';
import { LayoutDashboard } from 'lucide-react';
import CustomerTable from './components/CustomerTable';
import type { CustomerData } from './types/customer';

function App() {
  const [customers, setCustomers] = useState<CustomerData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCustomers = async () => {
    try {
      const response = await axios.get('http://localhost:3000/api/customers');
      setCustomers(response.data);
      setLoading(false);
    } catch (err) {
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.message || 'Failed to fetch customer data');
      } else {
        setError('An unexpected error occurred');
      }
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
    
    // Set up polling every 30 seconds
    const interval = setInterval(fetchCustomers, 30000);
    
    // Cleanup interval on component unmount
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
          <strong className="font-bold">Error! </strong>
          <span className="block sm:inline">{error}</span>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-2 bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const pendingCustomers = customers.filter(c => c.status === 'pending').length;
  const completedCustomers = customers.filter(c => c.status === 'completed').length;

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center gap-2 mb-8">
          <div className='flex justify-center'> <LayoutDashboard className="h-8 w-8 text-blue-600" />
          <h1 className="text-3xl font-bold text-gray-900">Customer Dashboard</h1></div>
          <div> <button
            onClick={fetchCustomers}
            className="ml-4 bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2 px-4 rounded-md transition-colors duration-200 flex items-center gap-2"
          >
            Refresh
          </button></div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="text-lg font-semibold text-blue-700">Total Customers</h3>
              <p className="text-3xl font-bold text-blue-900">{customers.length}</p>
            </div>
            <div className="bg-yellow-50 p-4 rounded-lg">
              <h3 className="text-lg font-semibold text-yellow-700">Pending Issues</h3>
              <p className="text-3xl font-bold text-yellow-900">{pendingCustomers}</p>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <h3 className="text-lg font-semibold text-green-700">Completed Issues</h3>
              <p className="text-3xl font-bold text-green-900">{completedCustomers}</p>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg">
              <h3 className="text-lg font-semibold text-purple-700">Today's Entries</h3>
              <p className="text-3xl font-bold text-purple-900">
                {customers.filter(c => 
                  new Date(c.timestamp).toDateString() === new Date().toDateString()
                ).length}
              </p>
            </div>
          </div>
        </div>

        <CustomerTable customers={customers} onCustomerUpdate={fetchCustomers} />
      </div>
    </div>
  );
}

export default App;