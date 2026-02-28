```swift
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
                    Label("Current Streak", systemImage: "flame.fill")
                    Spacer()
                    Text("\(habit.streak) days")
                        .foregroundStyle(.secondary)
                }

                HStack {
                    Label("Total Completions", systemImage: "checkmark.circle.fill")
                    Spacer()
                    Text("\(habit.completedDates.count)")
                        .foregroundStyle(.secondary)
                }
            } header: {
                Text("Statistics")
            }

            Section {
                ForEach(habit.completedDates.sorted(by: >), id: \.self) { date in
                    HStack {
                        Image(systemName: "checkmark.circle.fill")
                            .foregroundStyle(.green)
                        Text(date.formatted(date: .abbreviated, time: .omitted))
                    }
                }
            } header: {
                Text("Completion History")
            }
        }
        .navigationTitle(habit.title)
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Button {
                    store.markHabitAsCompleted(habit)
                } label: {
                    Label("Mark as Completed", systemImage: "checkmark.circle")
                }
            }
        }
        .task {
            await store.loadHabitDetails(habit.id)
        }
    }
}

#Preview {
    NavigationStack {
        HabitDetailView(habit: Habit(
            id: UUID(),
            title: "Exercise",
            description: "Daily 30-minute workout",
            startDate: Date(),
            streak: 7,
            completedDates: [Date(), Date().addingTimeInterval(-86400), Date().addingTimeInterval(-172800)]
        ))
    }
    .environment(AppStore())
}
```