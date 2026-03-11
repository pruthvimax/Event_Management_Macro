import express from "express";
import { createServer as createViteServer } from "vite";
import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import cors from "cors";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import QRCode from "qrcode";

dotenv.config();

const app = express();
const PORT = 3000;
const JWT_SECRET = process.env.JWT_SECRET || "eventum_secret_key";

app.use(cors());
app.use(express.json());

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI || "mongodb+srv://pruthvialalliprivate_db_user:7rexYduB9cbIL0jP@eventmanagement.oducztq.mongodb.net/event_db?retryWrites=true&w=majority&appName=EventManagement";

mongoose.connect(MONGODB_URI)
  .then(() => console.log("✅ Connected to MongoDB Atlas"))
  .catch(err => console.error("❌ MongoDB connection error:", err));

// User Schema
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  isAdmin: { type: Boolean, default: false }
});

const User = mongoose.model("User", userSchema);

// Event Schema — includes all features: image, category, participants, waitlist
const eventSchema = new mongoose.Schema({
  title: { type: String, required: true },
  date: { type: String, required: true },
  location: { type: String, required: true },
  description: { type: String, required: true },
  maxCapacity: { type: Number, required: true, default: 50 },
  currentRSVPs: { type: Number, default: 0 },
  image_url: { type: String, default: "" },
  category: { type: String, default: "" },
  participants: { type: [String], default: [] },
  waitlist: { type: [String], default: [] },
  createdAt: { type: Date, default: Date.now }
});

const Event = mongoose.model("Event", eventSchema);

// Auth Middleware
const authenticate = (req: any, res: any, next: any) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Unauthorized" });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: "Invalid token" });
  }
};

const isAdmin = (req: any, res: any, next: any) => {
  if (!req.user?.isAdmin) return res.status(403).json({ error: "Forbidden: Admin only" });
  next();
};

// --- Auth Routes ---

app.post("/api/auth/signup", async (req, res) => {
  try {
    const { username, email, password, isAdmin } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ username, email, password: hashedPassword, isAdmin: isAdmin || false });
    await user.save();
    res.status(201).json({ message: "User created" });
  } catch (err) {
    res.status(400).json({ error: "User already exists" });
  }
});

// Sign in — returns id in user object so frontend can track RSVP state
app.post("/api/auth/signin", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    const token = jwt.sign({ id: user._id.toString(), isAdmin: user.isAdmin, username: user.username }, JWT_SECRET);
    res.json({
      token,
      user: {
        id: user._id.toString(),
        username: user.username,
        isAdmin: user.isAdmin
      }
    });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// --- Event Routes ---

// List events with optional search + category filter
app.get("/api/events", async (req, res) => {
  try {
    const { search, category } = req.query as { search?: string; category?: string };
    const query: any = {};
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
        { location: { $regex: search, $options: "i" } }
      ];
    }
    if (category) {
      query.category = category;
    }
    const events = await Event.find(query).sort({ createdAt: -1 });
    res.json(events);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch events" });
  }
});

// My Events — return events where the logged-in user is a participant
app.get("/api/my-events", authenticate, async (req, res) => {
  try {
    const userID = (req as any).user.id;
    console.log("[DEBUG] getMyEvents querying for UserID:", userID);
    const events = await Event.find({ participants: userID });
    res.json(events);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch my events" });
  }
});

// Create event (admin only)
app.post("/api/events", authenticate, isAdmin, async (req, res) => {
  try {
    const newEvent = new Event({
      ...req.body,
      currentRSVPs: 0,
      participants: [],
      waitlist: []
    });
    await newEvent.save();
    console.log(`[ASYNC WORKER] New Event Created: ${newEvent.title}`);
    res.status(201).json(newEvent);
  } catch (err) {
    res.status(400).json({ error: "Failed to create event" });
  }
});

// Update event (admin only)
app.put("/api/events/:id", authenticate, isAdmin, async (req, res) => {
  try {
    const updated = await Event.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: "Failed to update event" });
  }
});

// RSVP — adds user to participants or waitlist; returns QR code on success
app.post("/api/events/:id/rsvp", authenticate, async (req, res) => {
  try {
    const userID = (req as any).user.id;
    const eventID = req.params.id;

    console.log("[DEBUG] handleRSVP UserID:", userID, "EventID:", eventID);

    const event = await Event.findById(eventID);
    if (!event) return res.status(404).json({ error: "Event not found" });

    // Check if already registered or waitlisted
    if (event.participants.includes(userID)) {
      return res.status(409).json({ error: "Already RSVP'd to this event" });
    }
    if (event.waitlist.includes(userID)) {
      return res.status(409).json({ error: "Already on the waitlist" });
    }

    // If full — add to waitlist
    if (event.participants.length >= event.maxCapacity) {
      await Event.findByIdAndUpdate(eventID, { $addToSet: { waitlist: userID } });
      return res.status(202).json({
        status: "waitlisted",
        message: "Event is full. You have been added to the waitlist."
      });
    }

    // Add to participants
    await Event.findByIdAndUpdate(eventID, {
      $addToSet: { participants: userID },
      $inc: { currentRSVPs: 1 }
    });

    console.log(`[ASYNC WORKER] RSVP confirmed for: ${event.title}`);

    // Generate QR code: "eventID:userID"
    const qrData = `${eventID}:${userID}`;
    const qrCode = await QRCode.toDataURL(qrData);

    res.json({ message: "RSVP successful", qr_code: qrCode });
  } catch (err) {
    console.error("[ERROR] RSVP failed:", err);
    res.status(400).json({ error: "Failed to RSVP" });
  }
});

// Cancel RSVP — removes from participants or waitlist; promotes waitlisted user
app.post("/api/events/:id/cancel", authenticate, async (req, res) => {
  try {
    const userID = (req as any).user.id;
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ error: "Event not found" });

    const isParticipant = event.participants.includes(userID);

    if (isParticipant) {
      // Remove from participants
      const newParticipants = event.participants.filter((p: string) => p !== userID);

      if (event.waitlist.length > 0) {
        // Promote first waitlisted user
        const [promoted, ...remainingWaitlist] = event.waitlist;
        newParticipants.push(promoted);
        await Event.findByIdAndUpdate(req.params.id, {
          $set: { participants: newParticipants, waitlist: remainingWaitlist }
        });
      } else {
        await Event.findByIdAndUpdate(req.params.id, {
          $set: { participants: newParticipants },
          $inc: { currentRSVPs: -1 }
        });
      }
    } else {
      // Remove from waitlist if present
      await Event.findByIdAndUpdate(req.params.id, {
        $pull: { waitlist: userID }
      });
    }

    res.json({ message: "RSVP cancelled" });
  } catch (err) {
    res.status(400).json({ error: "Failed to cancel RSVP" });
  }
});

// Delete event (admin only)
app.delete("/api/admin/delete-event/:id", authenticate, isAdmin, async (req, res) => {
  try {
    await Event.findByIdAndDelete(req.params.id);
    res.json({ message: "Event deleted" });
  } catch (err) {
    res.status(400).json({ error: "Failed to delete event" });
  }
});

// Catch-all for unmatched API routes to prevent HTML fallback
app.use("/api/*", (req, res) => {
  res.status(404).json({ error: "API route not found" });
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
  });
}

startServer();
