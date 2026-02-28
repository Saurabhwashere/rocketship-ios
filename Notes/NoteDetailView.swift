```swift
import SwiftUI

struct NoteDetailView: View {
    @Environment(AppStore.self) var store
    @Bindable var note: Note

    @State private var isEditing = false
    @State private var editedTitle = ""
    @State private var editedContent = ""

    var body: some View {
        Form {
            Section {
                if isEditing {
                    TextField("Title", text: $editedTitle)
                    TextEditor(text: $editedContent)
                        .frame(minHeight: 200)
                } else {
                    Text(note.title)
                        .font(.title)
                    Text(note.content)
                        .font(.body)
                }
            }

            Section {
                HStack {
                    Text("Created:")
                    Spacer()
                    Text(note.createdAt.formatted(date: .abbreviated, time: .shortened))
                }

                HStack {
                    Text("Updated:")
                    Spacer()
                    Text(note.updatedAt.formatted(date: .abbreviated, time: .shortened))
                }
            }
        }
        .navigationTitle(isEditing ? "Edit Note" : note.title)
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Button {
                    if isEditing {
                        saveChanges()
                    } else {
                        startEditing()
                    }
                } label: {
                    Image(systemName: isEditing ? "checkmark" : "pencil")
                }
            }

            ToolbarItem(placement: .topBarTrailing) {
                if isEditing {
                    Button("Cancel", role: .cancel) {
                        cancelEditing()
                    }
                }
            }
        }
        .task {
            editedTitle = note.title
            editedContent = note.content
        }
    }

    private func startEditing() {
        isEditing = true
    }

    private func cancelEditing() {
        isEditing = false
        editedTitle = note.title
        editedContent = note.content
    }

    private func saveChanges() {
        guard !editedTitle.isEmpty else { return }

        note.title = editedTitle
        note.content = editedContent
        note.updatedAt = Date()

        store.updateNote(note)
        isEditing = false
    }
}

#Preview {
    NavigationStack {
        NoteDetailView(note: Note(
            id: UUID(),
            title: "Sample Note",
            content: "This is a sample note content.",
            createdAt: Date(),
            updatedAt: Date()
        ))
    }
    .environment(AppStore())
}
```