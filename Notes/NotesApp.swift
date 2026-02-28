import SwiftUI

@main
struct NotesApp: App {
    var body: some Scene {
        WindowGroup {
            NavigationStack {
                NotesListView()
            }
        }
    }
}

#Preview {
    NotesListView()
}