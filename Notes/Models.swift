```swift
import Foundation

struct Note: Identifiable, Codable {
    let id: UUID
    var title: String
    var content: String
    let createdAt: Date
    var updatedAt: Date

    static var sampleData: [Note] = [
        Note(
            id: UUID(),
            title: "Meeting Notes",
            content: "Discussed project timeline and deliverables. Next meeting scheduled for next week.",
            createdAt: Date().addingTimeInterval(-86400 * 7),
            updatedAt: Date().addingTimeInterval(-86400 * 3)
        ),
        Note(
            id: UUID(),
            title: "Grocery List",
            content: "Milk, eggs, bread, fruits, vegetables",
            createdAt: Date().addingTimeInterval(-86400 * 5),
            updatedAt: Date().addingTimeInterval(-86400 * 1)
        ),
        Note(
            id: UUID(),
            title: "Idea for App",
            content: "Create a note-taking app with categories and reminders",
            createdAt: Date().addingTimeInterval(-86400 * 2),
            updatedAt: Date().addingTimeInterval(-86400 * 2)
        ),
        Note(
            id: UUID(),
            title: "Workout Plan",
            content: "Monday: Chest\nTuesday: Back\nWednesday: Legs\nThursday: Shoulders\nFriday: Arms",
            createdAt: Date().addingTimeInterval(-86400 * 10),
            updatedAt: Date().addingTimeInterval(-86400 * 4)
        ),
        Note(
            id: UUID(),
            title: "Book Recommendations",
            content: "1. The Alchemist\n2. Atomic Habits\n3. Deep Work\n4. The Power of Now",
            createdAt: Date().addingTimeInterval(-86400 * 15),
            updatedAt: Date().addingTimeInterval(-86400 * 12)
        )
    ]
}

@Observable
class AppStore {
    var notes: [Note]

    init() {
        notes = Note.sampleData
    }

    func addNote(title: String, content: String) {
        let newNote = Note(
            id: UUID(),
            title: title,
            content: content,
            createdAt: Date(),
            updatedAt: Date()
        )
        notes.append(newNote)
    }

    func deleteNote(_ note: Note) {
        notes.removeAll { $0.id == note.id }
    }

    func updateNote(_ note: Note, title: String, content: String) {
        if let index = notes.firstIndex(where: { $0.id == note.id }) {
            notes[index].title = title
            notes[index].content = content
            notes[index].updatedAt = Date()
        }
    }
}

#Preview {
    Text("Models Preview")
        .environment(AppStore())
}
```