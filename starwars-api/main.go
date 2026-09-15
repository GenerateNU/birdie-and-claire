package main

import (
	"log"
	"net/http"

	"github.com/bootcamp/starwars-api/db"
	"github.com/bootcamp/starwars-api/handlers"
)

func main() {
	if err := db.Init(); err != nil {
		log.Fatalf("failed to initialize database: %v", err)
	}

	// TODO: Register your endpoint here.
	//       Think about: what HTTP method should this be? What URL path makes sense?
	//       Hint: http.HandleFunc("/your/path", handlers.GetCharacters)
	//
	// Replace the placeholder below with your chosen path:
	http.HandleFunc("/api/characters", handlers.GetCharacters)

	log.Println("Server starting on :8080...")
	log.Fatal(http.ListenAndServe(":8080", nil))
}
