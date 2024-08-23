const express = require('express');
const admin = require('firebase-admin');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config();

const app = express();
app.use(express.json());
app.use(express.static('public'));

// Serve the dashboard page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Initialize Firebase Admin SDK
const firebaseConfig = JSON.parse(process.env.FIREBASE_CONFIG);
admin.initializeApp({
  credential: admin.credential.cert(firebaseConfig)
});

const db = admin.firestore();



// Route to get a specific employee by ID
app.get('/api/employees/:id', async (req, res) => {
  try {
    const employeeId = req.params.id;
    const doc = await db.collection('Employees').doc(employeeId).get();
    if (!doc.exists) {
      res.status(404).json({ error: 'Employee not found' });
    } else {
      res.json({ id: doc.id, ...doc.data() });
    }
  } catch (error) {
    console.error('Error fetching employee:', error);
    res.status(500).json({ error: error.message });
  }
});
// Route to update employee trainings
app.post('/api/update-employee-trainings', async (req, res) => {
  try {
    const { employeeId, trainings } = req.body;

    // First, remove all existing trainings for this employee
    const existingTrainings = await db.collection('Trainings')
      .where('EmployeeID', '==', employeeId)
      .get();

    const batch = db.batch();
    existingTrainings.forEach(doc => {
      batch.delete(doc.ref);
    });

    // Then, add new trainings
    trainings.forEach(training => {
      const newTrainingRef = db.collection('Trainings').doc();
      batch.set(newTrainingRef, {
        EmployeeID: employeeId,
        Training: training,
        Date: new Date().toISOString().split('T')[0], // Current date
        // Add other fields as needed
      });
    });

    await batch.commit();

    // Here you would add logic to send the updated trainings to Teams
    // For now, we'll just log it
    console.log(`Updated trainings for employee ${employeeId} sent to Teams`);

    res.status(200).json({ message: 'Trainings updated successfully' });
  } catch (error) {
    console.error('Error updating trainings:', error);
    res.status(500).json({ error: error.message });
  }
});


app.get('/api/employee-trainings/:employeeId', async (req, res) => {
  try {
    const employeeId = req.params.employeeId;
    const snapshot = await db.collection('Trainings')
      .where('EmployeeID', '==', employeeId)
      .get();
    const trainings = snapshot.docs.map(doc => doc.data());
    res.json(trainings);
  } catch (error) {
    console.error('Error fetching employee trainings:', error);
    res.status(500).json({ error: error.message });
  }
});

// Add this new route to your Express.js server file

// Route to get all unique training types
// Route to get all unique training types
app.get('/api/training-types', async (req, res) => {
  try {
    const snapshot = await db.collection('Trainings').get();
    const trainingTypes = new Set();
    snapshot.forEach(doc => {
      const data = doc.data();
      if (data.Training) {
        trainingTypes.add(data.Training);
      }
    });
    res.json(Array.from(trainingTypes));
  } catch (error) {
    console.error('Error fetching training types:', error);
    res.status(500).json({ error: error.message });
  }
});


// Route to schedule a new training
app.post('/api/schedule-training', async (req, res) => {
  try {
    const { employeeId, trainingType, date } = req.body;
    const newTraining = {
      ID: Date.now().toString(), // Generate a unique ID
      Employment_Length: "NA",
      Expiration: "NA",
      Location_of_Training: "On Site",
      Prerequisites: "NA",
      Site: "NA",
      Trade: "NA", // You might want to fetch this from the employee data
      Training: trainingType,
      Type: "Equipment", // You might want to determine this based on the training type
      Date: date,
      EmployeeID: employeeId
    };

    await db.collection('Trainings').add(newTraining);
    res.status(201).json({ message: 'Training scheduled successfully' });
  } catch (error) {
    console.error('Error scheduling training:', error);
    res.status(500).json({ error: error.message });
  }
});


// Route to get all jobs
app.get('/api/jobs', async (req, res) => {
  try {
    const snapshot = await db.collection('Jobs').get();
    const jobs = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    console.log('Fetched jobs:', jobs);
    res.json(jobs);
  } catch (error) {
    console.error('Error fetching jobs:', error);
    res.status(500).json({ error: error.message });
  }
});

// Route to get all employees
app.get('/api/employees', async (req, res) => {
  try {
    const snapshot = await db.collection('Employees').get();
    const employees = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        name: data['Last,First'] || `${data.Last_Name}, ${data.First}`, // Adjust based on your actual field names
        job: data.Trade
      };
    });
    res.json(employees);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Route to get all documents from a collection with optional query
app.get('/api/:collection', async (req, res) => {
  try {
    const collectionName = req.params.collection;
    let query = db.collection(collectionName);

    // Apply filters if provided in query params
    if (req.query.field && req.query.value) {
      query = query.where(req.query.field, '==', req.query.value);
    }

    const snapshot = await query.get();
    const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Example route to add a document to a collection
app.post('/api/:collection', async (req, res) => {
  try {
    const collectionName = req.params.collection;
    const docRef = await db.collection(collectionName).add(req.body);
    res.status(201).json({ id: docRef.id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
