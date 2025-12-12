import 'dotenv/config';
// server.js
import express from 'express';
import http from 'http';
import cors from 'cors';
import { Server } from 'socket.io';
import connectDB from './db/index.js';
import cookieParser from 'cookie-parser';
import exp from 'constants';
import authRouter from './routes/authRouters.js'; // Import your auth routes
// Load environment variables


const app = express();
app.use(cors({
    origin:process.env.CORS_ORIGIN,
    credentials:true, 
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']

}));


app.use(express.json({limit:"16kb"}))
app.use(express.urlencoded(
    {extended:true,limit:"16kb"}
))
app.use(express.static("public"))
app.use(cookieParser())


// Mock topic of the day
const topicOfTheDay = 'Is AI going to change the world for better or worse?';

app.get('/', (req, res) => {
  res.send('Welcome to the CorrectMe Signal Server! hiiii hahahah');
});

app.get('/topic', (req, res) => {
  res.json({ topic: topicOfTheDay });
});



// ********************************************************************************************************************************


const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CORS_ORIGIN, // You can also use an array here
    methods: ["GET", "POST"], // Optional: specify allowed methods
    credentials: true // Optional: if you're sending cookies/auth headers
  }
});

// Matchmaking queue
let waitingUser = null;
const partners = {}; // socket.id -> partnerId


function broadcastUserCount() {
  io.emit('user_count', { count: io.engine.clientsCount });
}
// Broadcast user count on connection and disconnection

io.on('connection', (socket) => {
  broadcastUserCount();
  console.log('User connected:', socket.id);

  socket.on('find_partner', () => {
    if (waitingUser && waitingUser !== socket.id) {
      const partnerId = waitingUser;
      waitingUser = null;
      partners[socket.id] = partnerId;
      partners[partnerId] = socket.id;
      const startTime = Date.now();
      
      // First user (partnerId) should NOT initiate - they wait for offer
      io.to(partnerId).emit('partner_found', { 
        partnerId: socket.id, 
        startTime,
        shouldInitiate: false  // ← ADD THIS
      });
      
      // Second user (socket.id) should initiate - they create offer
      socket.emit('partner_found', { 
        partnerId, 
        startTime,
        shouldInitiate: true   // ← ADD THIS
      });
    } else {
      waitingUser = socket.id;
      socket.emit('waiting_for_partner');
    }
  });

  // WebRTC signaling relay
  socket.on('signal', ({ to, data }) => {
    io.to(to).emit('signal', { from: socket.id, data });
  });

  // Handle leave_call event
  socket.on('leave_call', ({ to }) => {
    io.to(to).emit('force_disconnect');
    // Clean up partners mapping
    delete partners[socket.id];
    delete partners[to];
  });

  socket.on('disconnect', () => {
    if (waitingUser === socket.id) {
      waitingUser = null;
    }
    const partnerId = partners[socket.id];
    if (partnerId) {
      io.to(partnerId).emit('partner_disconnected', { id: socket.id });
      delete partners[partnerId];
      delete partners[socket.id];
    }
    broadcastUserCount();
    console.log('User disconnected:', socket.id);
  });
});


// *******************************************************************************************************************************************





const PORT = process.env.PORT || 5000;
//database connection
connectDB()
.then(()=>{
  console.log('Database connected successfully');
  server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
  // Start the server only after successful DB connection
  
}).catch((error)=>{
  console.error('Database connection failed:', error);
});




// login with google
app.use('/auth', authRouter); // Use the auth router for authentication routes


//Routers import
import userRouter from './routes/user.routes.js'; // Import your user routes
import topicRouter from './routes/topic.router.js'
app.use('/api/users',userRouter);
app.use('/api/topic',topicRouter);
