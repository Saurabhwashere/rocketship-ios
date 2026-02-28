import SwiftUI

@Observable
final class AppStore {
    var notes: [Note] = []
}

struct Note: Identifiable {
    let id: UUID
    let title: String
    let content: String
    let createdAt: Date
    let updatedAt: Date
}

struct NotesListView: View {
    @Environment(AppStore.self) var store
    @State private var isLoading = false
    @State private var errorMessage: String?

    var body: some View {
        NavigationStack {
            Group {
                if isLoading {
                    ProgressView()
                } else if let errorMessage {
                    ContentUnavailableView(
                        "Error",
                        systemImage: "exclamationmark.triangle",
                        description: Text(errorMessage)
                    )
                } else if store.notes.isEmpty {
                    ContentUnavailableView(
                        "No Notes",
                        systemImage: "doc.text.magnifyingglass",
                        description: Text("You don't have any notes yet.")
                    )
                } else {
                    List(store.notes) { note in
                        NavigationLink(value: note) {
                            VStack(alignment: .leading, spacing: 4) {
                                Text(note.title)
                                    .font(.headline)
                                Text(note.content)
                                    .font(.subheadline)
                                    .foregroundStyle(.secondary)
                                    .lineLimit(2)
                                Text(note.updatedAt, style: .date)
                                    .font(.caption)
                                    .foregroundStyle(.tertiary)
                            }
                        }
                    }
                    .listStyle(.plain)
                }
            }
            .navigationTitle("Notes")
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button(action: addNote) {
                        Image(systemName: "plus")
                    }
                }
            }
            .navigationDestination(for: Note.self) { note in
                NoteDetailView(note: note)
            }
            .task {
                await loadNotes()
            }
            .refreshable {
                await loadNotes()
            }
        }
    }

    private func loadNotes() async {
        isLoading = true
        errorMessage = nil

        do {
            // Simulate network request
            try await Task.sleep(nanoseconds: 1_000_000_000)
            store.notes = [
                Note(id: UUID(), title: "Meeting Notes", content: "Discussed project timeline and deliverables.", createdAt: Date(), updatedAt: Date()),
                Note(id: UUID(), title: "Grocery List", content: "Milk, eggs, bread, fruits, vegetables.", createdAt: Date(), updatedAt: Date()),
                Note(id: UUID(), title: "Idea for App", content: "Create a note-taking app with cloud sync.", createdAt: Date(), updatedAt: Date())
            ]
        } catch {
            errorMessage = "Failed to load notes. Please try again."
        }

        isLoading = false
    }

    private func addNote() {
        // Implementation for adding a new note
    }
}

#Preview {
    NotesListView()
        .environment(AppStore())
}