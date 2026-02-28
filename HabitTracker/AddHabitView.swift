```swift
import SwiftUI

struct AddHabitView: View {
    @Environment(AppStore.self) var store
    @State private var title = ""
    @State private var description = ""
    @State private var startDate = Date()
    @State private var showAlert = false
    @State private var alertMessage = ""

    var body: some View {
        Form {
            Section(header: Text("Habit Details")) {
                TextField("Title", text: $title)
                TextField("Description", text: $description)
                DatePicker("Start Date", selection: $startDate, displayedComponents: .date)
            }
        }
        .navigationTitle("Add Habit")
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Button("Save") {
                    saveHabit()
                }
                .disabled(title.isEmpty)
            }
        }
        .alert("Error", isPresented: $showAlert) {
            Button("OK", role: .cancel) { }
        } message: {
            Text(alertMessage)
        }
    }

    private func saveHabit() {
        let newHabit = Habit(
            id: UUID(),
            title: title,
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
    NavigationStack {
        AddHabitView()
            .environment(AppStore())
    }
}
```