const express = require('express');
const cors = require('cors');
const path = require('path');
const bodyParser = require('body-parser');
const { auth, db } = require('./firebase-admin');
const session = require('express-session'); // Add this line
const multer = require('multer');
const XLSX = require('xlsx');
const fs = require('fs');
const upload = multer({ dest: 'uploads/' });
const app = express();
const port = 3000;
// Ensure SESSION_SECRET is set
if (!process.env.SESSION_SECRET) {
  console.error('SESSION_SECRET is not set. Please set it as an environment variable.');
  process.exit(1);
}
app.use(cors({ credentials: true, origin: true }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: true,
  cookie: { 
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'strict'
  }
}));

// Middleware to check if user is authenticated and an admin
const isAdmin = (req, res, next) => {
    if (req.session && req.session.user && req.session.user.role === 'admin') {
        next();
    } else {
        res.status(403).json({ error: 'Access denied. Admin privileges required.' });
    }
};

// Middleware to log all incoming requests
app.use((req, res, next) => {
    console.log(`Received ${req.method} request to ${req.url}`);
    console.log('Request headers:', req.headers);
    console.log('Session data:', req.session);
    next();
});

// Fetch all notes
app.get('/api/notes', isAdmin, async (req, res) => {
  try {
    const notesSnapshot = await db.collection('notes').get();
    const notes = notesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(notes);
  } catch (error) {
    console.error('Error fetching notes:', error);
    res.status(500).json({ error: 'Failed to fetch notes' });
  }
});


// Handle user registration
app.post('/api/register', isAdmin, async (req, res) => {
    const { fullName, title, phoneNumber, email, password, role } = req.body;

    try {
        // Create a new user in Firebase Authentication
        const userRecord = await auth.createUser({
            email: email,
            password: password,
        });

        // Save the user details in Firestore
        await db.collection('users').doc(userRecord.uid).set({
            fullName: fullName,
            title: title,
            phoneNumber: phoneNumber,
            email: email,
            role: role,
            createdAt: new Date().toISOString(),
        });

        res.json({ success: true, message: 'User registered successfully!' });
    } catch (error) {
        console.error('Error registering user:', error);
        res.status(500).json({ error: 'Failed to register user' });
    }
});


// Fetch a single note by ID
app.get('/api/notes/:id', isAdmin, async (req, res) => {
  try {
    const noteDoc = await db.collection('notes').doc(req.params.id).get();
    if (!noteDoc.exists) {
      return res.status(404).json({ error: 'Note not found' });
    }
    res.json({ id: noteDoc.id, ...noteDoc.data() });
  } catch (error) {
    console.error('Error fetching note:', error);
    res.status(500).json({ error: 'Failed to fetch note' });
  }
});

// Update a note
app.put('/api/notes/:id', isAdmin, async (req, res) => {
  try {
    await db.collection('notes').doc(req.params.id).update(req.body);
    res.json({ success: true });
  } catch (error) {
    console.error('Error updating note:', error);
    res.status(500).json({ error: 'Failed to update note' });
  }
});


app.post('/api/import-data', isAdmin, upload.single('file'), async (req, res) => {
    const { type } = req.body;
    const filePath = req.file.path;

    try {
        const workbook = XLSX.readFile(filePath);
        const sheetName = workbook.SheetNames[0];
        const worksheet = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: '', raw: false });

        for (const item of worksheet) {
            const itemId = item.id || null;
            if (type === 'compounds' || type === 'methods') {
                item.methods = (typeof item.methods === 'string') ? item.methods.split(',') : [];
                item.panel = (typeof item.panel === 'string') ? item.panel.split(',') : [];
            }

            if (itemId) {
                await db.collection(type).doc(itemId).set(item);
                console.log(`Document with ID ${itemId} updated.`);
            } else {
                await db.collection(type).add(item);
                console.log('New document added.');
            }
        }

        res.json({ success: true, message: 'Import completed!' });
    } catch (error) {
        console.error('Error importing data:', error);
        res.status(500).json({ error: 'Failed to import data' });
    } finally {
        fs.unlinkSync(filePath); // Remove the uploaded file
    }
});

app.post('/api/export-data', isAdmin, async (req, res) => {
    const { type } = req.body;

    try {
        const dataSnapshot = await db.collection(type).get();
        const data = [];
        dataSnapshot.forEach(doc => {
            const item = doc.data();
            item.id = doc.id;

            if (type === 'compounds') {
                item.methods = Array.isArray(item.methods) ? item.methods.join(',') : item.methods;
                item.panel = Array.isArray(item.panel) ? item.panel.join(',') : item.panel;
            }

            data.push(item);
        });

        const worksheet = XLSX.utils.json_to_sheet(data);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, type.charAt(0).toUpperCase() + type.slice(1));

        const filePath = `./${type}.xlsx`;
        XLSX.writeFile(workbook, filePath);

        res.download(filePath, (err) => {
            if (err) {
                console.error('Error sending file:', err);
            }
            fs.unlinkSync(filePath); // Delete the file after download
        });
    } catch (error) {
        console.error('Error exporting data:', error);
        res.status(500).json({ error: 'Failed to export data' });
    }
});

app.delete('/api/delete-all', isAdmin, async (req, res) => {
    const { type } = req.body;

    try {
        const collectionRef = db.collection(type);
        const snapshot = await collectionRef.get();

        const deletePromises = snapshot.docs.map(doc => doc.ref.delete());
        await Promise.all(deletePromises);

        res.json({ success: true, message: `All documents in ${type} have been deleted successfully!` });
    } catch (error) {
        console.error(`Error deleting documents from ${type}:`, error);
        res.status(500).json({ error: `Failed to delete documents from ${type}` });
    }
});

app.post('/api/search', async (req, res) => {
  const { searchTerm } = req.body;
  try {
      const compoundsRef = db.collection('compounds');
      const querySnapshot = await compoundsRef.get();

      const searchResults = [];
      querySnapshot.forEach((docSnapshot) => {
          const compoundData = docSnapshot.data();
          const matchesNameOrCas = (compoundData.name && compoundData.name.toLowerCase().includes(searchTerm)) ||
                                   (compoundData.cas && compoundData.cas.toLowerCase().includes(searchTerm));
          const matchesPanel = Array.isArray(compoundData.panel) && compoundData.panel.some(panel => panel.toLowerCase().includes(searchTerm));
          if (matchesNameOrCas || matchesPanel) {
              searchResults.push({ id: docSnapshot.id, ...compoundData });
          }
      });

      res.json(searchResults);
  } catch (error) {
      console.error('Error during search:', error);
      res.status(500).json({ error: 'An error occurred during search.' });
  }
});

app.post('/api/compounds-by-panel', async (req, res) => {
    const { panel } = req.body;
    try {
        const compoundsRef = db.collection('compounds');
        const q = compoundsRef.where("panel", "array-contains", panel);
        const querySnapshot = await q.get();

        const compounds = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        res.json(compounds); // Ensure JSON response
    } catch (error) {
        console.error('Error fetching compounds by panel:', error);
        res.status(500).json({ error: 'An error occurred while fetching compounds by panel.' });
    }
});


// Fetch method details
app.post('/api/method-details', async (req, res) => {
    try {
        const { methodIds } = req.body;
        console.log('Received request for method details:', methodIds);

        // Fetch method details from your database
        const methodDetails = await Promise.all(methodIds.map(async (methodId) => {
            // Replace this with your actual database query
            const methodDoc = await db.collection('methods').doc(methodId).get();
            return { id: methodId, ...methodDoc.data() };
        }));

        console.log('Sending method details:', methodDetails);
        res.json(methodDetails);
    } catch (error) {
        console.error('Error fetching method details:', error);
        res.status(500).json({ error: 'An error occurred while fetching method details.' });
    }
});
app.post('/api/save-notes', async (req, res) => {
  const { compoundName, compoundCAS, methodName, notesText, methodDetails } = req.body;
  try {
      await db.collection('notes').add({
          compound: compoundName,
          cas: compoundCAS,
          method: methodName,
          notes: notesText,
          methodDetails: methodDetails,
          timestamp: new Date(),
          status: "open"
      });
      res.json({ success: true, message: 'Notes saved successfully!' });
  } catch (error) {
      console.error('Error saving notes:', error);
      res.status(500).json({ error: 'An error occurred while saving notes.' });
  }
});

// Handle requests for compound data by letter
app.post('/api/compounds-by-letter', async (req, res) => {
  const { letter } = req.body;
  try {
      const compoundsRef = db.collection('compounds');
      let q;
      if (letter === '#') {
          q = compoundsRef.where("name", ">=", "0").where("name", "<", "9\uf8ff");
      } else {
          q = compoundsRef.where("name", ">=", letter).where("name", "<", letter + "\uf8ff");
      }
      const querySnapshot = await q.get();

      const compounds = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      res.json(compounds);
  } catch (error) {
      console.error('Error fetching compounds by letter:', error);
      res.status(500).json({ error: 'An error occurred while fetching compounds.' });
  }
});


// Handle sign-in requests
// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    
    res.status(500).json({
        error: 'An unexpected error occurred',
        message: process.env.NODE_ENV === 'production' ? 'Please try again later' : err.message
    });
});

// Wrap async route handlers
const asyncHandler = (fn) => (req, res, next) =>
    Promise.resolve(fn(req, res, next)).catch(next);

app.get('/api/auth-status', async (req, res) => {
    try {
        console.log('Checking auth status...');
        if (req.session && req.session.user) {
            console.log('User is authenticated:', req.session.user);
            res.json({
                authenticated: true,
                user: {
                    email: req.session.user.email,
                    role: req.session.user.role
                }
            });
        } else {
            console.log('User is not authenticated.');
            res.json({ authenticated: false });
        }
    } catch (error) {
        console.error('Error during auth status check:', error);
        res.status(500).json({ authenticated: false, error: error.message });
    }
});


app.get('/api/compounds', isAdmin, async (req, res) => {
    try {
        const compoundsSnapshot = await db.collection('compounds').get();
        const compounds = compoundsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        res.json(compounds);
    } catch (error) {
        console.error('Error fetching compounds:', error);
        res.status(500).json({ error: 'Failed to fetch compounds' });
    }
});

// Get a single compound
app.get('/api/compounds/:id',  async (req, res) => {
    console.log(`Fetching compound with id: ${req.params.id}`);
    try {
        const doc = await db.collection('compounds').doc(req.params.id).get();
        console.log('Fetched document:', doc.exists ? 'exists' : 'does not exist');
        if (!doc.exists) {
            return res.status(404).json({ error: 'Compound not found' });
        }
        const data = { id: doc.id, ...doc.data() };
        console.log('Sending data:', data);
        res.json(data);
    } catch (error) {
        console.error('Error fetching compound:', error);
        res.status(500).json({ error: 'Failed to fetch compound' });
    }
});

app.get('/api/panels', isAdmin, async (req, res) => {
    try {
        const panelsSnapshot = await db.collection('panel').get();
        const panels = panelsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        res.json(panels);
    } catch (error) {
        console.error('Error fetching panels:', error);
        res.status(500).json({ error: 'Failed to fetch panels' });
    }
});

// Get all methods
app.get('/api/methods', isAdmin, async (req, res) => {
    try {
        const methodsSnapshot = await db.collection('methods').get();
        const methods = methodsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        res.json(methods);
    } catch (error) {
        console.error('Error fetching methods:', error);
        res.status(500).json({ error: 'Failed to fetch methods' });
    }
});
// PUT endpoint to update an existing panel
app.put('/api/panels/:id', isAdmin, async (req, res) => {
    try {
        await db.collection('panel').doc(req.params.id).update(req.body);
        res.json({ success: true });
    } catch (error) {
        console.error('Error updating panel:', error);
        res.status(500).json({ error: 'Failed to update panel' });
    }
});

// Create a new method
app.post('/api/methods', isAdmin, async (req, res) => {
    try {
        const docRef = await db.collection('methods').add(req.body);
        res.status(201).json({ id: docRef.id });
    } catch (error) {
        console.error('Error adding method:', error);
        res.status(500).json({ error: 'Failed to add method' });
    }
});

// Update an existing method
app.put('/api/methods/:id', isAdmin, async (req, res) => {
    try {
        await db.collection('methods').doc(req.params.id).update(req.body);
        res.json({ success: true });
    } catch (error) {
        console.error('Error updating method:', error);
        res.status(500).json({ error: 'Failed to update method' });
    }
});

// Delete a method
app.delete('/api/methods/:id', isAdmin, async (req, res) => {
    try {
        await db.collection('methods').doc(req.params.id).delete();
        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting method:', error);
        res.status(500).json({ error: 'Failed to delete method' });
    }
});

app.post('/api/compounds', isAdmin, async (req, res) => {
    try {
        const docRef = await db.collection('compounds').add(req.body);
        res.status(201).json({ id: docRef.id });
    } catch (error) {
        console.error('Error adding compound:', error);
        res.status(500).json({ error: 'Failed to add compound' });
    }
});

app.put('/api/compounds/:id', isAdmin, async (req, res) => {
    try {
        await db.collection('compounds').doc(req.params.id).update(req.body);
        res.json({ success: true });
    } catch (error) {
        console.error('Error updating compound:', error);
        res.status(500).json({ error: 'Failed to update compound' });
    }
});

app.delete('/api/compounds/:id', isAdmin, async (req, res) => {
    try {
        await db.collection('compounds').doc(req.params.id).delete();
        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting compound:', error);
        res.status(500).json({ error: 'Failed to delete compound' });
    }
});

app.get('/api/auth-check', (req, res) => {
  if (req.session && req.session.user) {
    res.json({
      authenticated: true,
      user: {
        email: req.session.user.email,
        role: req.session.user.role
      }
    });
  } else {
    res.json({ authenticated: false });
  }
});


// Protected add-compound endpoint
app.post('/api/add-compound', isAdmin, async (req, res) => {
    try {
        const { name, cas, methods } = req.body;
        const docRef = await db.collection("compounds").add({
            name,
            cas,
            methods
        });
        res.json({ success: true, id: docRef.id });
    } catch (error) {
        console.error('Error adding compound:', error);
        res.status(500).json({ error: 'Failed to add compound' });
    }
});

app.post('/api/sign-out', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('Error destroying session:', err);
            return res.status(500).json({ error: 'Failed to sign out' });
        }
        res.clearCookie('connect.sid'); // Clear the session cookie
        res.json({ success: true, message: 'Signed out successfully' });
    });
});


app.post('/api/sign-in', async (req, res) => {
    const { email, password } = req.body;
    try {
        // Authenticate user with Firebase
        const userRecord = await auth.getUserByEmail(email);

        // Fetch user data from Firestore to get the correct role
        const userDoc = await db.collection('users').doc(userRecord.uid).get();
        const userData = userDoc.data();

        // Update last sign-in timestamp
        await userDoc.ref.update({
            lastSignInAt: new Date().toISOString()
        });

        // Set session data with the correct role
        req.session.user = {
            email: userRecord.email,
            role: userData.role || 'user' // Use the role from Firestore, default to 'user' if not set
        };

        res.json({ success: true, user: req.session.user });
    } catch (error) {
        console.error('Error during sign-in:', error);
        res.status(401).json({ error: 'Invalid credentials' });
    }
});




// Fallback to index.html for other routes
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});

