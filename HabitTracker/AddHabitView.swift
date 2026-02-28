import SwiftUI

struct AddHabitView: View {
    @Environment(AppStore.self) var store
    @State private var name = ""
    @State private var description = ""
    @State private var startDate = Date()
    @State private var showingAlert = false
    @State private var alertMessage = ""

    var body: some View {
        Form {
            Section(header: Text("Habit Details")) {
                TextField("Name", text: $name)
                TextField("Description", text: $description)
                DatePicker("Start Date", selection: $startDate, displayedComponents: .date)
            }
        }
        .navigationTitle("Add Habit")
        .toolbar {
            ToolbarItem(placement: .confirmationAction) {
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
            showingAlert = true
        }
    }
}

#Preview {
    NavigationStack {
        AddHabitView()
            .environment(AppStore())
    }
}