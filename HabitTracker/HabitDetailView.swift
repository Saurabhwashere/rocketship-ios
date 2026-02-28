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
                        Image(systemName: "calendar")
                        Text("Started on \(habit.startDate.formatted(date: .abbreviated, time: .omitted))")
                    }

                    HStack {
                        Image(systemName: "flame")
                        Text("Current streak: \(habit.streak) days")
                    }

                    HStack {
                        Image(systemName: "checkmark.circle")
                        Text("Completed \(habit.completedDates.count) times")
                    }
                }
                .font(.subheadline)
                .foregroundStyle(.secondary)

                Divider()

                VStack(alignment: .leading, spacing: 10) {
                    Text("Progress")
                        .font(.headline)

                    ProgressView(value: Double(habit.streak), total: 30)
                        .tint(.green)

                    Text("\(habit.streak)/30 days")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }

                Divider()

                VStack(alignment: .leading, spacing: 10) {
                    Text("Completed Dates")
                        .font(.headline)

                    if habit.completedDates.isEmpty {
                        Text("No completions yet")
                            .foregroundStyle(.secondary)
                    } else {
                        ForEach(habit.completedDates.sorted(by: >), id: \.self) { date in
                            Text(date.formatted(date: .abbreviated, time: .omitted))
                                .font(.subheadline)
                        }
                    }
                }
            }
            .padding()
        }
        .navigationTitle("Habit Details")
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Button {
                    store.markHabitAsCompleted(habit.id)
                } label: {
                    Label("Mark Complete", systemImage: "checkmark.circle")
                }
            }
        }
        .task {
            await store.loadHabits()
        }
    }
}

#Preview {
    NavigationStack {
        HabitDetailView(habit: Habit(
            id: UUID(),
            name: "Exercise",
            description: "Daily workout routine",
            startDate: Date(),
            streak: 5,
            completedDates: [Date(), Date().addingTimeInterval(-86400), Date().addingTimeInterval(-172800)]
        ))
    }
    .environment(AppStore())
}