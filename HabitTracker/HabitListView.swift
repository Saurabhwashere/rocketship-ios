import Foundation
import SwiftUI

@Observable
final class AppStore {
    var habits: [Habit] = []
}

struct Habit: Identifiable, Codable, Hashable {
    let id: UUID
    var name: String
    var description: String
    var completionCount: Int
    var lastCompleted: Date?

    init(id: UUID = UUID(), name: String, description: String, completionCount: Int = 0, lastCompleted: Date? = nil) {
        self.id = id
        self.name = name
        self.description = description
        self.completionCount = completionCount
        self.lastCompleted = lastCompleted
    }
}

struct HabitListView: View {
    @Environment(AppStore.self) var store
    @State private var path = NavigationPath()

    var body: some View {
        NavigationStack(path: $path) {
            List {
                ForEach(store.habits) { habit in
                    NavigationLink(value: habit) {
                        HabitRow(habit: habit)
                    }
                }
                .onDelete(perform: deleteHabits)
            }
            .navigationTitle("Habits")
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button {
                        path.append("addHabit")
                    } label: {
                        Image(systemName: "plus")
                    }
                }
            }
            .navigationDestination(for: Habit.self) { habit in
                HabitDetailView(habit: habit)
            }
            .navigationDestination(for: String.self) { destination in
                if destination == "addHabit" {
                    AddHabitView()
                } else if destination == "statistics" {
                    StatisticsView()
                }
            }
            .task {
                await loadHabits()
            }
        }
    }

    private func deleteHabits(at offsets: IndexSet) {
        store.habits.remove(atOffsets: offsets)
    }

    private func loadHabits() async {
        // Simulate loading data
        try? await Task.sleep(nanoseconds: 1_000_000_000)
        store.habits = [
            Habit(name: "Drink Water", description: "Stay hydrated throughout the day", completionCount: 5),
            Habit(name: "Exercise", description: "30 minutes of physical activity", completionCount: 3),
            Habit(name: "Read", description: "Read for 20 minutes", completionCount: 7)
        ]
    }
}

struct HabitRow: View {
    let habit: Habit

    var body: some View {
        HStack {
            VStack(alignment: .leading) {
                Text(habit.name)
                    .font(.headline)
                Text(habit.description)
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }

            Spacer()

            VStack(alignment: .trailing) {
                Text("\(habit.completionCount)")
                    .font(.headline)
                if let lastCompleted = habit.lastCompleted {
                    Text(lastCompleted, style: .date)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }
        }
    }
}

struct HabitDetailView: View {
    let habit: Habit

    var body: some View {
        Text("Habit Detail: \(habit.name)")
    }
}

struct AddHabitView: View {
    var body: some View {
        Text("Add Habit View")
    }
}

struct StatisticsView: View {
    var body: some View {
        Text("Statistics View")
    }
}

#Preview {
    HabitListView()
        .environment(AppStore())
}