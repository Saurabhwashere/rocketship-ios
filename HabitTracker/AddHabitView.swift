import Foundation
import SwiftUI

struct AddHabitView: View {
    @Environment(AppStore.self) var store
    @State private var name = ""
    @State private var description = ""
    @State private var startDate = Date()
    @State private var showAlert = false
    @State private var alertMessage = ""

    var body: some View {
        NavigationStack {
            Form {
                Section(header: Text("Habit Details")) {
                    TextField("Name", text: $name)
                    TextField("Description", text: $description, axis: .vertical)
                    DatePicker("Start Date", selection: $startDate, displayedComponents: .date)
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
            .alert("Error", isPresented: $showAlert) {
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
            startDate: startDate,
            streak: 0,
            completedDates: []
        )

        do {
            try store.addHabit(newHabit)
        } catch {
            alertMessage = error.localizedDescription
            showAlert = true
        }
    }
}

#Preview {
    AddHabitView()
        .environment(AppStore())
}