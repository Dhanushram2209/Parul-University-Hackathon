require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const sql = require('mssql');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Database configuration
const dbConfig = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_SERVER,
  database: process.env.DB_NAME,
  options: {
    encrypt: true, // For Azure
    trustServerCertificate: true, // For local dev
    enableArithAbort: true
  }
};

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Database initialization function
async function initializeDatabase() {
  try {
    const pool = await sql.connect(dbConfig);

        // First check if Users table exists
    const tableCheck = await pool.request()
      .query("SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'Users'");
    
    console.log(`Users table exists: ${tableCheck.recordset.length > 0}`);
    
    if (tableCheck.recordset.length === 0) {
      console.log('Creating tables...');
      // Rest of your table creation code
    } else {
      console.log('Tables already exist, skipping creation');
    }
    
    // Check if tables exist and create them if not
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Users')
      BEGIN
        CREATE TABLE Users (
          UserID INT PRIMARY KEY IDENTITY(1,1),
          Email NVARCHAR(100) UNIQUE NOT NULL,
          Password NVARCHAR(255) NOT NULL,
          FirstName NVARCHAR(50) NOT NULL,
          LastName NVARCHAR(50) NOT NULL,
          Role NVARCHAR(20) NOT NULL CHECK (Role IN ('patient', 'doctor', 'admin')),
          CreatedAt DATETIME DEFAULT GETDATE(),
          LastLogin DATETIME NULL
        );
        
        CREATE TABLE PatientDetails (
          PatientID INT PRIMARY KEY IDENTITY(1,1),
          UserID INT FOREIGN KEY REFERENCES Users(UserID),
          DateOfBirth DATE,
          Gender NVARCHAR(10),
          PhoneNumber NVARCHAR(20),
          Address NVARCHAR(255),
          EmergencyContact NVARCHAR(100),
          EmergencyPhone NVARCHAR(20)
        );
        
        CREATE TABLE DoctorDetails (
          DoctorID INT PRIMARY KEY IDENTITY(1,1),
          UserID INT FOREIGN KEY REFERENCES Users(UserID),
          Specialization NVARCHAR(100),
          LicenseNumber NVARCHAR(50),
          PhoneNumber NVARCHAR(20),
          HospitalAffiliation NVARCHAR(100)
        );

        CREATE TABLE PatientHealthData (
          RecordID INT PRIMARY KEY IDENTITY(1,1),
          PatientID INT FOREIGN KEY REFERENCES PatientDetails(PatientID),
          BloodPressure NVARCHAR(20),
          HeartRate INT,
          BloodSugar INT,
          OxygenLevel INT,
          Notes NVARCHAR(500),
          RecordedAt DATETIME DEFAULT GETDATE()
        );

        CREATE TABLE PatientRiskScores (
          ScoreID INT PRIMARY KEY IDENTITY(1,1),
          PatientID INT FOREIGN KEY REFERENCES PatientDetails(PatientID),
          RiskScore INT,
          CalculatedAt DATETIME DEFAULT GETDATE()
        );

        CREATE TABLE PatientAlerts (
          AlertID INT PRIMARY KEY IDENTITY(1,1),
          PatientID INT FOREIGN KEY REFERENCES PatientDetails(PatientID),
          Message NVARCHAR(500),
          Severity NVARCHAR(20) CHECK (Severity IN ('Low', 'Medium', 'High')),
          Timestamp DATETIME DEFAULT GETDATE(),
          IsRead BIT DEFAULT 0
        );

        CREATE TABLE PatientMedications (
          MedicationID INT PRIMARY KEY IDENTITY(1,1),
          PatientID INT FOREIGN KEY REFERENCES PatientDetails(PatientID),
          Name NVARCHAR(100),
          Dosage NVARCHAR(50),
          Frequency NVARCHAR(50),
          NextDose DATETIME,
          Status NVARCHAR(20) DEFAULT 'Pending'
        );

        CREATE TABLE PatientAppointments (
          AppointmentID INT PRIMARY KEY IDENTITY(1,1),
          PatientID INT FOREIGN KEY REFERENCES PatientDetails(PatientID),
          DoctorID INT FOREIGN KEY REFERENCES DoctorDetails(DoctorID),
          DateTime DATETIME,
          Type NVARCHAR(50),
          Status NVARCHAR(20) DEFAULT 'Scheduled',
          Notes NVARCHAR(500)
        );

        CREATE TABLE TelemedicineRequests (
          RequestID INT PRIMARY KEY IDENTITY(1,1),
          PatientID INT FOREIGN KEY REFERENCES PatientDetails(PatientID),
          DoctorID INT FOREIGN KEY REFERENCES DoctorDetails(DoctorID),
          RequestedAt DATETIME DEFAULT GETDATE(),
          PreferredDateTime DATETIME,
          Reason NVARCHAR(500),
          Symptoms NVARCHAR(500),
          Status NVARCHAR(20) DEFAULT 'Pending'
        );

        CREATE TABLE PatientPoints (
          PointID INT PRIMARY KEY IDENTITY(1,1),
          PatientID INT FOREIGN KEY REFERENCES PatientDetails(PatientID),
          Points INT,
          Reason NVARCHAR(200),
          AwardedAt DATETIME DEFAULT GETDATE()
        );
        
        PRINT 'Tables created successfully';
      END
    `);
    
    console.log('Database tables verified');
    return pool;
  } catch (err) {
    console.error('Database initialization error:', err);
    throw err;
  }
}

// Initialize database connection
let dbPool;
initializeDatabase()
  .then(pool => {
    dbPool = pool;
    console.log('Database connection established');
  })
  .catch(err => {
    console.error('Database connection failed:', err);
    process.exit(1);
  });

// Middleware to authenticate token
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.sendStatus(401);

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
}

// Register endpoint
app.post('/api/register', async (req, res) => {
  const { email, password, firstName, lastName, role, adminSecretKey, ...details } = req.body;

  try {
    // Validate admin registration
    if (role === 'admin' && adminSecretKey !== process.env.ADMIN_SECRET_KEY) {
      return res.status(400).json({ message: 'Invalid admin secret key' });
    }

    // Check if user already exists
    const userCheck = await dbPool.request()
      .input('email', sql.NVarChar, email)
      .query('SELECT * FROM Users WHERE Email = @email');

    if (userCheck.recordset.length > 0) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert user
    const result = await dbPool.request()
      .input('email', sql.NVarChar, email)
      .input('password', sql.NVarChar, hashedPassword)
      .input('firstName', sql.NVarChar, firstName)
      .input('lastName', sql.NVarChar, lastName)
      .input('role', sql.NVarChar, role)
      .query('INSERT INTO Users (Email, Password, FirstName, LastName, Role) OUTPUT INSERTED.UserID VALUES (@email, @password, @firstName, @lastName, @role)');

    const userId = result.recordset[0].UserID;

    // Insert role-specific details
    if (role === 'patient') {
      await dbPool.request()
        .input('userId', sql.Int, userId)
        .input('dateOfBirth', sql.Date, details.dateOfBirth)
        .input('gender', sql.NVarChar, details.gender)
        .input('phoneNumber', sql.NVarChar, details.phoneNumber)
        .input('address', sql.NVarChar, details.address)
        .input('emergencyContact', sql.NVarChar, details.emergencyContact)
        .input('emergencyPhone', sql.NVarChar, details.emergencyPhone)
        .query('INSERT INTO PatientDetails (UserID, DateOfBirth, Gender, PhoneNumber, Address, EmergencyContact, EmergencyPhone) VALUES (@userId, @dateOfBirth, @gender, @phoneNumber, @address, @emergencyContact, @emergencyPhone)');
    } else if (role === 'doctor') {
      await dbPool.request()
        .input('userId', sql.Int, userId)
        .input('specialization', sql.NVarChar, details.specialization)
        .input('licenseNumber', sql.NVarChar, details.licenseNumber)
        .input('phoneNumber', sql.NVarChar, details.phoneNumber)
        .input('hospitalAffiliation', sql.NVarChar, details.hospitalAffiliation)
        .query('INSERT INTO DoctorDetails (UserID, Specialization, LicenseNumber, PhoneNumber, HospitalAffiliation) VALUES (@userId, @specialization, @licenseNumber, @phoneNumber, @hospitalAffiliation)');
    }

    res.status(201).json({ message: 'User registered successfully' });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Registration failed', error: error.message });
  }
});

// Login endpoint
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const result = await dbPool.request()
      .input('email', sql.NVarChar, email)
      .query('SELECT * FROM Users WHERE Email = @email');

    if (result.recordset.length === 0) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const user = result.recordset[0];
    const isMatch = await bcrypt.compare(password, user.Password);

    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Update last login
    await dbPool.request()
      .input('userId', sql.Int, user.UserID)
      .query('UPDATE Users SET LastLogin = GETDATE() WHERE UserID = @userId');

    // Create token
    const token = jwt.sign(
      { userId: user.UserID, email: user.Email, role: user.Role },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    res.json({ 
      token, 
      user: { 
        email: user.Email, 
        firstName: user.FirstName, 
        lastName: user.LastName, 
        role: user.Role 
      } 
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Login failed', error: error.message });
  }
});

// Patient Data Endpoints
app.get('/api/patient/health-data', authenticateToken, async (req, res) => {
  if (req.user.role !== 'patient') return res.sendStatus(403);
  
  try {
    const result = await dbPool.request()
      .input('userId', sql.Int, req.user.userId)
      .query(`
        SELECT * FROM PatientHealthData 
        WHERE PatientID = (SELECT PatientID FROM PatientDetails WHERE UserID = @userId)
        ORDER BY RecordedAt DESC
      `);
    
    res.json(result.recordset);
  } catch (error) {
    console.error('Error fetching health data:', error);
    res.status(500).json({ message: 'Failed to fetch health data' });
  }
});

app.post('/api/patient/health-data', authenticateToken, async (req, res) => {
  if (req.user.role !== 'patient') return res.sendStatus(403);
  
  try {
    const { bloodPressure, heartRate, bloodSugar, oxygenLevel, notes } = req.body;
    
    await dbPool.request()
      .input('patientId', sql.Int, 
        (await dbPool.request()
          .input('userId', sql.Int, req.user.userId)
          .query('SELECT PatientID FROM PatientDetails WHERE UserID = @userId')
        ).recordset[0].PatientID
      )
      .input('bloodPressure', sql.NVarChar, bloodPressure)
      .input('heartRate', sql.Int, heartRate)
      .input('bloodSugar', sql.Int, bloodSugar)
      .input('oxygenLevel', sql.Int, oxygenLevel)
      .input('notes', sql.NVarChar, notes || null)
      .query(`
        INSERT INTO PatientHealthData 
        (PatientID, BloodPressure, HeartRate, BloodSugar, OxygenLevel, Notes, RecordedAt)
        VALUES (@patientId, @bloodPressure, @heartRate, @bloodSugar, @oxygenLevel, @notes, GETDATE())
      `);
    
    // Trigger AI analysis
    await analyzePatientData(req.user.userId);
    
    res.status(201).json({ message: 'Health data recorded successfully' });
  } catch (error) {
    console.error('Error recording health data:', error);
    res.status(500).json({ message: 'Failed to record health data' });
  }
});

app.get('/api/patient/risk-score', authenticateToken, async (req, res) => {
  if (req.user.role !== 'patient') return res.sendStatus(403);
  
  try {
    const result = await dbPool.request()
      .input('userId', sql.Int, req.user.userId)
      .query(`
        SELECT TOP 1 RiskScore FROM PatientRiskScores 
        WHERE PatientID = (SELECT PatientID FROM PatientDetails WHERE UserID = @userId)
        ORDER BY CalculatedAt DESC
      `);
    
    res.json({ score: result.recordset.length > 0 ? result.recordset[0].RiskScore : 0 });
  } catch (error) {
    console.error('Error fetching risk score:', error);
    res.status(500).json({ message: 'Failed to fetch risk score' });
  }
});

// Add this endpoint before the error handling middleware
app.get('/api/patient/vitals', authenticateToken, async (req, res) => {
  if (req.user.role !== 'patient') return res.sendStatus(403);
  
  try {
    const result = await dbPool.request()
      .input('userId', sql.Int, req.user.userId)
      .query(`
        SELECT TOP 1 
          BloodPressure as bloodPressure,
          HeartRate as heartRate,
          BloodSugar as bloodSugar,
          OxygenLevel as oxygenLevel
        FROM PatientHealthData 
        WHERE PatientID = (SELECT PatientID FROM PatientDetails WHERE UserID = @userId)
        ORDER BY RecordedAt DESC
      `);
    
    if (result.recordset.length > 0) {
      res.json(result.recordset[0]);
    } else {
      res.json(null);
    }
  } catch (error) {
    console.error('Error fetching vitals:', error);
    res.status(500).json({ message: 'Failed to fetch vitals' });
  }
});

// AI Analysis Function
async function analyzePatientData(userId) {
  try {
    // Get patient's recent health data
    const healthData = await dbPool.request()
      .input('userId', sql.Int, userId)
      .query(`
        SELECT TOP 10 * FROM PatientHealthData 
        WHERE PatientID = (SELECT PatientID FROM PatientDetails WHERE UserID = @userId)
        ORDER BY RecordedAt DESC
      `);
    
    if (healthData.recordset.length === 0) return;
    
    // Simple risk calculation (replace with actual ML model in production)
    const latestData = healthData.recordset[0];
    let riskScore = 0;
    
    // Blood pressure risk
    const [systolic, diastolic] = latestData.BloodPressure.split('/').map(Number);
    if (systolic > 140 || diastolic > 90) riskScore += 30;
    else if (systolic > 130 || diastolic > 85) riskScore += 15;
    
    // Heart rate risk
    if (latestData.HeartRate > 100 || latestData.HeartRate < 60) riskScore += 20;
    else if (latestData.HeartRate > 90 || latestData.HeartRate < 65) riskScore += 10;
    
    // Blood sugar risk
    if (latestData.BloodSugar > 140) riskScore += 25;
    else if (latestData.BloodSugar > 120) riskScore += 12;
    
    // Oxygen level risk
    if (latestData.OxygenLevel < 92) riskScore += 25;
    else if (latestData.OxygenLevel < 95) riskScore += 10;
    
    // Cap at 100
    riskScore = Math.min(100, riskScore);
    
    // Save risk score
    await dbPool.request()
      .input('patientId', sql.Int, 
        (await dbPool.request()
          .input('userId', sql.Int, userId)
          .query('SELECT PatientID FROM PatientDetails WHERE UserID = @userId')
        ).recordset[0].PatientID
      )
      .input('riskScore', sql.Int, riskScore)
      .query(`
        INSERT INTO PatientRiskScores (PatientID, RiskScore, CalculatedAt)
        VALUES (@patientId, @riskScore, GETDATE())
      `);
    
    // Generate alerts if needed
    if (riskScore > 70) {
      await generateAlert(userId, 'High risk detected. Please consult your doctor immediately.', 'High');
    } else if (riskScore > 40) {
      await generateAlert(userId, 'Moderate risk detected. Monitor your condition closely.', 'Medium');
    }
    
  } catch (error) {
    console.error('AI analysis error:', error);
  }
}

async function generateAlert(userId, message, severity) {
  try {
    await dbPool.request()
      .input('patientId', sql.Int, 
        (await dbPool.request()
          .input('userId', sql.Int, userId)
          .query('SELECT PatientID FROM PatientDetails WHERE UserID = @userId')
        ).recordset[0].PatientID
      )
      .input('message', sql.NVarChar, message)
      .input('severity', sql.NVarChar, severity)
      .query(`
        INSERT INTO PatientAlerts (PatientID, Message, Severity, Timestamp, IsRead)
        VALUES (@patientId, @message, @severity, GETDATE(), 0)
      `);
  } catch (error) {
    console.error('Error generating alert:', error);
  }
}

// Protected route example
app.get('/api/protected', authenticateToken, (req, res) => {
  res.json({ message: 'This is a protected route', user: req.user });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', database: dbPool ? 'Connected' : 'Disconnected' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something broke!', error: err.message });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Handle graceful shutdown
process.on('SIGINT', async () => {
  if (dbPool) {
    await dbPool.close();
    console.log('Database connection closed');
  }
  process.exit(0);
});
// Add these endpoints to your server.js file

// Get patient medications
app.get('/api/patient/medications', authenticateToken, async (req, res) => {
  if (req.user.role !== 'patient') return res.sendStatus(403);
  
  try {
    const result = await dbPool.request()
      .input('userId', sql.Int, req.user.userId)
      .query(`
        SELECT * FROM PatientMedications 
        WHERE PatientID = (SELECT PatientID FROM PatientDetails WHERE UserID = @userId)
        ORDER BY NextDose ASC
      `);
    
    res.json(result.recordset);
  } catch (error) {
    console.error('Error fetching medications:', error);
    res.status(500).json({ message: 'Failed to fetch medications' });
  }
});

// Get patient alerts
app.get('/api/patient/alerts', authenticateToken, async (req, res) => {
  if (req.user.role !== 'patient') return res.sendStatus(403);
  
  try {
    const result = await dbPool.request()
      .input('userId', sql.Int, req.user.userId)
      .query(`
        SELECT * FROM PatientAlerts 
        WHERE PatientID = (SELECT PatientID FROM PatientDetails WHERE UserID = @userId)
        ORDER BY Timestamp DESC
      `);
    
    res.json(result.recordset);
  } catch (error) {
    console.error('Error fetching alerts:', error);
    res.status(500).json({ message: 'Failed to fetch alerts' });
  }
});

// Get patient appointments
app.get('/api/patient/appointments', authenticateToken, async (req, res) => {
  if (req.user.role !== 'patient') return res.sendStatus(403);
  
  try {
    const result = await dbPool.request()
      .input('userId', sql.Int, req.user.userId)
      .query(`
        SELECT a.*, d.FirstName + ' ' + d.LastName as DoctorName 
        FROM PatientAppointments a
        JOIN DoctorDetails dd ON a.DoctorID = dd.DoctorID
        JOIN Users d ON dd.UserID = d.UserID
        WHERE a.PatientID = (SELECT PatientID FROM PatientDetails WHERE UserID = @userId)
        ORDER BY a.DateTime DESC
      `);
    
    res.json(result.recordset);
  } catch (error) {
    console.error('Error fetching appointments:', error);
    res.status(500).json({ message: 'Failed to fetch appointments' });
  }
});

// Get patient points
app.get('/api/patient/points', authenticateToken, async (req, res) => {
  if (req.user.role !== 'patient') return res.sendStatus(403);
  
  try {
    const result = await dbPool.request()
      .input('userId', sql.Int, req.user.userId)
      .query(`
        SELECT SUM(Points) as points FROM PatientPoints
        WHERE PatientID = (SELECT PatientID FROM PatientDetails WHERE UserID = @userId)
      `);
    
    res.json({ points: result.recordset[0].points || 0 });
  } catch (error) {
    console.error('Error fetching points:', error);
    res.status(500).json({ message: 'Failed to fetch points' });
  }
});

// Get all doctors
app.get('/api/doctors', authenticateToken, async (req, res) => {
  try {
    const result = await dbPool.request()
      .query(`
        SELECT dd.DoctorID as id, u.FirstName + ' ' + u.LastName as name, dd.Specialization as specialization
        FROM DoctorDetails dd
        JOIN Users u ON dd.UserID = u.UserID
      `);
    
    res.json(result.recordset);
  } catch (error) {
    console.error('Error fetching doctors:', error);
    res.status(500).json({ message: 'Failed to fetch doctors' });
  }
});

// Submit telemedicine request
app.post('/api/telemedicine/request', authenticateToken, async (req, res) => {
  if (req.user.role !== 'patient') return res.sendStatus(403);
  
  try {
    const { doctorId, preferredDateTime, reason, symptoms } = req.body;
    
    await dbPool.request()
      .input('patientId', sql.Int, 
        (await dbPool.request()
          .input('userId', sql.Int, req.user.userId)
          .query('SELECT PatientID FROM PatientDetails WHERE UserID = @userId')
        ).recordset[0].PatientID
      )
      .input('doctorId', sql.Int, doctorId)
      .input('preferredDateTime', sql.DateTime, preferredDateTime)
      .input('reason', sql.NVarChar, reason)
      .input('symptoms', sql.NVarChar, symptoms || null)
      .query(`
        INSERT INTO TelemedicineRequests 
        (PatientID, DoctorID, PreferredDateTime, Reason, Symptoms)
        VALUES (@patientId, @doctorId, @preferredDateTime, @reason, @symptoms)
      `);
    
    // Award points for engagement
    await dbPool.request()
      .input('patientId', sql.Int, 
        (await dbPool.request()
          .input('userId', sql.Int, req.user.userId)
          .query('SELECT PatientID FROM PatientDetails WHERE UserID = @userId')
        ).recordset[0].PatientID
      )
      .input('points', sql.Int, 10)
      .input('reason', sql.NVarChar, 'Telemedicine request submission')
      .query(`
        INSERT INTO PatientPoints 
        (PatientID, Points, Reason)
        VALUES (@patientId, @points, @reason)
      `);
    
    res.status(201).json({ message: 'Telemedicine request submitted successfully' });
  } catch (error) {
    console.error('Error submitting telemedicine request:', error);
    res.status(500).json({ message: 'Failed to submit telemedicine request' });
  }
});

// Mark medication as taken
app.post('/api/patient/medications/:id/taken', authenticateToken, async (req, res) => {
  if (req.user.role !== 'patient') return res.sendStatus(403);
  
  try {
    await dbPool.request()
      .input('medicationId', sql.Int, req.params.id)
      .input('patientId', sql.Int, 
        (await dbPool.request()
          .input('userId', sql.Int, req.user.userId)
          .query('SELECT PatientID FROM PatientDetails WHERE UserID = @userId')
        ).recordset[0].PatientID
      )
      .query(`
        UPDATE PatientMedications 
        SET Status = 'Taken' 
        WHERE MedicationID = @medicationId AND PatientID = @patientId
      `);
    
    // Award points for medication adherence
    await dbPool.request()
      .input('patientId', sql.Int, 
        (await dbPool.request()
          .input('userId', sql.Int, req.user.userId)
          .query('SELECT PatientID FROM PatientDetails WHERE UserID = @userId')
        ).recordset[0].PatientID
      )
      .input('points', sql.Int, 5)
      .input('reason', sql.NVarChar, 'Medication adherence')
      .query(`
        INSERT INTO PatientPoints 
        (PatientID, Points, Reason)
        VALUES (@patientId, @points, @reason)
      `);
    
    res.json({ message: 'Medication marked as taken' });
  } catch (error) {
    console.error('Error updating medication:', error);
    res.status(500).json({ message: 'Failed to update medication' });
  }
});

// Mark alert as read
app.post('/api/patient/alerts/:id/read', authenticateToken, async (req, res) => {
  if (req.user.role !== 'patient') return res.sendStatus(403);
  
  try {
    await dbPool.request()
      .input('alertId', sql.Int, req.params.id)
      .input('patientId', sql.Int, 
        (await dbPool.request()
          .input('userId', sql.Int, req.user.userId)
          .query('SELECT PatientID FROM PatientDetails WHERE UserID = @userId')
        ).recordset[0].PatientID
      )
      .query(`
        UPDATE PatientAlerts 
        SET IsRead = 1 
        WHERE AlertID = @alertId AND PatientID = @patientId
      `);
    
    res.json({ message: 'Alert marked as read' });
  } catch (error) {
    console.error('Error updating alert:', error);
    res.status(500).json({ message: 'Failed to update alert' });
  }
});


// Get patient profile
app.get('/api/patient/profile', authenticateToken, async (req, res) => {
  if (req.user.role !== 'patient') return res.sendStatus(403);
  
  try {
    // Get basic user info
    const userResult = await dbPool.request()
      .input('userId', sql.Int, req.user.userId)
      .query('SELECT FirstName, LastName, Email, Role FROM Users WHERE UserID = @userId');
    
    if (userResult.recordset.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    const user = userResult.recordset[0];
    
    // Get patient details
    const patientResult = await dbPool.request()
      .input('userId', sql.Int, req.user.userId)
      .query(`
        SELECT DateOfBirth, Gender, PhoneNumber, Address, EmergencyContact, EmergencyPhone 
        FROM PatientDetails 
        WHERE UserID = @userId
      `);
    
    // Combine the data
    const profileData = {
      firstName: user.FirstName,
      lastName: user.LastName,
      email: user.Email,
      role: user.Role,
      dateOfBirth: patientResult.recordset[0]?.DateOfBirth,
      gender: patientResult.recordset[0]?.Gender,
      phoneNumber: patientResult.recordset[0]?.PhoneNumber,
      address: patientResult.recordset[0]?.Address,
      emergencyContact: patientResult.recordset[0]?.EmergencyContact,
      emergencyPhone: patientResult.recordset[0]?.EmergencyPhone
    };
    
    res.json(profileData);
  } catch (error) {
    console.error('Error fetching patient profile:', error);
    res.status(500).json({ message: 'Failed to fetch patient profile' });
  }
});

// Get doctor profile
app.get('/api/doctor/profile', authenticateToken, async (req, res) => {
  if (req.user.role !== 'doctor') return res.sendStatus(403);
  
  try {
    // Get basic user info
    const userResult = await dbPool.request()
      .input('userId', sql.Int, req.user.userId)
      .query('SELECT FirstName, LastName, Email, Role FROM Users WHERE UserID = @userId');
    
    if (userResult.recordset.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    const user = userResult.recordset[0];
    
    // Get doctor details
    const doctorResult = await dbPool.request()
      .input('userId', sql.Int, req.user.userId)
      .query(`
        SELECT Specialization, LicenseNumber, PhoneNumber, HospitalAffiliation 
        FROM DoctorDetails 
        WHERE UserID = @userId
      `);
    
    // Combine the data
    const profileData = {
      firstName: user.FirstName,
      lastName: user.LastName,
      email: user.Email,
      role: user.Role,
      specialization: doctorResult.recordset[0]?.Specialization,
      licenseNumber: doctorResult.recordset[0]?.LicenseNumber,
      phoneNumber: doctorResult.recordset[0]?.PhoneNumber,
      hospitalAffiliation: doctorResult.recordset[0]?.HospitalAffiliation
    };
    
    res.json(profileData);
  } catch (error) {
    console.error('Error fetching doctor profile:', error);
    res.status(500).json({ message: 'Failed to fetch doctor profile' });
  }
});

// Generic profile endpoint that routes based on role
app.get('/api/profile', authenticateToken, async (req, res) => {
  try {
    if (req.user.role === 'patient') {
      // Forward to patient profile endpoint
      req.url = '/api/patient/profile';
      return app.handle(req, res);
    } else if (req.user.role === 'doctor') {
      // Forward to doctor profile endpoint
      req.url = '/api/doctor/profile';
      return app.handle(req, res);
    } else if (req.user.role === 'admin') {
      // Get basic admin info
      const userResult = await dbPool.request()
        .input('userId', sql.Int, req.user.userId)
        .query('SELECT FirstName, LastName, Email, Role FROM Users WHERE UserID = @userId');
      
      if (userResult.recordset.length === 0) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      const user = userResult.recordset[0];
      
      res.json({
        firstName: user.FirstName,
        lastName: user.LastName,
        email: user.Email,
        role: user.Role
      });
    } else {
      return res.status(403).json({ message: 'Unknown role' });
    }
  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({ message: 'Failed to fetch profile' });
  }
});