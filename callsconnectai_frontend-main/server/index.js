// server.js
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config()

// Define the CustomerData schema and model
const customerDataSchema = new mongoose.Schema({
  mobile: { type: String, required: true },
  name: { type: String, required: true },
  address: { type: String, required: true },
  product: { type: String, required: true },
  issue: { type: String, required: true },
  status: { type: String, required: true },
  complaint_number:{type: String, required: true},
  timestamp: { type: Date, default: Date.now },
});

const CustomerData = mongoose.model('CustomerData', customerDataSchema, 'customer_info');

// Initialize Express app
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })  
  .then(() => console.log('Connected to MongoDB'))
  .catch((err) => console.error('MongoDB connection error:', err));

// API endpoint to fetch customer data
app.get('/api/customers', async (req, res) => {
  try {
    const customers = await CustomerData.find();
    console.log(customers);
    
    res.status(200).json(customers);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching customer data', error });
  }
});

// // API endpoint to add customer data (optional)
// app.post('/api/customers', async (req, res) => {
//   try {
//     const newCustomer = new CustomerData(req.body);
//     await newCustomer.save();
//     res.status(201).json({ message: 'Customer data added successfully', newCustomer });
//   } catch (error) {
//     res.status(400).json({ message: 'Error adding customer data', error });
//   }
// });


// API endpoint to update issue and status
app.patch('/api/customers/:id', async (req, res) => {
    const { id } = req.params;
    const { issue, status } = req.body;
  
    // Validate the status value
    if (status && !['pending', 'completed'].includes(status)) {
      return res.status(400).json({ message: "Invalid status. Status must be 'Pending' or 'Completed'." });
    }
  
    try {
      const updatedCustomer = await CustomerData.findByIdAndUpdate(
        id,
        { issue, status },
        { new: true, runValidators: true } // `new` returns the updated document, `runValidators` enforces schema validation
      );
  
      if (!updatedCustomer) {
        return res.status(404).json({ message: 'Customer not found' });
      }
  
      res.status(200).json({ message: 'Customer updated successfully', updatedCustomer });
    } catch (error) {
      res.status(500).json({ message: 'Error updating customer data', error });
    }
  });


// Start the server
app.listen(process.env.PORT, () => {
  console.log(`Server running at http://localhost:${process.env.PORT}`);
});
