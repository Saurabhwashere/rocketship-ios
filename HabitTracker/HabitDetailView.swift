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

                VStack(alignment: .leading, spacing: 8) {
                    HStack {
                        Image(systemName: "calendar")
                        Text("Started on: \(habit.startDate.formatted(date: .abbreviated, time: .omitted))")
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

                if !habit.completedDates.isEmpty {
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Completion History")
                            .font(.headline)

                        ForEach(habit.completedDates.sorted(by: >), id: \.self) { date in
                            HStack {
                                Image(systemName: "checkmark.circle.fill")
                                    .foregroundColor(.green)
                                Text(date.formatted(date: .abbreviated, time: .omitted))
                            }
                        }
                    }
                }
            }
            .padding()
        }
        .navigationTitle("Habit Details")
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
            name: "Morning Run",
            description: "Run 5 kilometers every morning",
            startDate: Date(),
            streak: 7,
            completedDates: [Date(), Date().addingTimeInterval(-86400), Date().addingTimeInterval(-172800)]
        ))
    }
    .environment(AppStore())
}