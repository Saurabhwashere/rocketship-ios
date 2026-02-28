```swift
import SwiftUI

struct HabitListView: View {
    @Environment(AppStore.self) var store

    var body: some View {
        NavigationStack {
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
                    NavigationLink(value: "AddHabit") {
                        Image(systemName: "plus")
                    }
                }
            }
            .navigationDestination(for: Habit.self) { habit in
                HabitDetailView(habit: habit)
            }
            .navigationDestination(for: String.self) { destination in
                if destination == "AddHabit" {
                    AddHabitView()
                }
            }
            .task {
                await store.loadHabits()
            }
        }
    }

    private func deleteHabits(at offsets: IndexSet) {
        store.deleteHabits(at: offsets)
    }
}

struct HabitRow: View {
    let habit: Habit

    var body: some View {
        HStack {
            VStack(alignment: .leading) {
                Text(habit.title)
                    .font(.headline)
                Text(habit.description)
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }

            Spacer()

            VStack(alignment: .trailing) {
                Text("Streak: \(habit.streak)")
                    .font(.subheadline)
                Text("Last: \(habit.lastCompletedDate?.formatted(date: .abbreviated, time: .omitted) ?? "Never")")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
        }
    }
}

#Preview {
    HabitListView()
        .environment(AppStore())
}
```