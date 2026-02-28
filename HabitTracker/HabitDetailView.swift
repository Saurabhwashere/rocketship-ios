import Foundation
import SwiftUI

struct HabitDetailView: View {
    @Environment(AppStore.self) var store
    let habit: Habit

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                Text(habit.name)
                    .font(.largeTitle)
                    .fontWeight(.bold)

                Text(habit.description)
                    .font(.body)
                    .foregroundStyle(.secondary)

                VStack(alignment: .leading, spacing: 10) {
                    HStack {
                        Image(systemName: "checkmark.circle.fill")
                            .foregroundStyle(.green)
                        Text("Completion Count: \(habit.completionCount)")
                    }

                    if let lastCompleted = habit.lastCompleted {
                        HStack {
                            Image(systemName: "calendar")
                            Text("Last Completed: \(lastCompleted.formatted(date: .abbreviated, time: .shortened))")
                        }
                    }
                }
                .padding()
                .background(Color(.systemGray6))
                .cornerRadius(10)

                Button(action: {
                    Task {
                        await store.completeHabit(habit)
                    }
                }) {
                    Label("Mark as Completed", systemImage: "checkmark.circle")
                        .frame(maxWidth: .infinity)
                }
                .buttonStyle(.borderedProminent)
                .controlSize(.large)
            }
            .padding()
        }
        .navigationTitle("Habit Details")
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Button(action: {
                    store.selectedHabit = habit
                }) {
                    Image(systemName: "pencil")
                }
            }
        }
        .navigationDestination(item: $store.selectedHabit) { habit in
            AddHabitView(habit: habit)
        }
    }
}

#Preview {
    NavigationStack {
        HabitDetailView(habit: Habit(id: UUID(), name: "Sample Habit", description: "This is a sample habit description.", completionCount: 5, lastCompleted: Date()))
            .environment(AppStore())
    }
}