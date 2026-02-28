import Foundation
import SwiftUI

struct AddHabitView: View {
    @Environment(AppStore.self) var store
    @State private var name = ""
    @State private var description = ""
    @State private var showingAlert = false
    @State private var alertMessage = ""

    var body: some View {
        NavigationStack {
            Form {
                Section(header: Text("Habit Details")) {
                    TextField("Name", text: $name)
                    TextField("Description", text: $description)
                }
            }
            .navigationTitle("Add Habit")
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Save") {
                        saveHabit()
                    }
                    .disabled(name.isEmpty)
                }
            }
            .alert("Error", isPresented: $showingAlert) {
                Button("OK", role: .cancel) { }
            } message: {
                Text(alertMessage)
            }
        }
    }

    private func saveHabit() {
        let newHabit = Habit(
            id: UUID(),
            name: name,
            description: description,
            completionCount: 0,
            lastCompleted: nil
        )

        do {
            try store.addHabit(newHabit)
        } catch {
            alertMessage = error.localizedDescription
            showingAlert = true
        }
    }
}

#Preview {
    AddHabitView()
        .environment(AppStore())
}