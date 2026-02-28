import Foundation
import SwiftUI

struct HabitDetailView: View {
    @Environment(AppStore.self) var store
    let habit: Habit

    var body: some View {
        Form {
            Section {
                Text(habit.description)
                    .font(.body)
                    .foregroundStyle(.secondary)
            } header: {
                Text("Description")
            }

            Section {
                HStack {
                    Label("Start Date", systemImage: "calendar")
                    Spacer()
                    Text(habit.startDate.formatted(date: .abbreviated, time: .omitted))
                        .foregroundStyle(.secondary)
                }

                HStack {
                    Label("Current Streak", systemImage: "flame")
                    Spacer()
                    Text("\(habit.streak) days")
                        .foregroundStyle(.secondary)
                }

                HStack {
                    Label("Completed", systemImage: "checkmark.circle")
                    Spacer()
                    Text("\(habit.completedDates.count) times")
                        .foregroundStyle(.secondary)
                }
            } header: {
                Text("Statistics")
            }

            Section {
                Button {
                    store.markHabitAsCompleted(habit)
                } label: {
                    Label("Mark as Completed", systemImage: "checkmark")
                }
                .disabled(habit.completedDates.contains(Date.now))
            }
        }
        .navigationTitle(habit.title)
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                NavigationLink {
                    AddHabitView(habit: habit)
                } label: {
                    Image(systemName: "pencil")
                }
            }
        }
    }
}

#Preview {
    NavigationStack {
        HabitDetailView(habit: Habit(
            id: UUID(),
            title: "Drink Water",
            description: "Drink at least 8 glasses of water daily",
            startDate: Date.now,
            streak: 5,
            completedDates: [Date.now]
        ))
    }
    .environment(AppStore())
}