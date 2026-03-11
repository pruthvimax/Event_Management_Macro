package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"sync"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/golang-jwt/jwt/v4"
	"golang.org/x/crypto/bcrypt"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

// Event Struct - Core Data Structure
type Event struct {
	ID           primitive.ObjectID `bson:"_id,omitempty" json:"_id"`
	Title        string             `bson:"title" json:"title"`
	Date         string             `bson:"date" json:"date"`
	Location     string             `bson:"location" json:"location"`
	Description  string             `bson:"description" json:"description"`
	MaxCapacity  int                `bson:"max_capacity" json:"max_capacity"`
	CurrentRSVPs int                `bson:"current_rsvps" json:"current_rsvps"`
}

// User Struct - Core Auth Structure
type User struct {
	ID           primitive.ObjectID `bson:"_id,omitempty" json:"_id"`
	Username     string             `bson:"username" json:"username"`
	Email        string             `bson:"email" json:"email"`
	PasswordHash string             `bson:"password_hash" json:"-"`
	IsAdmin      bool               `bson:"is_admin" json:"is_admin"`
}

type Notification struct {
	Type    string    `json:"type"`
	Message string    `json:"message"`
	Time    time.Time `json:"time"`
}

var (
	collection       *mongo.Collection
	userCollection   *mongo.Collection
	mu               sync.Mutex
	notificationChan chan Notification
	jwtKey           = []byte("your_secret_key") // In production, use environment variable
)

func main() {
	// 1. Database Connection
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	uri := "mongodb+srv://pruthvialalliprivate_db_user:7rexYduB9cbIL0jP@eventmanagement.oducztq.mongodb.net/?appName=EventManagement"
	client, _ := mongo.Connect(ctx, options.Client().ApplyURI(uri))
	db := client.Database("event_db")
	collection = db.Collection("events")
	userCollection = db.Collection("users")

	// 2. Initialize Notification System
	notificationChan = make(chan Notification, 100)
	go notificationWorker()

	// 3. Router Setup
	r := chi.NewRouter()
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)

	// 4. Public Routes
	r.Post("/api/auth/signup", signUp)
	r.Post("/api/auth/signin", signIn)
	r.Get("/api/events", listEvents)

	// 5. Protected Routes (User)
	r.Group(func(r chi.Router) {
		r.Use(authMiddleware)
		r.Post("/api/events/{id}/rsvp", handleRSVP)
		r.Post("/api/events/{id}/cancel", handleCancel)
	})

	// 6. Admin Routes
	r.Group(func(r chi.Router) {
		r.Use(authMiddleware)
		r.Use(adminMiddleware)
		r.Post("/api/events", createEvent)
		r.Put("/api/events/{id}", updateEvent)
		r.Delete("/api/admin/delete-event/{id}", deleteEvent)
	})

	fmt.Println("Eventum Backend running on :8080 with Auth & Constraints...")
	http.ListenAndServe(":8080", r)
}

// authMiddleware verifies JWT tokens
func authMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		authHeader := r.Header.Get("Authorization")
		if authHeader == "" {
			http.Error(w, "Authorization header required", http.StatusUnauthorized)
			return
		}

		tokenStr := ""
		fmt.Sscanf(authHeader, "Bearer %s", &tokenStr)

		claims := &jwt.MapClaims{}
		token, err := jwt.ParseWithClaims(tokenStr, claims, func(token *jwt.Token) (interface{}, error) {
			return jwtKey, nil
		})

		if err != nil || !token.Valid {
			http.Error(w, "Invalid token", http.StatusUnauthorized)
			return
		}

		// Add claims to context
		ctx := context.WithValue(r.Context(), "user", *claims)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

// adminMiddleware ensures the user has admin privileges
func adminMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		userClaims, ok := r.Context().Value("user").(jwt.MapClaims)
		if !ok {
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}

		isAdmin, ok := userClaims["isAdmin"].(bool)
		if !ok || !isAdmin {
			http.Error(w, "Admin privileges required", http.StatusForbidden)
			return
		}
		next.ServeHTTP(w, r)
	})
}

// signUp handles user registration
func signUp(w http.ResponseWriter, r *http.Request) {
	var user User
	if err := json.NewDecoder(r.Body).Decode(&user); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	// Hash password
	hashed, _ := bcrypt.GenerateFromPassword([]byte(user.PasswordHash), bcrypt.DefaultCost)
	user.PasswordHash = string(hashed)

	_, err := userCollection.InsertOne(context.Background(), user)
	if err != nil {
		http.Error(w, "User already exists or database error", http.StatusConflict)
		return
	}

	w.WriteHeader(http.StatusCreated)
}

// signIn handles user login
func signIn(w http.ResponseWriter, r *http.Request) {
	var creds struct {
		Email    string `json:"email"`
		Password string `json:"password"`
	}
	if err := json.NewDecoder(r.Body).Decode(&creds); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	var user User
	err := userCollection.FindOne(context.Background(), bson.M{"email": creds.Email}).Decode(&user)
	if err != nil || bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(creds.Password)) != nil {
		http.Error(w, "Invalid credentials", http.StatusUnauthorized)
		return
	}

	// Generate JWT
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"id":       user.ID.Hex(),
		"username": user.Username,
		"isAdmin":  user.IsAdmin,
		"exp":      time.Now().Add(time.Hour * 24).Unix(),
	})

	tokenString, _ := token.SignedString(jwtKey)

	json.NewEncoder(w).Encode(map[string]interface{}{
		"token": tokenString,
		"user": map[string]interface{}{
			"username": user.Username,
			"isAdmin":  user.IsAdmin,
		},
	})
}

// createEvent handles CREATE logic
func createEvent(w http.ResponseWriter, r *http.Request) {
	var event Event
	if err := json.NewDecoder(r.Body).Decode(&event); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	event.ID = primitive.NewObjectID()
	event.CurrentRSVPs = 0
	
	_, err := collection.InsertOne(context.Background(), event)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	notificationChan <- Notification{
		Type:    "EVENT_CREATED",
		Message: fmt.Sprintf("New Event: %s created with capacity %d", event.Title, event.MaxCapacity),
		Time:    time.Now(),
	}

	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(event)
}

// notificationWorker processes async notifications
func notificationWorker() {
	for n := range notificationChan {
		fmt.Printf("[NOTIFICATION %s] %s at %s\n", n.Type, n.Message, n.Time.Format(time.Kitchen))
		// Here you would integrate with an Email API like SendGrid or Mailgun
	}
}

// handleRSVP with Capacity Check and Mutex Protection
func handleRSVP(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, _ := primitive.ObjectIDFromHex(idStr)

	mu.Lock()
	defer mu.Unlock()

	var event Event
	collection.FindOne(context.Background(), bson.M{"_id": id}).Decode(&event)

	// Capacity Constraint Check
	if event.CurrentRSVPs >= event.MaxCapacity {
		http.Error(w, "Event is at full capacity", http.StatusConflict)
		return
	}

	update := bson.M{"$inc": bson.M{"current_rsvps": 1}}
	collection.UpdateOne(context.Background(), bson.M{"_id": id}, update)

	notificationChan <- Notification{
		Type:    "RSVP_RECEIVED",
		Message: fmt.Sprintf("RSVP confirmed for %s. (%d/%d)", event.Title, event.CurrentRSVPs+1, event.MaxCapacity),
		Time:    time.Now(),
	}

	w.WriteHeader(http.StatusAccepted)
}

// handleCancel decrements the RSVP count
func handleCancel(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, _ := primitive.ObjectIDFromHex(idStr)

	mu.Lock()
	defer mu.Unlock()

	update := bson.M{"$inc": bson.M{"current_rsvps": -1}}
	collection.UpdateOne(context.Background(), bson.M{"_id": id}, update)

	w.WriteHeader(http.StatusOK)
}

// listEvents handles READ and SEARCH logic
func listEvents(w http.ResponseWriter, r *http.Request) {
	search := r.URL.Query().Get("search")
	filter := bson.M{}
	
	if search != "" {
		// Go Specialist Touch: Regex Search across multiple fields
		filter = bson.M{
			"$or": []bson.M{
				{"title": bson.M{"$regex": search, "$options": "i"}},
				{"description": bson.M{"$regex": search, "$options": "i"}},
				{"location": bson.M{"$regex": search, "$options": "i"}},
			},
		}
	}

	cursor, err := collection.Find(context.Background(), filter)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	
	var events []Event
	if err = cursor.All(context.Background(), &events); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(events)
}

// updateEvent handles UPDATE logic
func updateEvent(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, _ := primitive.ObjectIDFromHex(idStr)
	
	var updateData bson.M
	if err := json.NewDecoder(r.Body).Decode(&updateData); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	
	// Remove ID from update data if present
	delete(updateData, "id")
	delete(updateData, "_id")
	
	_, err := collection.UpdateOne(context.Background(), bson.M{"_id": id}, bson.M{"$set": updateData})
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	
	w.WriteHeader(http.StatusOK)
}

// deleteEvent handles DELETE logic
func deleteEvent(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	id, err := primitive.ObjectIDFromHex(idStr)
	if err != nil {
		http.Error(w, "Invalid ID format", http.StatusBadRequest)
		return
	}
	
	result, err := collection.DeleteOne(context.Background(), bson.M{"_id": id})
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	if result.DeletedCount == 0 {
		http.Error(w, "Event not found", http.StatusNotFound)
		return
	}
	
	w.WriteHeader(http.StatusNoContent)
}
