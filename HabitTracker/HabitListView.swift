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
                .onDelete { indices in
                    store.deleteHabits(at: indices)
                }
            }
            .navigationTitle("Habits")
            .navigationDestination(for: Habit.self) { habit in
                HabitDetailView(habit: habit)
            }
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    NavigationLink(value: AddHabitView.self) {
                        Image(systemName: "plus")
                    }
                }
            }
            .navigationDestination(for: AddHabitView.self) { _ in
                AddHabitView()
            }
            .task {
                await store.loadHabits()
            }
        }
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